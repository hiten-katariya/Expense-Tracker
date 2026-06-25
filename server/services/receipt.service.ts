import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { extractTextFromImage, parseOCRTextWithGemini } from './ocr.service.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Computes MD5 or SHA256 hash of image file contents
 */
export function computeImageHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

interface ScanReceiptResult {
  ocrText: string;
  parsedData: any;
  cached: boolean;
  hash: string;
}

/**
 * Scans a receipt image: checks cache, performs OCR + Gemini parsing if missing, and saves to cache
 */
export async function processAndCacheReceipt(
  supabaseClient: any,
  userId: string,
  imageBuffer: Buffer,
  categories: { id: string; name: string }[]
): Promise<ScanReceiptResult> {
  const hash = computeImageHash(imageBuffer);
  const startTime = Date.now();

  try {
    // 1. Check if hash already exists in receipt_ocr_cache for this user
    const { data: cachedRow, error: fetchError } = await supabaseClient
      .from('receipt_ocr_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('receipt_hash', hash)
      .maybeSingle();

    if (cachedRow) {
      console.log('✅ Receipt OCR cache hit for hash:', hash);
      return {
        ocrText: cachedRow.ocr_text,
        parsedData: cachedRow.parsed_data,
        cached: true,
        hash,
      };
    }

    if (fetchError) {
      console.error('Error fetching from OCR cache:', fetchError);
    }

    // 2. Cache miss: Extract text and parse with Gemini
    console.log('ℹ️ Receipt cache miss. Performing OCR & Gemini parsing...');
    const ocrText = await extractTextFromImage(imageBuffer);
    const parsedData = await parseOCRTextWithGemini(ocrText, categories);
    const processingTime = (Date.now() - startTime) / 1000; // in seconds

    // 3. Save to receipt_ocr_cache
    const { error: insertError } = await supabaseClient
      .from('receipt_ocr_cache')
      .insert({
        user_id: userId,
        receipt_hash: hash,
        ocr_text: ocrText,
        parsed_data: parsedData,
        processing_time: processingTime,
        engine_version: 'tesseract.js@7.0.0',
        gemini_model: 'gemini-2.5-flash',
        ocr_language: 'eng'
      });

    if (insertError) {
      console.error('Failed to save receipt OCR to cache:', insertError);
    }

    return {
      ocrText,
      parsedData,
      cached: false,
      hash,
    };
  } catch (error) {
    console.error('Error in processAndCacheReceipt:', error);
    throw error;
  }
}
