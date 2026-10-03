import { ChatMessage, CompletionResult, StreamChunk, estimateTokens } from './types'

/**
 * Demo Mode.
 *
 * When DEMO_MODE=true and no API key is configured, AI calls are answered by
 * this simulator instead of a real provider. It exists so a buyer can install
 * the template and immediately click through agents, the playground and
 * automations without signing up for anything.
 *
 * Every simulated response is clearly labelled in the UI. Delete this file and
 * set DEMO_MODE=false once real provider keys are in place.
 */

type Persona = {
  match: RegExp
  reply: (prompt: string) => string
}

const bullet = (items: string[]) => items.map((item) => `- ${item}`).join('\n')

const personas: Persona[] = [
  {
    match: /support|helpdesk|customer service|ticket/i,
    reply: (prompt) =>
      `Thanks for reaching out — happy to help with "${trim(prompt)}".\n\nHere is what I can do right away:\n\n${bullet([
        'Confirm the details on your account so we are looking at the same record',
        'Walk through the fix step by step',
        'Escalate to a specialist if the issue is not resolved in this reply',
      ])}\n\nCould you confirm the email address on the account so I can pull it up?`,
  },
  {
    match: /sales|lead|pitch|prospect|qualif/i,
    reply: (prompt) =>
      `Based on "${trim(prompt)}", here is how I would approach it:\n\n**Qualification read:** the request signals an active evaluation rather than casual research.\n\n**Suggested next steps**\n${bullet(
        [
          'Open with the specific outcome they mentioned, not a feature list',
          'Ask what their current process costs them per week',
          'Offer a 20-minute walkthrough rather than a generic demo',
        ],
      )}\n\n**Draft opener:** "You mentioned this is eating a few hours a week — mind if I show you the exact part that removes it?"`,
  },
  {
    match: /blog|article|content writer|write.*post/i,
    reply: (prompt) =>
      `# ${title(prompt)}\n\nMost teams treat this as a tooling problem when it is really a process problem.\n\n## Why it matters\n\nThe cost is rarely the obvious one. It shows up as context switching, half-finished handoffs, and work that has to be redone because nobody wrote down the decision.\n\n## What actually helps\n\n${bullet(
        [
          'Write the decision down where the work happens, not in a separate doc',
          'Automate the handoff, not the thinking',
          'Measure the time between "decided" and "shipped"',
        ],
      )}\n\n## Where to start\n\nPick the single step your team repeats most this week and remove one manual handoff from it.`,
  },
  {
    match: /seo|keyword|search engine|meta description/i,
    reply: (prompt) =>
      `**SEO brief — ${title(prompt)}**\n\n**Primary keyword:** ${slug(prompt)}\n**Search intent:** informational, comparison-leaning\n\n**Suggested title tag (58 chars)**\n${title(
        prompt,
      )}: A Practical Guide\n\n**Meta description (152 chars)**\nA clear, example-led guide to ${slug(
        prompt,
      )} — what it actually changes, how to set it up, and the mistakes worth skipping.\n\n**Outline**\n${bullet(
        ['What it is (answer the query in the first 80 words)', 'How it works, with one concrete example', 'Setup checklist', 'Common mistakes', 'FAQ block targeting related long-tail queries'],
      )}`,
  },
  {
    match: /email/i,
    reply: (prompt) =>
      `**Subject:** Quick question about ${slug(prompt)}\n\nHi there,\n\nI came across your work and wanted to ask about ${trim(
        prompt,
      )}.\n\nWe help teams cut the manual steps out of exactly this kind of workflow — usually a few hours back per week within the first month.\n\nWorth a short conversation next week? Happy to work around your schedule.\n\nBest,\n{{your_name}}`,
  },
  {
    match: /research|analy|summar|report|data/i,
    reply: (prompt) =>
      `**Summary of "${trim(prompt)}"**\n\n**Key findings**\n${bullet([
        'The dominant pattern is consistent across the sample rather than driven by outliers',
        'Two variables account for most of the observed variance',
        'The remaining gap is best explained by measurement timing, not by the intervention',
      ])}\n\n**Confidence:** moderate — the direction is clear, the magnitude is not.\n\n**Recommended next step:** re-run the comparison with the timing normalised before drawing a firm conclusion.`,
  },
]

function trim(prompt: string) {
  const clean = prompt.replace(/\s+/g, ' ').trim()
  return clean.length > 90 ? `${clean.slice(0, 90)}…` : clean || 'your request'
}

function title(prompt: string) {
  const clean = trim(prompt).replace(/[.…]+$/, '')
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

function slug(prompt: string) {
  return trim(prompt).toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').slice(0, 5).join(' ') || 'this topic'
}

function fallback(prompt: string, system: string) {
  const role = system ? system.replace(/\s+/g, ' ').trim().slice(0, 70) : 'a helpful assistant'
  return `Here is my response to "${trim(prompt)}".\n\nWorking from my instructions (${role}…), I would break this into three parts:\n\n${bullet(
    [
      'The immediate answer to what you asked',
      'The context that changes that answer',
      'The one action worth taking next',
    ],
  )}\n\nTell me which part you want expanded and I will go deeper.`
}

/** Produces a realistic, non-random response shaped by the agent's prompt. */
export async function simulateCompletion(
  messages: ChatMessage[],
  model: string,
): Promise<CompletionResult> {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join(' ')
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  const persona = personas.find((p) => p.match.test(system) || p.match.test(lastUser))

  const body = persona ? persona.reply(lastUser) : fallback(lastUser, system)
  const text = `${body}\n\n---\n_Demo Mode: this response was generated locally by the built-in simulator, not by ${model}. Add an API key under Settings → AI Providers for real completions._`

  // A small delay keeps loading states visible, the way a real call would.
  await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 500))

  return {
    text,
    inputTokens: estimateTokens(messages.map((m) => m.content).join(' ')),
    outputTokens: estimateTokens(text),
    simulated: true,
  }
}

/**
 * Streaming variant of the simulator.
 *
 * Emits the same response word by word with a small delay, so Demo Mode
 * exercises the exact streaming path the real providers use — including the
 * UI's incremental rendering.
 */
export async function* simulateStream(
  messages: ChatMessage[],
  model: string,
): AsyncGenerator<StreamChunk> {
  const result = await simulateCompletion(messages, model)
  const words = result.text.split(/(\s+)/)

  for (const word of words) {
    yield { type: 'delta', text: word }
    // Roughly 60 words/second — fast enough not to be tedious, slow enough
    // that the streaming UI is visibly doing something.
    await new Promise((resolve) => setTimeout(resolve, 16))
  }

  yield { type: 'done', inputTokens: result.inputTokens, outputTokens: result.outputTokens }
}
