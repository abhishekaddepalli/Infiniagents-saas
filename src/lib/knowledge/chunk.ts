/**
 * Splits a document into overlapping chunks for embedding.
 *
 * Boundaries are chosen in order of preference: a markdown heading, then a
 * paragraph, then a sentence, then a hard cut. Headings matter most — packing
 * two topics into one chunk dilutes its vector and makes retrieval return the
 * wrong section, which is the single most common cause of a knowledge base
 * that "does not work".
 *
 * Overlap carries a little context across each boundary, which helps when an
 * answer straddles two chunks.
 */
export type Chunk = { index: number; content: string; tokens: number }

const CHUNK_CHARS = 800
const OVERLAP_CHARS = 120
const MIN_CHUNK_CHARS = 60

/** Same ~4 chars/token approximation used for cost estimates elsewhere. */
export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4))
}

/** Strips control and zero-width characters that survive PDF extraction. */
function normalise(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u200b-\u200d\ufeff]/g, '')
    .trim()
}

/**
 * Splits on markdown headings, keeping each heading with the text beneath it.
 * A document with no headings comes back as a single section.
 */
function splitSections(text: string): string[] {
  const lines = text.split('\n')
  const sections: string[] = []
  let current: string[] = []

  for (const line of lines) {
    // A heading starts a new section, unless nothing has accumulated yet.
    if (/^#{1,6}\s+\S/.test(line) && current.some((entry) => entry.trim())) {
      sections.push(current.join('\n').trim())
      current = []
    }
    current.push(line)
  }
  if (current.join('\n').trim()) sections.push(current.join('\n').trim())

  return sections.filter(Boolean)
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

/** Splits an over-long paragraph on sentence ends, then hard-cuts if needed. */
function splitLongParagraph(paragraph: string): string[] {
  if (paragraph.length <= CHUNK_CHARS) return [paragraph]

  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [paragraph]
  const parts: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (sentence.length > CHUNK_CHARS) {
      // A single sentence longer than a chunk (minified text, no punctuation).
      if (current.trim()) {
        parts.push(current.trim())
        current = ''
      }
      for (let offset = 0; offset < sentence.length; offset += CHUNK_CHARS) {
        parts.push(sentence.slice(offset, offset + CHUNK_CHARS).trim())
      }
      continue
    }
    if (current.length + sentence.length > CHUNK_CHARS && current) {
      parts.push(current.trim())
      current = ''
    }
    current += sentence
  }
  if (current.trim()) parts.push(current.trim())
  return parts.filter(Boolean)
}

export function chunkText(text: string): Chunk[] {
  const clean = normalise(text)
  if (!clean) return []

  const packed: string[] = []

  // Each heading section is packed independently, so a chunk never spans two
  // topics. Short sections simply become one small chunk each.
  for (const section of splitSections(clean)) {
    const heading = section.match(/^#{1,6}\s+.*/)?.[0] ?? ''
    const pieces = splitParagraphs(section).flatMap(splitLongParagraph)

    let current = ''
    for (const piece of pieces) {
      if (current && current.length + piece.length + 2 > CHUNK_CHARS) {
        packed.push(current)
        // Repeat the heading on continuation chunks so they keep their topic.
        const overlap = current.slice(-OVERLAP_CHARS)
        const boundary = overlap.indexOf(' ')
        const tail = boundary > 0 ? overlap.slice(boundary + 1) : ''
        current = heading && !tail.startsWith(heading) ? `${heading}\n\n${tail}` : tail
        if (current) current += '\n\n'
      }
      current += (current ? '\n\n' : '') + piece
    }
    if (current.trim()) packed.push(current.trim())
  }

  return packed
    // A chunk holding only a document title carries no answer, and would
    // otherwise compete with real content for a retrieval slot.
    .filter((content) => content.replace(/^#{1,6}\s+/, '').trim().length >= MIN_CHUNK_CHARS)
    .map((content, index) => ({
      index,
      content: content.trim(),
      tokens: estimateTokens(content),
    }))
}
