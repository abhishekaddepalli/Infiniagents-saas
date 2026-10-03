import 'server-only'
import { AppError } from '../api'

/**
 * Turns an uploaded file into plain text for chunking.
 *
 * Text formats are read directly; PDFs go through `unpdf`. Anything else is
 * rejected with a message naming what is supported, rather than silently
 * indexing binary noise.
 */
export const SUPPORTED_EXTENSIONS = ['txt', 'md', 'markdown', 'csv', 'json', 'html', 'htm', 'pdf']

export const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
}

export async function extractText(file: {
  name: string
  buffer: ArrayBuffer
  mimeType: string
}): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new AppError(
      `"${file.name}" is not a supported file type. Upload one of: ${SUPPORTED_EXTENSIONS.join(', ')}.`,
      415,
    )
  }
  if (file.buffer.byteLength > MAX_FILE_BYTES) {
    throw new AppError(`"${file.name}" is larger than the 5 MB upload limit.`, 413)
  }

  if (extension === 'pdf') {
    try {
      // Imported lazily so the PDF engine is not loaded for text uploads.
      const { extractText: extractPdfText, getDocumentProxy } = await import('unpdf')
      const document = await getDocumentProxy(new Uint8Array(file.buffer))
      const { text } = await extractPdfText(document, { mergePages: true })
      const joined = Array.isArray(text) ? text.join('\n\n') : text
      if (!joined.trim()) {
        throw new AppError(
          `No text could be read from "${file.name}". Scanned PDFs need OCR before they can be indexed.`,
          422,
        )
      }
      return joined
    } catch (error) {
      if (error instanceof AppError) throw error
      console.error('[agentflow] PDF extraction failed:', error)
      throw new AppError(
        `"${file.name}" could not be read. It may be corrupt or password protected.`,
        422,
      )
    }
  }

  const text = new TextDecoder('utf-8').decode(file.buffer)
  if (extension === 'html' || extension === 'htm') return stripHtml(text)
  if (extension === 'json') {
    // Pretty-print so the chunker has line structure to work with.
    try {
      return JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      return text
    }
  }
  return text
}
