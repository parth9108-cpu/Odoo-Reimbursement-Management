export function parseTranscript(transcript) {
  // Normalize transcript
  transcript = transcript.toLowerCase();
  
  // Amount with optional rupee symbol
  const amtMatch = transcript.match(/(?:add|create)\s*(?:₹|\u20B9|\s)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  
  // Date parsing
  const dateMatch = transcript.match(/\b(today|yesterday|\d{1,2}(?:st|nd|rd|th)?\s+\w+|\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
  
  // Category is words between amount and word 'expense' or after amount
  const catMatch = transcript.match(/(?:add\s.*\s)(?:\d+(?:\.\d+)?\s)?(.+?)\sexpense/);
  
  return {
    amount: amtMatch ? amtMatch[1] : null,
    category: catMatch ? catMatch[1].trim() : null,
    date: dateMatch ? parseDate(dateMatch[0]) : new Date()
  };
}

function parseDate(dateStr) {
  const now = new Date();
  
  if (dateStr === 'today') {
    return now;
  } else if (dateStr === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  } else if (dateStr.includes('/')) {
    // Handle MM/DD/YYYY or DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parts[2], parts[0] - 1, parts[1]);
    }
  }
  
  return now; // Fallback to today
}

export function speak(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }
}

