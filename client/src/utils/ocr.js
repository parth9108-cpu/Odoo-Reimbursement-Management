import Tesseract from 'tesseract.js';

export async function runOCR(imageBlob) {
  try {
    const { data } = await Tesseract.recognize(imageBlob, 'eng', {
      logger: m => console.log(m)
    });
    return data;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
}

export function extractFields(text, words) {
  // Amount regex - handles various formats
  const amountRegex = /(\₹|\$|USD|INR)?\s?([0-9]{1,3}(?:[.,][0-9]{2,3})*(?:\.[0-9]{1,2})?)/g;
  const dateRegex = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/;
  
  let amount = null;
  let date = null;
  
  // Extract amount
  const amtMatch = text.match(amountRegex);
  if (amtMatch) {
    amount = amtMatch[0].replace(/[₹$USDINR]/g, '').trim();
  }
  
  // Extract date
  const dtMatch = text.match(dateRegex);
  if (dtMatch) {
    date = dtMatch[0];
  }
  
  // Extract merchant (heuristic: first non-empty line)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const merchant = lines[0] || 'Unknown';
  
  // Calculate confidences (simplified - in real implementation, map word positions)
  const confidences = {
    amount: amount ? 92 : 0,
    date: date ? 88 : 0,
    merchant: merchant !== 'Unknown' ? 70 : 0
  };
  
  return { amount, date, merchant, confidences };
}

export function categorizeExpense(merchant, description) {
  const categoryRules = {
    food: [/restaurant|cafe|lunch|dinner|dine|food|eat/i],
    travel: [/taxi|uber|ola|cab|flight|airlines|bus|train|travel/i],
    lodging: [/hotel|inn|resort|hostel|lodging/i],
    office: [/stationery|office|amazon|flipkart|supplies/i],
    transport: [/fuel|gas|petrol|diesel|transport/i]
  };
  
  const text = `${merchant} ${description}`.toLowerCase();
  
  for (const [category, patterns] of Object.entries(categoryRules)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return { category, confidence: 85 };
      }
    }
  }
  
  return { category: 'Others', confidence: 50 };
}

