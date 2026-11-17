/**
 * Helpers for safely compiling and running user-supplied regular expressions.
 *
 * Live tail lets users type arbitrary regex filters. JavaScript regex
 * evaluation is synchronous, so a catastrophic-backtracking pattern such as
 * `(a+)+$` can freeze the browser tab on every incoming event (ReDoS). We
 * therefore reject structurally unsafe patterns, cap pattern length, and cap
 * the text a pattern may scan.
 */

export const MAX_REGEX_PATTERN_LENGTH = 256;
export const MAX_REGEX_INPUT_LENGTH = 10_000;
const MAX_REGEX_QUANTIFIERS = 10;

interface SequenceInfo {
  quantifierCount: number;
  branches: Array<[number, number]>;
  unsafe: boolean;
}

/** Return the index just past a quantifier at `index`, or null if there is none. */
function readQuantifier(pattern: string, index: number): number | null {
  const ch = pattern[index];
  if (ch === "+" || ch === "*" || ch === "?") {
    let end = index + 1;
    if (pattern[end] === "?") end++; // lazy modifier
    return end;
  }
  if (ch === "{") {
    const close = pattern.indexOf("}", index + 1);
    if (close !== -1 && /^\{\d+(?:,\d*)?\}$/.test(pattern.slice(index, close + 1))) {
      let end = close + 1;
      if (pattern[end] === "?") end++;
      return end;
    }
  }
  return null;
}

function skipCharacterClass(pattern: string, pos: { i: number }): void {
  pos.i++;
  while (pos.i < pattern.length) {
    if (pattern[pos.i] === "\\") pos.i += 2;
    else if (pattern[pos.i] === "]") {
      pos.i++;
      return;
    } else pos.i++;
  }
}

/** Two alternation branches where one is a prefix of the other can backtrack
 * exponentially once the alternation itself is quantified: (a|aaa)+, (ab|abcd)+. */
function hasPrefixOverlap(branches: string[]): boolean {
  const parts = branches.filter((branch) => branch.length > 0);
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const [shorter, longer] =
        parts[i].length <= parts[j].length ? [parts[i], parts[j]] : [parts[j], parts[i]];
      if (longer.startsWith(shorter)) return true;
    }
  }
  return false;
}

/** Scan one regex sequence (a group body or the whole pattern), tracking
 * quantifiers and alternation branches so nesting can be detected. */
function parseSequence(pattern: string, pos: { i: number }, inGroup: boolean): SequenceInfo {
  const info: SequenceInfo = { quantifierCount: 0, branches: [], unsafe: false };
  let branchStart = pos.i;

  while (pos.i < pattern.length) {
    const ch = pattern[pos.i];

    if (ch === "|") {
      info.branches.push([branchStart, pos.i]);
      pos.i++;
      branchStart = pos.i;
      continue;
    }
    if (ch === ")" && inGroup) break;

    let nested: SequenceInfo | null = null;
    let isGroup = false;

    if (ch === "\\") {
      const isBackreference = /^[1-9]$/.test(pattern[pos.i + 1] ?? "");
      pos.i += 2;
      if (isBackreference && readQuantifier(pattern, pos.i) !== null) {
        // Repeating a captured group by reference is unbounded backtracking.
        info.unsafe = true;
      }
    } else if (ch === "[") {
      skipCharacterClass(pattern, pos);
    } else if (ch === "(") {
      isGroup = true;
      pos.i++;
      if (pattern[pos.i] === "?") {
        const next = pattern[pos.i + 1];
        if (next === ":" || next === "=" || next === "!") {
          pos.i += 2;
        } else if (next === "<" && /[=!]/.test(pattern[pos.i + 2] ?? "")) {
          pos.i += 3; // lookbehind (?<= / (?<!
        } else if (next === "<") {
          const close = pattern.indexOf(">", pos.i + 2);
          pos.i = close === -1 ? pos.i + 2 : close + 1; // named group
        } else {
          pos.i++;
        }
      }
      nested = parseSequence(pattern, pos, true);
      if (nested.unsafe) info.unsafe = true;
      info.quantifierCount += nested.quantifierCount;
      if (pattern[pos.i] === ")") pos.i++;
    } else {
      pos.i++;
    }

    const quantEnd = readQuantifier(pattern, pos.i);
    if (quantEnd !== null) {
      info.quantifierCount++;
      pos.i = quantEnd;

      if (isGroup && nested) {
        // A quantifier on a group that already contains a quantifier (of any
        // kind, including {m,n}) or prefix-overlapping alternation is unsafe.
        if (
          nested.quantifierCount > 0 ||
          hasPrefixOverlap(nested.branches.map(([start, end]) => pattern.slice(start, end)))
        ) {
          info.unsafe = true;
        }
      }

      if (readQuantifier(pattern, pos.i) !== null) {
        // Stacked quantifiers such as a*+ or a{2}+.
        info.unsafe = true;
      }
    }
  }

  info.branches.push([branchStart, pos.i]);
  return info;
}

export function isPotentiallyUnsafeRegex(pattern: string): boolean {
  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) return true;
  const info = parseSequence(pattern, { i: 0 }, false);
  return info.unsafe || info.quantifierCount > MAX_REGEX_QUANTIFIERS;
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
