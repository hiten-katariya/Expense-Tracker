import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const ENCRYPTION_KEY = process.env.JWT_SECRET || process.env.RESEND_API_KEY || 'default-secret-key-32-chars-long!!!';
// Ensure key is exactly 32 bytes for AES-256
const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

/**
 * Validates syntax of an email address.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generates an encrypted unsubscribe token for a specific user and preference category.
 */
export function generateUnsubscribeToken(userId: string, category: string): string {
  const data = JSON.stringify({ userId, category, timestamp: Date.now() });
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV and encrypted text joined by a colon
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts and validates an unsubscribe token.
 * Returns the userId and category if valid, or null if expired/invalid.
 */
export function decryptUnsubscribeToken(token: string): { userId: string; category: string } | null {
  try {
    const [ivHex, encryptedHex] = token.split(':');
    if (!ivHex || !encryptedHex) return null;
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const parsed = JSON.parse(decrypted);
    
    // Unsubscribe tokens are valid indefinitely, but let's check for structural integrity
    if (parsed.userId && parsed.category) {
      return { userId: parsed.userId, category: parsed.category };
    }
    return null;
  } catch (error) {
    console.error('Failed to decrypt unsubscribe token:', error);
    return null;
  }
}

/**
 * Check if the email send request exceeds rate limits.
 * We can run a query against the email_logs table to count emails sent to this recipient recently.
 * @param supabaseClient The request-scoped supabase client
 * @param recipient The target email address
 * @returns boolean true if rate limited, false otherwise
 */
export async function isRateLimited(supabaseClient: any, recipient: string): Promise<boolean> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Count emails sent to this recipient in the last 5 minutes
    const { count, error } = await supabaseClient
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('recipient', recipient)
      .gte('created_at', fiveMinutesAgo)
      .in('status', ['sent', 'queued']);
      
    if (error) {
      console.error('Error checking rate limit in email_logs:', error);
      return false; // Fallback to allow sending
    }
    
    // Limit to max 5 emails per 5 minutes to prevent spam/abuse
    return (count || 0) >= 5;
  } catch (error) {
    console.error('Failed to evaluate rate limit check:', error);
    return false;
  }
}
