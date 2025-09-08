const ALLOWED_EXTENSIONS = ['.txt', '.log', '.md', '.csv', '.json', '.jsonl', '.html', '.eml', '.pdf'];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is 3MB.` };
  }
  
  // Check extension
  const extension = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { 
      valid: false, 
      error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
    };
  }
  
  return { valid: true };
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
}

export async function extractTextContent(file: File): Promise<string> {
  const extension = getFileExtension(file.name);
  
  if (extension === '.pdf') {
    // For PDF, we'll extract text using a simple approach
    // In a real implementation, you'd use pdf-parse or similar
    const arrayBuffer = await file.arrayBuffer();
    const text = await extractPdfText(arrayBuffer);
    return text;
  }
  
  // For all other supported formats, treat as text
  return await file.text();
}

async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  // Simple PDF text extraction - convert to string and look for text patterns
  const uint8Array = new Uint8Array(arrayBuffer);
  const text = new TextDecoder('latin1').decode(uint8Array);
  
  // Extract text between stream objects (very basic)
  const textMatches = text.match(/\((.*?)\)/g);
  if (textMatches) {
    return textMatches.map(match => match.slice(1, -1)).join(' ');
  }
  
  // Fallback: return raw text content
  return text;
}