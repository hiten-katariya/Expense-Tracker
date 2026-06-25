import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resendApiKey = process.env.RESEND_API_KEY || '';
if (!resendApiKey) {
  console.warn('⚠️ Warning: RESEND_API_KEY is not defined in environment variables.');
}

export const resend = new Resend(resendApiKey);
