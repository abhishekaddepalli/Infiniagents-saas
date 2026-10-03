/**
 * Subscription plans. Prices and limits are stored in the database and edited
 * from Admin → Plans, so a buyer can change them without a redeploy.
 * A limit of -1 means unlimited.
 */
export type SeedPlan = {
  name: string
  slug: string
  description: string
  priceMonthly: number
  priceYearly: number
  maxAgents: number
  maxRequests: number
  maxAutomations: number
  maxMembers: number
  maxDocuments: number
  features: string[]
  highlighted: boolean
  sortOrder: number
}

export const plans: SeedPlan[] = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Try the platform and build your first agent.',
    priceMonthly: 0,
    priceYearly: 0,
    maxAgents: 3,
    maxRequests: 100,
    maxAutomations: 1,
    maxMembers: 1,
    maxDocuments: 10,
    features: ['3 AI agents', '100 AI requests / month', '1 automation', 'All agent templates', 'Community support', '1 team member', '10 knowledge documents'],
    highlighted: false,
    sortOrder: 1,
  },
  {
    name: 'Starter',
    slug: 'starter',
    description: 'For solo builders shipping their first automations.',
    priceMonthly: 19,
    priceYearly: 190,
    maxAgents: 10,
    maxRequests: 2000,
    maxAutomations: 10,
    maxMembers: 3,
    maxDocuments: 100,
    features: ['10 AI agents', '2,000 AI requests / month', '10 automations', 'Webhook triggers', 'Execution history', 'Email support', '3 team members', '100 knowledge documents'],
    highlighted: false,
    sortOrder: 2,
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'For teams running AI workflows in production.',
    priceMonthly: 49,
    priceYearly: 490,
    maxAgents: 50,
    maxRequests: 10000,
    maxAutomations: -1,
    maxMembers: 10,
    maxDocuments: 1000,
    features: ['50 AI agents', '10,000 AI requests / month', 'Unlimited automations', 'All AI providers', 'Advanced usage analytics', 'Priority support', '10 team members', '1,000 knowledge documents'],
    highlighted: true,
    sortOrder: 3,
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'Custom limits and dedicated support for larger teams.',
    priceMonthly: 149,
    priceYearly: 1490,
    maxAgents: -1,
    maxRequests: -1,
    maxAutomations: -1,
    maxMembers: -1,
    maxDocuments: -1,
    features: ['Unlimited agents', 'Unlimited AI requests', 'Unlimited automations', 'Custom model pricing', 'Dedicated support', 'Onboarding assistance', 'Unlimited team members', 'Unlimited knowledge documents'],
    highlighted: false,
    sortOrder: 4,
  },
]
