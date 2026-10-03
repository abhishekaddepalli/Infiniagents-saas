/**
 * Reusable prompt library, shown at /prompts.
 * Add your own entries here and re-run `npm run db:seed`.
 */
export type SeedPrompt = { title: string; category: string; body: string; tags: string[] }

export const prompts: SeedPrompt[] = [
  {
    title: 'Competitor teardown',
    category: 'Business',
    tags: ['strategy', 'analysis'],
    body: 'Analyse {{competitor}} for a company selling {{product}}.\n\nCover:\n1. Who they clearly win with, and why\n2. Who they serve badly — the underserved segment\n3. Their pricing model and what it signals about their cost structure\n4. Three positioning angles we could take that they cannot copy quickly\n\nBe specific. If you lack information on a point, say so rather than speculating.',
  },
  {
    title: 'Pricing page rewrite',
    category: 'Business',
    tags: ['copywriting', 'conversion'],
    body: 'Rewrite this pricing page copy so each tier answers "is this me?" within three seconds:\n\n{{current_copy}}\n\nFor each tier give: a one-line audience descriptor, the single differentiating feature, and the strongest reason to upgrade from the tier below. Remove any feature that does not help the reader choose.',
  },
  {
    title: 'Launch announcement',
    category: 'Marketing',
    tags: ['launch', 'copywriting'],
    body: 'Write a launch announcement for {{product}}, which helps {{audience}} with {{problem}}.\n\nStructure: the problem in one concrete sentence, what we built, what changes for the user, and how to start.\n\nUnder 200 words. No hype adjectives. No fabricated metrics or customer quotes.',
  },
  {
    title: 'Ad copy variations',
    category: 'Marketing',
    tags: ['ads', 'testing'],
    body: 'Generate 5 ad variations for {{product}} targeting {{audience}}.\n\nEach must use a different angle: problem-agitation, outcome, curiosity, direct offer, and objection-first.\n\nFor each give a headline (under 40 characters), body (under 90 characters), and CTA. Note which angle you expect to win and why.',
  },
  {
    title: 'Cold outreach sequence',
    category: 'Sales',
    tags: ['outreach', 'email'],
    body: 'Write a 4-email cold sequence for {{product}} targeting {{role}} at {{company_type}}.\n\nEmail 1: a specific observation about their situation, one question.\nEmail 2: a relevant scenario, no pitch.\nEmail 3: the direct offer.\nEmail 4: a short, graceful close-out.\n\nEach under 120 words. Use {{placeholders}} rather than inventing details. No fake urgency.',
  },
  {
    title: 'Objection handling script',
    category: 'Sales',
    tags: ['objections', 'calls'],
    body: 'A prospect said: "{{objection}}"\n\nGive me:\n1. What they most likely mean underneath the stated objection\n2. The clarifying question to ask before responding\n3. A response that acknowledges the concern honestly and reframes around outcome\n4. The signal that tells me to disqualify instead of pushing',
  },
  {
    title: 'Article outline from a keyword',
    category: 'Content',
    tags: ['outline', 'blog'],
    body: 'Build a detailed article outline for the topic "{{topic}}" aimed at {{audience}}.\n\nInclude: an H1 making a specific promise, 4-6 H2 sections with one-line summaries, the concrete example or data point each section needs, and the three questions the article must answer to be genuinely useful.',
  },
  {
    title: 'Rewrite for clarity',
    category: 'Content',
    tags: ['editing', 'clarity'],
    body: 'Rewrite the following so it is clearer, without losing meaning or nuance:\n\n{{text}}\n\nRules: keep every factual qualifier, cut filler, prefer the active voice, break sentences over 25 words, and keep the author\'s voice. Show the rewrite first, then list what you changed and why.',
  },
  {
    title: 'Meta title and description set',
    category: 'SEO',
    tags: ['meta', 'serp'],
    body: 'Write 3 title tag and meta description pairs for a page about "{{topic}}" targeting the keyword "{{keyword}}".\n\nTitles under 60 characters, descriptions 140-155 characters. Each pair should take a different angle. Note which you would ship and why, based on likely search intent.',
  },
  {
    title: 'Internal linking plan',
    category: 'SEO',
    tags: ['links', 'structure'],
    body: 'Given these pages:\n\n{{page_list}}\n\nPropose an internal linking structure: which pages should be pillars, which should be clusters, the anchor text for each link, and any orphan pages that need inbound links. Explain the reasoning in two sentences.',
  },
  {
    title: 'Support macro set',
    category: 'Customer Support',
    tags: ['macros', 'templates'],
    body: 'Write support reply templates for these situations with {{product}}:\n\n1. The feature works as designed but the user expected otherwise\n2. A confirmed bug with no fix date yet\n3. A refund request outside policy\n4. A feature request we will not build\n\nEach: warm, under 100 words, honest about limitations, and ending with a concrete next step. Never promise timelines.',
  },
  {
    title: 'Escalation summary',
    category: 'Customer Support',
    tags: ['escalation', 'handoff'],
    body: 'Summarise this support conversation for an engineer picking it up cold:\n\n{{conversation}}\n\nGive: what the customer is trying to do, what actually happens, the exact reproduction steps stated, what has already been tried, and the single question the engineer needs answered. Quote error messages exactly.',
  },
  {
    title: 'Literature-style synthesis',
    category: 'Research',
    tags: ['synthesis', 'analysis'],
    body: 'Synthesise what is understood about {{topic}}.\n\nSeparate clearly: what is well established, what is actively contested, and what is unknown. For the contested parts, give the strongest version of each side. Flag anything where your knowledge may be outdated. Do not fabricate citations — describe findings generically instead.',
  },
  {
    title: 'Assumption audit',
    category: 'Research',
    tags: ['critique', 'rigour'],
    body: 'Here is my reasoning:\n\n{{argument}}\n\nList every assumption it rests on, marking each as safe, uncertain, or load-bearing-and-unverified. Then tell me which single assumption, if wrong, would most damage the conclusion, and how I could test it cheaply.',
  },
  {
    title: 'Weekly plan from a messy list',
    category: 'Productivity',
    tags: ['planning', 'prioritisation'],
    body: 'Here is everything on my plate:\n\n{{tasks}}\n\nOrganise it into a week: what must ship, what can slip, and what should be dropped entirely. Group by day, front-load the work with dependencies, and flag anything that looks like it is actually two tasks. Tell me what I am underestimating.',
  },
  {
    title: 'Meeting notes to actions',
    category: 'Productivity',
    tags: ['meetings', 'actions'],
    body: 'Convert these notes into a decision and action log:\n\n{{notes}}\n\nReturn: decisions made (with who decided), action items (owner, task, due date where stated), open questions with no owner, and anything discussed that was never resolved. Use only what is in the notes — write "not stated" where the notes are silent.',
  },
]
