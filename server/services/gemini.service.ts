import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('⚠️ Warning: GEMINI_API_KEY is not defined in environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

// Primary client model configuration
export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
});

// Embedding model configuration
export const geminiEmbeddingModel = genAI.getGenerativeModel({
  model: 'text-embedding-004',
});

/**
 * Executes a Gemini prompt with built-in retry and timeout management.
 * @param prompt Content prompt to send to Gemini
 * @param maxRetries Maximum retry attempts
 * @param timeoutMs Timeout in milliseconds
 * @returns Resulting response text
 */
export async function runGeminiPrompt(
  prompt: string,
  maxRetries: number = 3,
  timeoutMs: number = 30000
): Promise<string> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      attempt++;
      
      // Implement manual timeout via Promise.race
      const apiCall = geminiModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out')), timeoutMs)
      );

      const response = await Promise.race([apiCall, timeoutPromise]);
      const resultText = response.response.text();
      if (!resultText) {
        throw new Error('Gemini returned an empty response');
      }
      return resultText;
    } catch (error: any) {
      console.error(`🔴 Gemini prompt attempt ${attempt} failed:`, error.message || error);
      if (attempt >= maxRetries) {
        throw new Error(`Gemini API failed after ${maxRetries} attempts: ${error.message || error}`);
      }
      // Exponential backoff delay
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error('Failed to run prompt');
}
