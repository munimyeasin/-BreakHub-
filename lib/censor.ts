/**
 * High-Performance Profanity & Toxicity Moderation Engine
 * Filters bad words, hate speech, and vulgar leetspeak in user-generated content.
 * Prevents false positives (e.g., 'classic', 'grass', 'assassin', 'cockpit').
 */

// Base list of profane / toxic root words
const BAD_WORDS = [
  'fuck', 'fucker', 'fucking', 'fucked', 'fuk', 'fck', 'fcker',
  'shit', 'shitty', 'shitting', 'shited', 'bullshit',
  'bitch', 'bitches', 'bitching', 'bitchy',
  'asshole', 'bastard', 'cunt', 'cunts', 'dick', 'dicks', 'dickhead',
  'pussy', 'pussies', 'slut', 'sluts', 'whore', 'whores',
  'nigger', 'niggers', 'nigga', 'niggas', 'faggot', 'faggots', 'fag', 'fags',
  'retard', 'retarded', 'kike', 'chink', 'spic', 'twat',
  'cock', 'cocksucker', 'wank', 'wanker', 'porn', 'porno', 'hentai',
  'blowjob', 'handjob', 'cum', 'cumshot', 'jizz', 'dildo', 'masturbat',
  'nazi', 'hitler', 'rape', 'rapist', 'pedophile', 'paedophile'
];

// Leetspeak character substitutions for normalization
const LEET_MAP: Record<string, string> = {
  '@': 'a', '4': 'a',
  '8': 'b',
  '(': 'c', '<': 'c',
  '3': 'e',
  '1': 'i', '!': 'i', '|': 'i',
  '0': 'o',
  '$': 's', '5': 's',
  '7': 't', '+': 't',
  'v': 'u',
  'w': 'vv'
};

/**
 * Normalizes a word by converting leetspeak digits/symbols to standard alphabet
 */
function normalizeLeet(str: string): string {
  let normalized = '';
  for (const char of str.toLowerCase()) {
    normalized += LEET_MAP[char] || char;
  }
  return normalized;
}

// Pre-compiled regexes with word boundaries
const WORD_PATTERNS = BAD_WORDS.map(word => {
  // Allow optional repeating chars and standard leet variations
  const pattern = word
    .split('')
    .map(c => {
      if (c === 'a') return '[a@4]+';
      if (c === 'b') return '[b8]+';
      if (c === 'c') return '[c(<]+';
      if (c === 'e') return '[e3]+';
      if (c === 'i') return '[i1!|]+';
      if (c === 'o') return '[o0]+';
      if (c === 's') return '[s$5]+';
      if (c === 't') return '[t7+]+';
      if (c === 'u') return '[uv]+';
      return `${c}+`;
    })
    .join('[\\s._-]*');

  return new RegExp(`\\b${pattern}\\b`, 'gi');
});

// Standalone bad words regex (including isolated 'ass' while allowing 'classic', 'grass', 'pass')
const STANDALONE_ASS = /\b(a|@|4)[s$5]{2,}\b/gi;

/**
 * Replaces detected profanity in text with asterisks of equal length
 */
export function censorText(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  // Mask standalone 'ass'
  result = result.replace(STANDALONE_ASS, match => '*'.repeat(match.length));

  // Mask all bad word pattern matches
  for (const regex of WORD_PATTERNS) {
    result = result.replace(regex, match => '*'.repeat(match.length));
  }

  return result;
}

/**
 * Checks whether text contains any profane words
 */
export function hasProfanity(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  if (STANDALONE_ASS.test(text)) return true;
  STANDALONE_ASS.lastIndex = 0;

  for (const regex of WORD_PATTERNS) {
    if (regex.test(text)) {
      regex.lastIndex = 0;
      return true;
    }
    regex.lastIndex = 0;
  }

  // Also check normalized word tokens
  const clean = normalizeLeet(text);
  for (const regex of WORD_PATTERNS) {
    if (regex.test(clean)) {
      regex.lastIndex = 0;
      return true;
    }
    regex.lastIndex = 0;
  }

  return false;
}

/**
 * Sanitizes both title and description for game requests
 */
export function sanitizeGameRequest(title: string, description: string): {
  title: string;
  description: string;
  wasCensored: boolean;
} {
  const censoredTitle = censorText(title);
  const censoredDesc = censorText(description);

  return {
    title: censoredTitle,
    description: censoredDesc,
    wasCensored: censoredTitle !== title || censoredDesc !== description
  };
}
