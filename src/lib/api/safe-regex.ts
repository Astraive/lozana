/**
 * Helpers for safely compiling and running user-supplied regular expressions.
 *
 * Live tail lets users type arbitrary regex filters. JavaScript regex
 * evaluation is synchronous, so a catastrophic-backtracking pattern such as
 * `(a+)+$` can freeze the browser tab on every incoming event (ReDoS). We
 * therefore reject overly long patterns and the nested-repetition shapes that
 * cause exponential backtracking, and we cap the text a pattern may scan.
 */

export const MAX_REGEX_PATTERN_LENGTH = 256;
export const MAX_REGEX_INPUT_LENGTH = 10_000;

// Normalize non-capturing / lookaround group prefixes so their leading "?" is
// not mistaken for a quantifier by the checks below.
const GROUP_PREFIX = /\(\?(?:[:=!]|<[=!]|<[^>]+>)/g;

// Each signature matches a construct prone to catastrophic backtracking:
// - a quantifier on a group that already contains a quantifier: (a+)+
// - a quantifier on an alternation with overlapping branches: (a|aa)+
// - stacked/adjacent quantifiers: a*+, (a?)+
const UNSAFE_PATTERN_SIGNATURES: RegExp[] = [
  /\([^()]*[+*?][^()]*\)\s*[+*{]/, // nested quantifier: (a+)+
  /\([^()|]{1,2}\|[^()|]{1,2}\)\s*[+*{]/, // overlapping short alternation: (a|aa)+
  /[+*][?]?\s*[+*{]/, // stacked quantifiers: a*+
  /\{\d*(?:,\d*)?\}[?]?\s*[+*{]/, // quantifier stacked on a bounded repeat
];

export function isPotentiallyUnsafeRegex(pattern: string): boolean {
  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) return true;
  const normalized = pattern.replace(GROUP_PREFIX, "(");
  return UNSAFE_PATTERN_SIGNATURES.some((signature) => signature.test(normalized));
}

export interface SafeRegexResult {
  regex: RegExp | null;
  error: string | null;
}

export function compileSafeRegex(pattern: string, flags = "i"): SafeRegexResult {
  if (!pattern) return { regex: null, error: null };
  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) {
    return {
      regex: null,
      error: `Regex pattern is too long (max ${MAX_REGEX_PATTERN_LENGTH} characters)`,
    };
  }
  if (isPotentiallyUnsafeRegex(pattern)) {
    return {
      regex: null,
      error: "Regex pattern is too complex and could slow the browser; simplify nested quantifiers",
    };
  }
  try {
    return { regex: new RegExp(pattern, flags), error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid regular expression";
    return { regex: null, error: message };
  }
}

export function testRegexSafely(regex: RegExp, input: string): boolean {
  const bounded = input.length > MAX_REGEX_INPUT_LENGTH ? input.slice(0, MAX_REGEX_INPUT_LENGTH) : input;
  return regex.test(bounded);
}
