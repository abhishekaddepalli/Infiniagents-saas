/**
 * Renders AI output as readable text.
 *
 * This is a deliberately small formatter for the markdown subset models
 * actually produce (headings, bullets, bold, inline code, rules). It escapes
 * nothing into HTML — every piece of model output is rendered as text nodes,
 * so a response can never inject markup into the page.
 */
function renderInline(text: string, keyPrefix: string) {
  // Split on **bold**, _italic_, *italic* and `code`, keeping the delimiters.
  // Bold is matched first so **x** is not mistaken for two italic markers.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_\n]+_|(?<!\*)\*[^*\n]+\*(?!\*))/g)

  return parts.filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={key}>{part.slice(1, -1)}</code>
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }
    return <span key={key}>{part}</span>
  })
}

export function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const blocks: React.ReactNode[] = []
  let bullets: string[] = []

  const flushBullets = (key: string) => {
    if (bullets.length === 0) return
    blocks.push(
      <ul key={key}>
        {bullets.map((item, index) => (
          <li key={`${key}-${index}`}>
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            <span>{renderInline(item, `${key}-${index}`)}</span>
          </li>
        ))}
      </ul>,
    )
    bullets = []
  }

  lines.forEach((line, index) => {
    const key = `line-${index}`
    const trimmed = line.trim()

    if (/^[-*]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*]\s+/, ''))
      return
    }
    flushBullets(`bullets-${index}`)

    if (trimmed === '---') {
      blocks.push(<hr key={key} />)
    } else if (trimmed.startsWith('## ')) {
      blocks.push(<h2 key={key}>{renderInline(trimmed.slice(3), key)}</h2>)
    } else if (trimmed.startsWith('# ')) {
      blocks.push(<h1 key={key}>{renderInline(trimmed.slice(2), key)}</h1>)
    } else if (trimmed.length > 0) {
      blocks.push(<p key={key}>{renderInline(trimmed, key)}</p>)
    }
  })
  flushBullets('bullets-final')

  return <div className="prose-chat">{blocks}</div>
}
