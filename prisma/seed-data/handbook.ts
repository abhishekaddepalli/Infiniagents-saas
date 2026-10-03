/**
 * Sample knowledge base content.
 *
 * Indexed into the demo workspace's "Product Handbook" so retrieval-augmented
 * answers work out of the box. Replace this with your own documentation, or
 * delete it and upload files from the Knowledge screen instead.
 */
export const handbook = `# Support Handbook

## Billing and plans

We bill monthly on the date you subscribed. Annual plans are billed once and
include two months free compared with paying monthly.

Upgrades take effect immediately and are prorated for the remainder of the
billing period. Downgrades take effect at the end of the current period, so you
keep the higher limits until then.

We accept all major credit and debit cards. Customers in India can also pay by
UPI and net banking through Razorpay.

## Refund policy

We offer a full refund within 14 days of a first purchase, no questions asked.
After 14 days, refunds are prorated for the unused portion of an annual plan.
Monthly plans are not refunded after the 14 day window, but you can cancel at
any time and keep access until the period ends.

Refunds are returned to the original payment method and typically take five to
ten business days to appear.

## Usage limits

Every plan includes a monthly allowance of AI requests. The allowance resets on
the first day of each calendar month, not on your billing date.

When you reach the limit, new AI requests are blocked until the next reset or
until you upgrade. Existing agents and automations are not deleted, and your
data is never removed for exceeding a limit.

Agent and automation counts are limits on how many you may have at once, not on
how many you may create over time. Deleting an agent frees the slot immediately.

## Data and privacy

Prompts and conversation content are sent to the AI provider selected for each
agent, so their data retention terms apply to that content.

API keys you save are encrypted before being stored, and are never shown again
after saving. If you lose a key, revoke it and issue a new one.

Deleting your account removes your workspaces, agents, automations, conversation
history and usage records. This cannot be undone.

## Getting help

Support is available by email for all plans. Pro and Business plans receive
priority handling. Include your workspace name and, where relevant, the
execution ID from the run that failed — it is the fastest way for us to find
the problem.

We do not offer phone support.

## Troubleshooting common issues

If an agent returns an error mentioning the API key, the key is either wrong,
revoked, or the provider account has run out of credit. Check it under
Settings, then use Test Connection.

If a workflow stops partway through, open the execution in your history — the
step trace shows exactly which node failed and what it returned.

If costs appear as zero, the model is missing from the model catalog, or its
price is set to zero. Costs are calculated from those stored prices.
`
