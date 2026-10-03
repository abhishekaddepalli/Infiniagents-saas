import { LegalLayout, Section } from '../legal-layout'

export const metadata = { title: 'Terms of Service' }
export const dynamic = 'force-dynamic'

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="Replace with your own date">
      <Section title="1. Acceptance">
        <p>
          By creating an account you agree to these terms. If you do not agree, do not use the service. Describe
          here who may open an account and any age or jurisdiction restrictions that apply to your product.
        </p>
      </Section>
      <Section title="2. Your account">
        <p>
          You are responsible for keeping your credentials secure and for all activity under your account. Set out
          here what happens if you suspect unauthorised access, and how accounts can be suspended or closed.
        </p>
      </Section>
      <Section title="3. Acceptable use">
        <p>
          Describe what users may not do with the service — for example generating unlawful content, attempting to
          bypass usage limits, or reselling access. Reference the acceptable use policies of the AI providers you
          route requests to, since your users are bound by those as well.
        </p>
      </Section>
      <Section title="4. AI-generated content">
        <p>
          Explain that model output can be inaccurate and should be reviewed before it is relied on or published,
          and state who owns the output under your terms.
        </p>
      </Section>
      <Section title="5. Plans, limits and billing">
        <p>
          Set out your pricing, what each plan includes, how limits are enforced, your renewal and cancellation
          terms, and your refund policy.
        </p>
      </Section>
      <Section title="6. Liability and changes">
        <p>
          Include your warranty disclaimer and limitation of liability, and explain how you will notify users when
          these terms change.
        </p>
      </Section>
    </LegalLayout>
  )
}
