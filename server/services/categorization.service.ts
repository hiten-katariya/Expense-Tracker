import { runGeminiPrompt } from './gemini.service.js';

interface CategoryItem {
  id: string;
  name: string;
}

interface CategorizationResult {
  predicted_category_id: string | null;
  confidence: number;
  reasoning: string;
}

/**
 * Predicts the category of an expense based on inputs and available categories
 */
export async function predictExpenseCategory(
  merchant: string,
  title: string,
  notes: string | null,
  amount: number,
  categories: CategoryItem[]
): Promise<CategorizationResult> {
  if (categories.length === 0) {
    return { predicted_category_id: null, confidence: 0, reasoning: 'No categories available' };
  }

  // Construct a prompt giving Gemini the list of categories and transaction details
  const categoriesList = categories.map((c) => `- "${c.name}" (ID: ${c.id})`).join('\n');
  const prompt = `
You are an expert financial assistant. Your task is to categorize a transaction based on the transaction details and a list of available categories.

Transaction Details:
- Title: ${title || 'N/A'}
- Merchant: ${merchant || 'N/A'}
- Notes: ${notes || 'N/A'}
- Amount: ${amount}

Available Categories:
${categoriesList}

Rules:
1. Select the single most relevant category ID from the list.
2. Provide a confidence score between 0.0 and 1.0.
3. Provide a brief reasoning (1 sentence) for your choice.
4. Output your response EXACTLY as a valid JSON object with the following keys:
   - "predicted_category_id": string (the ID of the selected category) or null (if none match)
   - "confidence": number (float between 0.0 and 1.0)
   - "reasoning": string

Do not include any markdown format blocks (like \`\`\`json) or extra text. Output only the pure JSON string.
`;

  try {
    const rawResult = await runGeminiPrompt(prompt);
    
    // Sanitize output in case Gemini returns markdown blocks
    let cleanJson = rawResult.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    const selectedId = parsed.predicted_category_id;
    
    // Verify predicted ID is in the actual categories list
    const exists = categories.some((c) => c.id === selectedId);

    return {
      predicted_category_id: exists ? selectedId : null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning || 'Categorized by AI',
    };
  } catch (error) {
    console.error('Error in predictExpenseCategory:', error);
    // Safe fallback to rule/default behavior
    return {
      predicted_category_id: null,
      confidence: 0,
      reasoning: 'Error running AI categorization model',
    };
  }
}
