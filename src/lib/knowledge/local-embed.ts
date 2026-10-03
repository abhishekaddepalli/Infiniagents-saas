/**
 * Local lexical embedding — the Demo Mode fallback.
 *
 * Kept in its own file with no imports so the Prisma seed can use it without
 * pulling in the server-only runtime.
 *
 * This captures keyword overlap, not meaning: it will match "invoice" to
 * "invoice" but not to "billing". Good enough to demonstrate the retrieval
 * pipeline end to end; swap in a real provider for production quality.
 */
export const LOCAL_EMBEDDING_MODEL = 'local-lexical-256'

const LOCAL_DIMENSIONS = 256

/** Deterministic 32-bit hash, used to bucket a word into a vector dimension. */
function hashToken(token: string): number {
  let hash = 2166136261
  for (let index = 0; index < token.length; index++) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

const STOP_WORDS = new Set(
  'a an and are as at be by for from has have how i in is it of on or that the this to was what when where which who will with you your'.split(
    ' ',
  ),
)

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

/** Hashed bag-of-words vector, L2-normalised so cosine similarity works. */
export function localEmbed(text: string): number[] {
  const vector = new Array(LOCAL_DIMENSIONS).fill(0)
  const tokens = tokenise(text)
  if (tokens.length === 0) return vector

  for (const token of tokens) {
    vector[hashToken(token) % LOCAL_DIMENSIONS] += 1
    // A second, prefix-based signal reduces collisions between short documents.
    vector[hashToken(token.slice(0, 4)) % LOCAL_DIMENSIONS] += 0.5
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  return magnitude === 0 ? vector : vector.map((value) => value / magnitude)
}
