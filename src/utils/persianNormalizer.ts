/**
 * HOOSHYAR ENERGY — PERSIAN CONTENT NORMALIZATION UTILITY
 * Stage 13.10.2 Secure Ingestion Foundation
 * 
 * Provides safe text normalization for Persian language content:
 * - Standardizes Yeh and Kaf variants without changing legal meaning
 * - Normalizes zero-width non-joiners (ZWNJ) and whitespace
 * - Strips HTML safely for comparison
 * - Separates display-safe normalization from comparison/hashing normalization
 * - Preserves raw input immutability
 */

/**
 * Normalizes Arabic Yeh and Kaf characters to standard Persian forms.
 */
export function normalizeYehKaf(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    // Arabic Yeh variants to Persian Yeh (\u06CC)
    .replace(/[\u0649\u064A\u06D2\u06D3]/g, '\u06CC')
    // Arabic Kaf to Persian Kaf (\u06A9)
    .replace(/[\u0643\u06AA]/g, '\u06A9');
}

/**
 * Normalizes Zero-Width Non-Joiner (ZWNJ / نیم‌فاصله) and removes control characters.
 */
export function normalizeZwnjAndControls(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    // Remove null bytes and dangerous control characters (excluding newline \n and tab \t)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    // Collapse multiple consecutive ZWNJs into one
    .replace(/\u200C{2,}/g, '\u200C')
    // Remove ZWNJ at string boundaries or adjacent to whitespace
    .replace(/(^\u200C+|\u200C+$)/g, '')
    .replace(/(\s\u200C+|\u200C+\s)/g, ' ');
}

/**
 * Collapses whitespace, multiple spaces, and normalizes line breaks.
 */
export function normalizeWhitespace(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    // Replace non-breaking spaces with standard space
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Collapse multiple horizontal spaces/tabs into a single space
    .replace(/[ \t]+/g, ' ')
    // Collapse 3 or more consecutive newlines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Safely strips HTML markup to plain text for comparison and indexing.
 * Does not execute or trust any markup.
 */
export function stripHtmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  return html
    // Remove script and style blocks completely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    // Replace block breaks with newlines
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove all remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common entities
    .replace(/&zwnj;/gi, '\u200C')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    // Normalize resulting whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts Arabic and Persian digits to Latin digits for comparison/indexing.
 */
export function normalizeDigitsToLatin(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  let result = input;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), String(i));
    result = result.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return result;
}

/**
 * Display-safe Persian normalization:
 * Cleans Yeh/Kaf, ZWNJ, and whitespace while preserving original digits and legal text formatting.
 */
export function normalizePersianDisplay(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let text = normalizeYehKaf(input);
  text = normalizeZwnjAndControls(text);
  text = normalizeWhitespace(text);
  return text;
}

/**
 * Comparison and hashing normalization:
 * Aggressively normalizes text for deduplication, title similarity, and canonical hashing:
 * - Normalizes Yeh/Kaf
 * - Normalizes ZWNJ to space for token matching
 * - Strips Arabic diacritics (Harakat / اعراب)
 * - Converts digits to Latin
 * - Strips punctuation and symbols
 * - Collapses whitespace to single spaces and trims
 */
export function normalizePersianForComparison(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // 1. Strip HTML if any
  let text = stripHtmlToPlainText(input);
  
  // 2. Yeh and Kaf normalization
  text = normalizeYehKaf(text);
  
  // 3. Remove Arabic diacritics (Fathah, Dammah, Kasrah, Tanween, Shaddah, Sukoon)
  text = text.replace(/[\u064B-\u065F\u0670]/g, '');
  
  // 4. Strip ZWNJ for agglutinative compound matching (e.g. دستور‌العمل === دستورالعمل)
  text = text.replace(/\u200C/g, '');
  
  // 5. Convert all digits to Latin
  text = normalizeDigitsToLatin(text);
  
  // 6. Remove punctuation, symbols, and special characters
  text = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?،؛«»"'\\[\]<>|\\\/+]/g, ' ');
  
  // 7. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim().toLowerCase();
  
  return text;
}

/**
 * Computes Jaccard token similarity between two Persian text strings.
 */
export function calculateTextSimilarity(textA: string, textB: string): number {
  const normA = normalizePersianForComparison(textA);
  const normB = normalizePersianForComparison(textB);

  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  const tokensA = new Set(normA.split(/\s+/).filter(t => t.length > 2));
  const tokensB = new Set(normB.split(/\s+/).filter(t => t.length > 2));

  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersectionCount = 0;
  tokensA.forEach(token => {
    if (tokensB.has(token)) {
      intersectionCount++;
    }
  });

  const unionSize = tokensA.size + tokensB.size - intersectionCount;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

