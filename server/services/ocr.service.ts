import Tesseract from 'tesseract.js';
import { runGeminiPrompt } from './gemini.service.js';

interface ParsedReceipt {
  merchant: string | null;
  amount: number | null;
  date: string | null; // YYYY-MM-DD
  currency: string | null;
  paymentMethod: string | null;
  categoryName: string | null;
  notes: string | null;
}

/**
 * Extracts raw text from a receipt image using Tesseract.js
 */
export async function extractTextFromImage(imageInput: string | Buffer): Promise<string> {
  try {
    const result = await Tesseract.recognize(imageInput, 'eng');
    return result.data.text || '';
  } catch (error) {
    console.error('Error during Tesseract OCR:', error);
    throw new Error('Receipt text extraction failed');
  }
}

/**
 * Cleans up raw OCR text and structures it into expected fields using Gemini AI
 */
export async function parseOCRTextWithGemini(
  ocrText: string,
  categories: { id: string; name: string }[]
): Promise<ParsedReceipt> {
  const categoriesList = categories.map((c) => c.name).join(', ');
  
  const prompt = `
You are a receipt scanning assistant. Analyze the raw text extracted from a receipt image and extract standard expense details.

Raw OCR Text:
"""
${ocrText}
"""

Available Categories in current workspace:
[${categoriesList}]

Rules:
1. Extract the merchant/store name. Normalize it (e.g. "WAL-MART #4120" -> "Walmart").
2. Extract the total purchase amount as a number.
3. Extract the transaction date. Return it in "YYYY-MM-DD" format.
4. Extract the currency code (e.g., INR, USD, EUR, etc.). If unsure, assume "INR".
5. Detect the payment method (must map to one of: "cash", "card", "upi", "netbanking", "other").
6. Match the receipt items to the closest category from the available list.
7. Generate brief notes summarizing items purchased.
8. Output your response EXACTLY as a valid JSON object with the following keys:
   - "merchant": string or null
   - "amount": number or null
   - "date": string (YYYY-MM-DD) or null
   - "currency": string or null
   - "paymentMethod": string or null
   - "categoryName": string (one of the available categories) or null
   - "notes": string or null

Do not include any markdown format blocks or extra text. Output only the pure JSON string.
`;

  try {
    const rawResult = await runGeminiPrompt(prompt);
    
    // Sanitize JSON response
    let cleanJson = rawResult.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    return {
      merchant: parsed.merchant || null,
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      date: parsed.date || null,
      currency: parsed.currency || 'INR',
      paymentMethod: ['cash', 'card', 'upi', 'netbanking', 'other'].includes(parsed.paymentMethod)
        ? parsed.paymentMethod
        : 'other',
      categoryName: parsed.categoryName || null,
      notes: parsed.notes || null,
    };
  } catch (error) {
    console.error('Error in parseOCRTextWithGemini:', error);
    return {
      merchant: null,
      amount: null,
      date: null,
      currency: 'INR',
      paymentMethod: 'other',
      categoryName: null,
      notes: 'Failed to parse receipt text automatically',
    };
  }
}
