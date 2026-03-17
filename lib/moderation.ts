/**
 * Content moderation — blocks slurs, profanity, and common evasion patterns.
 * Normalizes input before matching so letter-substitutions and spacing tricks are caught.
 */

const SLUR_PATTERNS: RegExp[] = [
  /n+[i!1l|]+[gq]+[gq]+[e3a@]+[r]+/i,
  /n+[i!1l|]+[gq]+[gq]+[a@4]+[sz]*/i,
  /n+[i!1l|]+[gq]+[a@4]+[sz]*/i,
  /n+[e3]+[gq]+[r]+[o0]+[sz]*/i,
]

const PROFANITY_PATTERNS: RegExp[] = [
  /f+[u]+[c]+[k]+/i,
  /s+h+[i!1]+[t]+/i,
  /b+[i!1]+[t]+[c]+h+/i,
  /a+[s]+[s]+h+[o0]+[l]+[e3]+/i,
  /d+[i!1]+[c]+k+/i,
  /p+[u]+[s]+[s]+[y]+/i,
  /c+[u]+n+[t]+/i,
  /w+h+[o0]+r+[e3]+/i,
  /d+[a@]+m+n+/i,
  /f+[a@]+[gq]+[gq]*/i,
  /r+[e3]+t+[a@]+r+d+/i,
  /c+[o0]+[c]+k+/i,
  /t+w+[a@]+t+/i,
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s_\-.*+]/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/\|/g, "l")
}

export function containsProhibitedContent(text: string): boolean {
  const cleaned = normalize(text)
  return SLUR_PATTERNS.some((pattern) => pattern.test(cleaned))
}

export function containsProfanity(text: string): boolean {
  const cleaned = normalize(text)
  return PROFANITY_PATTERNS.some((pattern) => pattern.test(cleaned)) ||
    SLUR_PATTERNS.some((pattern) => pattern.test(cleaned))
}
