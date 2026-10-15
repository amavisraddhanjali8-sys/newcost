/**
 * Smart Search Engine & Query Parser Utility
 * Provides multi-token search, fuzzy matching, field qualifiers,
 * numeric comparison parsing, and relevance scoring.
 */

export interface SmartSearchQuery {
  raw: string;
  tokens: string[];
  exactPhrases: string[];
  negations: string[];
  qualifiers: Record<string, string>; // e.g. { type: 'material', price: '>100', client: 'boeing' }
}

/**
 * Parse a raw query string into structured smart search criteria.
 * Supports:
 * - Multi-word tokens: "aluminum sheet 6061" -> ['aluminum', 'sheet', '6061']
 * - Quoted phrases: '"precision rotor"' -> exact match
 * - Negations: "-scrap" or "!outdated" -> exclude items containing term
 * - Field qualifiers: `code:MAT-ALU`, `type:material`, `status:active`, `price:>100`, `margin:>20`
 */
export function parseSmartSearch(query: string): SmartSearchQuery {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return { raw: '', tokens: [], exactPhrases: [], negations: [], qualifiers: {} };
  }

  const exactPhrases: string[] = [];
  const negations: string[] = [];
  const qualifiers: Record<string, string> = {};
  const tokens: string[] = [];

  // 1. Extract quoted phrases: "word word"
  let processed = trimmed.replace(/"([^"]+)"/g, (_, phrase) => {
    if (phrase.trim()) exactPhrases.push(phrase.trim().toLowerCase());
    return ' ';
  });

  // 2. Split words
  const rawWords = processed.split(/\s+/).filter(Boolean);

  for (const word of rawWords) {
    // Check for negation: -term or !term
    if ((word.startsWith('-') || word.startsWith('!')) && word.length > 1) {
      negations.push(word.slice(1).toLowerCase());
      continue;
    }

    // Check for field qualifier: key:value or key:>num
    const colonIdx = word.indexOf(':');
    if (colonIdx > 0 && colonIdx < word.length - 1) {
      const key = word.slice(0, colonIdx).toLowerCase();
      const val = word.slice(colonIdx + 1).toLowerCase();
      qualifiers[key] = val;
      continue;
    }

    // Regular token
    tokens.push(word.toLowerCase());
  }

  return {
    raw: trimmed,
    tokens,
    exactPhrases,
    negations,
    qualifiers
  };
}

/**
 * Normalize string for typo and format tolerant comparison
 * Strips punctuation, dashes, spaces, underscores: "PRJ-2026-001" -> "prj2026001"
 */
export function normalizeString(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Calculate simple Levenshtein distance for short tokens (typo tolerance)
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Evaluate if a target field matches a numeric operator expression.
 * Supports: ">100", "<500", ">=25", "<=50", "100..500", "=250", "150"
 */
export function matchNumericCondition(val: number, expr: string): boolean {
  if (val === undefined || val === null || isNaN(val)) return false;
  const clean = expr.trim();

  // Range expression: "100..500"
  if (clean.includes('..')) {
    const [minStr, maxStr] = clean.split('..');
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    if (!isNaN(min) && val < min) return false;
    if (!isNaN(max) && val > max) return false;
    return true;
  }

  // Greater than / equals: ">=100" or ">100"
  if (clean.startsWith('>=')) {
    const num = parseFloat(clean.slice(2));
    return !isNaN(num) && val >= num;
  }
  if (clean.startsWith('>')) {
    const num = parseFloat(clean.slice(1));
    return !isNaN(num) && val > num;
  }

  // Less than / equals: "<=100" or "<100"
  if (clean.startsWith('<=')) {
    const num = parseFloat(clean.slice(2));
    return !isNaN(num) && val <= num;
  }
  if (clean.startsWith('<')) {
    const num = parseFloat(clean.slice(1));
    return !isNaN(num) && val < num;
  }

  // Exact equals
  if (clean.startsWith('=')) {
    const num = parseFloat(clean.slice(1));
    return !isNaN(num) && Math.abs(val - num) < 0.001;
  }

  const exactNum = parseFloat(clean);
  if (!isNaN(exactNum)) {
    return Math.abs(val - exactNum) < 0.001;
  }

  return true;
}

export interface SearchableField {
  name: string;
  value: any;
  weight?: number; // 1 = normal, 2 = title/name, 3 = code/id
  isNumeric?: boolean;
}

/**
 * Evaluates an item against a smart search query.
 * Returns match score > 0 if matches, 0 if rejected.
 */
export function evaluateSmartSearch(
  query: SmartSearchQuery,
  fields: SearchableField[]
): { matches: boolean; score: number } {
  if (!query.raw) {
    return { matches: true, score: 1 };
  }

  // 1. Check Negations: If any field matches a negation term, reject immediately
  for (const neg of query.negations) {
    for (const field of fields) {
      const strVal = String(field.value || '').toLowerCase();
      if (strVal.includes(neg)) {
        return { matches: false, score: 0 };
      }
    }
  }

  // 2. Check Exact Phrases
  for (const phrase of query.exactPhrases) {
    let phraseFound = false;
    for (const field of fields) {
      const strVal = String(field.value || '').toLowerCase();
      if (strVal.includes(phrase)) {
        phraseFound = true;
        break;
      }
    }
    if (!phraseFound) {
      return { matches: false, score: 0 };
    }
  }

  // 3. Check Field Qualifiers
  for (const [qualifierKey, qualifierVal] of Object.entries(query.qualifiers)) {
    // Find matching field
    const matchedFields = fields.filter((f) => {
      const fn = f.name.toLowerCase();
      if (fn === qualifierKey) return true;
      if (qualifierKey === 'code' && (fn === 'code' || fn === 'id' || fn === 'sku')) return true;
      if (qualifierKey === 'name' && (fn === 'name' || fn === 'title')) return true;
      if (qualifierKey === 'price' && (fn === 'price' || fn === 'rate' || fn === 'quotedprice' || fn === 'cost')) return true;
      if (qualifierKey === 'rate' && (fn === 'rate' || fn === 'price' || fn === 'unitprice')) return true;
      if (qualifierKey === 'margin' && (fn === 'margin' || fn === 'targetmarginpct' || fn === 'marginpct')) return true;
      if (qualifierKey === 'stock' && (fn === 'stock' || fn === 'instock' || fn === 'stockquantity' || fn === 'stockorsla')) return true;
      if (qualifierKey === 'cat' && (fn === 'category' || fn === 'subcategory' || fn === 'productcategory')) return true;
      if (qualifierKey === 'client' && (fn === 'client' || fn === 'clientname')) return true;
      if (qualifierKey === 'type' && (fn === 'type' || fn === 'classification' || fn === 'rawtype')) return true;
      if (qualifierKey === 'status' && fn === 'status') return true;
      if (qualifierKey === 'supplier' && (fn === 'supplier' || fn === 'suppliername' || fn === 'providername')) return true;
      return false;
    });

    if (matchedFields.length === 0) {
      // Qualifier key doesn't match any known field; fallback to substring search on all fields
      let anyMatch = false;
      for (const field of fields) {
        if (String(field.value || '').toLowerCase().includes(qualifierVal)) {
          anyMatch = true;
          break;
        }
      }
      if (!anyMatch) return { matches: false, score: 0 };
      continue;
    }

    let qualifierMatched = false;
    for (const f of matchedFields) {
      if (f.isNumeric || typeof f.value === 'number') {
        const num = typeof f.value === 'number' ? f.value : parseFloat(String(f.value));
        if (matchNumericCondition(num, qualifierVal)) {
          qualifierMatched = true;
          break;
        }
      } else {
        const strVal = String(f.value || '').toLowerCase();
        const cleanVal = normalizeString(strVal);
        const cleanQual = normalizeString(qualifierVal);

        if (strVal.includes(qualifierVal) || cleanVal.includes(cleanQual)) {
          qualifierMatched = true;
          break;
        }
      }
    }

    if (!qualifierMatched) {
      return { matches: false, score: 0 };
    }
  }

  // 4. Check Tokens against all fields and calculate relevance score
  let score = 10;

  if (query.tokens.length > 0) {
    // Every token must match AT LEAST ONE field (AND logic across tokens)
    for (const token of query.tokens) {
      let tokenMatched = false;
      const cleanToken = normalizeString(token);

      for (const field of fields) {
        const rawStr = String(field.value || '').toLowerCase();
        const cleanField = normalizeString(rawStr);
        const weight = field.weight || 1;

        // Exact match on field
        if (rawStr === token || cleanField === cleanToken) {
          tokenMatched = true;
          score += 30 * weight;
          break;
        }

        // Prefix match
        if (rawStr.startsWith(token) || cleanField.startsWith(cleanToken)) {
          tokenMatched = true;
          score += 20 * weight;
          break;
        }

        // Substring match
        if (rawStr.includes(token) || cleanField.includes(cleanToken)) {
          tokenMatched = true;
          score += 10 * weight;
          break;
        }

        // Typo tolerance: For tokens >= 4 characters, check edit distance <= 1 on individual words
        if (token.length >= 4) {
          const words = rawStr.split(/[\s\-_/]+/).filter(w => w.length >= 3);
          for (const w of words) {
            if (Math.abs(w.length - token.length) <= 1 && levenshteinDistance(w, token) <= 1) {
              tokenMatched = true;
              score += 8 * weight;
              break;
            }
          }
          if (tokenMatched) break;
        }
      }

      if (!tokenMatched) {
        return { matches: false, score: 0 };
      }
    }
  }

  return { matches: true, score };
}

/**
 * Highlights matches in text for visual display in search results.
 */
export function getSmartSearchHighlights(text: string, tokens: string[]): Array<{ text: string; isMatch: boolean }> {
  if (!text || !tokens.length) return [{ text: text || '', isMatch: false }];

  const pattern = tokens
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)
    .join('|');

  if (!pattern) return [{ text, isMatch: false }];

  try {
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);
    return parts.filter(Boolean).map(part => ({
      text: part,
      isMatch: tokens.some(t => t.toLowerCase() === part.toLowerCase())
    }));
  } catch {
    return [{ text, isMatch: false }];
  }
}
