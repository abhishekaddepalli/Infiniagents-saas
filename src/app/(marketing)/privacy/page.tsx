import { LegalLayout, Section } from '../legal-layout'

export const metadata = { title: 'Privacy Policy' }
export const dynamic = 'force-dynamic'

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="Replace with your own date">
      <Section title="1. What we collect">
        <p>
          This application stores your name, email address, and a hashed password; the agents, automations, and
          conversations you create; and a usage record for each AI request containing the model used, token counts,
          and estimated cost.
        </p>
      </Section>
      <Section title="2. AI provider API keys">
        <p>
          Provider API keys you save are encrypted with AES-256-GCM before being written to the database and are
          never returned to the browser. Only a masked hint is displayed in the interface.
        </p>
      </Section>
      <Section title="3. Third-party processing">
        <p>
          Prompts and conversation content are sent to the AI provider selected for each agent — for example OpenAI,
          Google, or Anthropic. List the providers you actually enable and link to their privacy policies and data
          retention terms.
        </p>
      </Section>
      <Section title="4. Retention and deletion">
        <p>
          Describe how long you keep conversations, execution history, and usage records, and what happens to that
          data when an account is deleted.
        </p>
      </Section>
      <Section title="5. Your rights">
        <p>
          Set out how users can access, export, correct, or delete their data, and add any GDPR, CCPA, or other
          obligations that apply where you operate.
        </p>
      </Section>
      <Section title="6. Cookies">
        <p>
          This application sets one httpOnly cookie to keep you signed in. Add details of any analytics or marketing
          cookies you introduce.
        </p>
      </Section>
    </LegalLayout>
  )
}
