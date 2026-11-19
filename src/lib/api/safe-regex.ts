/**
 * Helpers for safely compiling and running user-supplied regular expressions.
 *
 * Live tail lets users type arbitrary regex filters. JavaScript regex
 * evaluation is synchronous, so a catastrophic-backtracking pattern such as
 * `(a+)+$` can freeze the browser tab on every incoming event (ReDoS). We
 * therefore reject structurally unsafe patterns, cap pattern length, and cap
 * the text a pattern may scan.
 *
 * The checks are deliberately conservative: for example the valid IP regex
 * `^(\d{1,3}\.){3}\d{1,3}$` is rejected because it nests a bounded quantifier
 * inside a quantified group. A false positive only asks the user to simplify;
 * a false negative could hang the tab.
 */

export const MAX_REGEX_PATTERN_LENGTH = 256;
export const MAX_REGEX_INPUT_LENGTH = 10_000;
const MAX_REGEX_QUANTIFIERS = 10;

interface SequenceInfo {
  quantifierCount: number;
  branches: Array<[number, number]>;
  unsafe: boolean;
}

/** The set of characters a token can begin with, plus a wildcard flag for
 * "anything" (`.`, negated classes, `\W`/`\D`/`\S`). All characters are
 * lower-cased because every regex here is compiled with the `i` flag. */
interface FirstToken {
  chars: Set<string>;
  any: boolean;
}

const WORD_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789_";
const DIGIT_CHARS = "0123456789";
const SPACE_CHARS = " \t\n\r\f\v";

function lower(ch: string): string {
  return ch.toLowerCase();
}

/** Expand an escape (\w, \d, [^...], \xNN, ...) at `at` into first-char info. */
function escapeSet(pattern: string, at: number): (FirstToken & { end: number }) | null {
  const next = pattern[at + 1];
  if (next === undefined) return null;
  const end = at + 2;
  switch (next) {
    case "w":
      return { chars: new Set(WORD_CHARS), any: false, end };
    case "d":
      return { chars: new Set(DIGIT_CHARS), any: false, end };
    case "s":
      return { chars: new Set(SPACE_CHARS), any: false, end };
    case "W":
    case "D":
    case "S":
      return { chars: new Set(), any: true, end };
    case "b":
    case "B":
      return { chars: new Set(), any: false, end }; // zero-width assertion
    case "x": {
      const hex = pattern.slice(at + 2, at + 4);
      return /^[0-9a-fA-F]{2}$/.test(hex)
        ? { chars: new Set([lower(String.fromCharCode(parseInt(hex, 16)))]), any: false, end: at + 4 }
        : null;
    }
    case "u": {
      const hex = pattern.slice(at + 2, at + 6);
      return /^[0-9a-fA-F]{4}$/.test(hex)
        ? { chars: new Set([lower(String.fromCharCode(parseInt(hex, 16)))]), any: false, end: at + 6 }
        : null;
    }
    default:
      if (/[0-9]/.test(next)) return null; // backreference: indeterminate
      return { chars: new Set([lower(next)]), any: false, end };
  }
}

/** Expand a character class such as [ab] or [a-c] at `at`. */
function classSet(pattern: string, at: number): (FirstToken & { end: number }) | null {
  let i = at + 1;
  let negated = false;
  if (pattern[i] === "^") {
    negated = true;
    i++;
  }
  const chars = new Set<string>();
  let any = false;
  let first = true;
  while (i < pattern.length) {
    if (pattern[i] === "]" && !first) {
      return negated ? { chars: new Set(), any: true, end: i + 1 } : { chars, any, end: i + 1 };
    }
    first = false;
    const left = pattern[i] === "\\" ? escapeSet(pattern, i) : { chars: new Set([lower(pattern[i])]), any: false, end: i + 1 };
    if (left === null) return null;
    if (left.any) any = true;
    for (const c of left.chars) chars.add(c);
    i = left.end;

    if (pattern[i] === "-" && pattern[i + 1] !== undefined && pattern[i + 1] !== "]") {
      const right =
        pattern[i + 1] === "\\"
          ? escapeSet(pattern, i + 1)
          : { chars: new Set([lower(pattern[i + 1])]), any: false, end: i + 2 };
      if (right === null) return null;
      if (right.any) any = true;
      else if (left.chars.size === 1 && right.chars.size === 1) {
        const from = [...left.chars][0];
        const to = [...right.chars][0];
        if (from.length === 1 && to.length === 1 && from <= to) {
          for (let code = from.charCodeAt(0); code <= to.charCodeAt(0); code++) {
            chars.add(String.fromCharCode(code));
          }
        }
      }
      i = right.end;
    }
  }
  return null; // unterminated class
}

function findCloseParen(pattern: string, at: number): number {
  let depth = 1;
  let i = at;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "\\") {
      i += 2;
    } else if (ch === "[") {
      const cls = classSet(pattern, i);
      if (cls === null) return -1;
      i = cls.end;
    } else if (ch === "(") {
      depth++;
      i++;
    } else if (ch === ")") {
      if (--depth === 0) return i;
      i++;
    } else {
      i++;
    }
  }
  return -1;
}

function splitAlternation(body: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === "\\") {
      i += 2;
    } else if (ch === "[") {
      const cls = classSet(body, i);
      if (cls === null) return [body];
      i = cls.end;
    } else if (ch === "(") {
      const close = findCloseParen(body, i);
      if (close === -1) return [body];
      i = close + 1;
    } else {
      if (ch === "|") {
        parts.push(body.slice(start, i));
        start = i + 1;
      }
      i++;
    }
  }
  parts.push(body.slice(start));
  return parts;
}

function firstToken(branch: string): FirstToken | null {
  const result: FirstToken = { chars: new Set(), any: false };
  let i = 0;
  while (i < branch.length) {
    const ch = branch[i];
    if (ch === "^" || ch === "$") {
      i++;
      continue;
    }
    let token: FirstToken & { end: number } | null;
    if (ch === "\\") {
      token = escapeSet(branch, i);
    } else if (ch === "[") {
      token = classSet(branch, i);
    } else if (ch === "(") {
      let bodyStart = i + 1;
      if (branch[bodyStart] === "?") {
        const next = branch[bodyStart + 1];
        if (next === ":" || next === "=" || next === "!") bodyStart += 2;
        else if (next === "<" && /[=!]/.test(branch[bodyStart + 2] ?? "")) bodyStart += 3;
        else if (next === "<") {
          const gt = branch.indexOf(">", bodyStart + 2);
          if (gt === -1) return null;
          bodyStart = gt + 1;
        } else bodyStart++;
      }
      const close = findCloseParen(branch, i);
      if (close === -1) return null;
      const merged = alternationFirstToken(branch.slice(bodyStart, close));
      if (merged === null) return null;
      token = { ...merged, end: close + 1 };
    } else if (ch === ".") {
      token = { chars: new Set(), any: true, end: i + 1 };
    } else if (ch === "|") {
      break;
    } else {
      token = { chars: new Set([lower(ch)]), any: false, end: i + 1 };
    }
    if (token === null) return null;
    for (const c of token.chars) result.chars.add(c);
    if (token.any) result.any = true;
    break;
  }
  return result;
}

function alternationFirstToken(body: string): FirstToken | null {
  const merged: FirstToken = { chars: new Set(), any: false };
  for (const branch of splitAlternation(body)) {
    const token = firstToken(branch);
    if (token === null) return null;
    for (const c of token.chars) merged.chars.add(c);
    if (token.any) merged.any = true;
  }
  return merged;
}

/** Semantic overlap: branches that can start with the same character (after
 * expanding classes/shorthands and folding case) can backtrack exponentially
 * once the surrounding group is quantified: (a|A)+, (\w|a)+, ([ab]|a)+. */
function hasOverlappingBranches(branches: string[]): boolean {
  const tokens = branches.map(firstToken);
  if (tokens.some((token) => token === null)) return true; // indeterminate: reject
  if (tokens.some((token) => token!.chars.size === 0 && !token!.any)) return true; // empty branch
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      const a = tokens[i]!;
      const b = tokens[j]!;
      if (a.any || b.any) return true;
      for (const c of a.chars) if (b.chars.has(c)) return true;
    }
  }
  return false;
}

/** Return the index just past a quantifier at `index`, or null if there is none. */
function readQuantifier(pattern: string, index: number): number | null {
  const ch = pattern[index];
  if (ch === "+" || ch === "*" || ch === "?") {
    let end = index + 1;
    if (pattern[end] === "?") end++;
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
          pos.i += 3;
        } else if (next === "<") {
          const close = pattern.indexOf(">", pos.i + 2);
          pos.i = close === -1 ? pos.i + 2 : close + 1;
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
        if (
          nested.quantifierCount > 0 ||
          hasOverlappingBranches(nested.branches.map(([start, end]) => pattern.slice(start, end)))
        ) {
          info.unsafe = true;
        }
      }

      if (readQuantifier(pattern, pos.i) !== null) {
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
