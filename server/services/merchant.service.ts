import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { runGeminiPrompt } from './gemini.service.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Normalizes a raw merchant name into a clean, canonical name, utilizing DB caches and AI fallback.
 */
export async function normalizeMerchantName(
  supabaseClient: any,
  userId: string,
  rawName: string
): Promise<string> {
  if (!rawName || rawName.trim() === '') return 'Unknown Merchant';
  
  const trimmedRaw = rawName.trim();

  try {
    // 1. Check if the user already has a mapped alias for this raw name in DB
    const { data: aliasRow } = await supabaseClient
      .from('merchant_aliases')
      .select('*')
      .eq('user_id', userId)
      .eq('raw_name', trimmedRaw)
      .maybeSingle();

    if (aliasRow) {
      console.log(`✅ Merchant alias cache hit: "${trimmedRaw}" -> "${aliasRow.canonical_name}"`);
      return aliasRow.canonical_name;
    }

    // 2. Cache miss: Ask Gemini to clean/canonicalize the merchant name
    const prompt = `
You are a canonical merchant cleanup script. Your task is to take a raw string from a bank statement, SMS message, or receipt image, and clean it up into a standard, readable business brand name.

Examples:
- "AMZN MKTP US*1J2" -> "Amazon"
- "UBER * TRIP CO" -> "Uber"
- "NETFLIX.COM CARD RECUR" -> "Netflix"
- "STARBUCKS STORE #1240" -> "Starbucks"
- "WAL-MART SUPER CTR" -> "Walmart"

Raw Merchant String: "${trimmedRaw}"

Rules:
1. Output ONLY the cleaned canonical brand name.
2. Remove any store numbers, transaction IDs, locations, or payment network tags.
3. Keep it brief (typically 1-3 words).
4. If it's a personal transfer or name (e.g. "JOHN DOE UPI"), write the name cleanly (e.g., "John Doe").
5. Do not write any markdown, extra comments, or formatting blocks. Return only the plain text name.
`;

    const cleanResult = await runGeminiPrompt(prompt);
    const canonicalName = cleanResult.trim();

    if (canonicalName && canonicalName !== trimmedRaw) {
      // 3. Save mapping to DB to remember it for future transactions
      const { error: insertError } = await supabaseClient
        .from('merchant_aliases')
        .insert({
          user_id: userId,
          raw_name: trimmedRaw,
          canonical_name: canonicalName,
        });

      if (insertError) {
        console.error('Failed to insert merchant alias mapping:', insertError);
      }
    }

    return canonicalName || trimmedRaw;
  } catch (error) {
    console.error('Error in normalizeMerchantName:', error);
    return trimmedRaw; // safe fallback
  }
}
