# Webhook Trust Gate

![Version](https://img.shields.io/github/v/release/kklabsinfo-del/webhook-trust-gate)
![License](https://img.shields.io/github/license/kklabsinfo-del/webhook-trust-gate)
[![Marketplace](https://img.shields.io/badge/Marketplace-Webhook%20Trust%20Gate-blue?logo=github)](https://github.com/marketplace/actions/webhook-trust-gate)

> **⚠️ Security Notice**: If you're using v1.0.2 or earlier, please upgrade to v1.0.3+ immediately. 
> A critical bug in earlier versions allowed duplicate webhooks to corrupt the audit ledger. 
> [Read more →](https://github.com/kklabsinfo-del/webhook-trust-gate/releases/tag/v1.0.3)

**Verified, deduplicated, auditable webhook processing for GitHub Actions.**

The Webhook Trust Gate turns incoming webhooks from Stripe and Razorpay into a trusted, normalized, and provable source of truth inside your CI/CD workflows. Once integrated, it becomes structurally unavoidable, ensuring downstream steps cannot execute without verified webhooks.

---

## 🚀 Features

* **Fail-Closed Verification**: Workflow stops immediately if a webhook fails signature verification or is a duplicate
* **Multi-Provider Support**: Stripe and Razorpay with normalization into a common schema
* **Idempotency**: Prevents replay attacks using provider-native Event IDs
* **Tamper-Evident Ledger**: Git branch ledger with SHA-256 proof of every verified event
* **Step Summary Proof**: Human-readable certificate of authenticity in GitHub Actions UI
* **Enterprise-Ready**: Can be combined with GitHub Environment Protection rules for production workflows
* **Zero External Infrastructure**: Fully runs in GitHub Actions without servers, databases, or middleware

---

## 📦 Installation

### Recommended (Auto-updates to latest v1.x.x)
```yaml
- uses: kklabsinfo-del/webhook-trust-gate@v1
```

### Pinned Version
```yaml
- uses: kklabsinfo-del/webhook-trust-gate@v1.0.3
```

> **Note**: Using `@v1` is recommended as it automatically receives security patches and bug fixes while maintaining backward compatibility.

---

## 🛠 Usage

### Basic Example

```yaml
name: Process Stripe Webhook

on:
  workflow_dispatch:
  repository_dispatch:
    types: [webhook]

jobs:
  verify-webhook:
    runs-on: ubuntu-latest
    permissions:
      contents: write  # Required for ledger commits
    
    steps:
      - uses: actions/checkout@v3

      - name: Run Webhook Trust Gate
        uses: kklabsinfo-del/webhook-trust-gate@v1
        with:
          provider: "stripe"
          payload: ${{ github.event.client_payload.body }}
          signature: ${{ github.event.client_payload.signature }}
          secret: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
          ledger_branch: "webhook-ledger"
```

### Razorpay Example

```yaml
- name: Verify Razorpay Webhook
  uses: kklabsinfo-del/webhook-trust-gate@v1
  with:
    provider: "razorpay"
    payload: ${{ github.event.client_payload.body }}
    signature: ${{ github.event.client_payload.signature }}
    secret: ${{ secrets.RAZORPAY_WEBHOOK_SECRET }}
    ledger_branch: "webhook-ledger"
```

### Using Outputs in Downstream Steps

```yaml
- name: Verify Webhook
  id: verify
  uses: kklabsinfo-del/webhook-trust-gate@v1
  with:
    provider: "stripe"
    payload: ${{ github.event.client_payload.body }}
    signature: ${{ github.event.client_payload.signature }}
    secret: ${{ secrets.STRIPE_WEBHOOK_SECRET }}

- name: Process Verified Event
  run: |
    echo "Event ID: ${{ steps.verify.outputs.event_id }}"
    echo "Hash: ${{ steps.verify.outputs.event_hash }}"
    echo "Normalized: ${{ steps.verify.outputs.normalized_event }}"
```

---

## ⚙️ Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `provider` | Yes | - | Webhook provider (`stripe` or `razorpay`) |
| `payload` | Yes | - | Raw webhook JSON payload |
| `signature` | Yes | - | Webhook signature header |
| `secret` | Yes | - | Webhook secret (from provider dashboard) |
| `ledger_branch` | No | `webhook-ledger` | Git branch to store the ledger |
| `skip_signature` | No | `false` | Skip signature verification (for local testing only) |

---

## ⚡ Outputs

| Output | Description |
|--------|-------------|
| `event_id` | Provider-native unique event ID (e.g., `evt_1234` for Stripe) |
| `event_hash` | SHA-256 hash of the normalized event |
| `normalized_event` | JSON string of the normalized event with consistent schema |

### Normalized Event Schema

**Stripe:**
```json
{
  "provider": "stripe",
  "id": "evt_1234",
  "type": "payment_intent.succeeded",
  "created": 1670000000,
  "data": { "object": {...} }
}
```

**Razorpay:**
```json
{
  "provider": "razorpay",
  "id": "pay_1234",
  "event": "payment.captured",
  "created_at": 1670000000,
  "data": { "payment": {...} }
}
```

---

## 🔒 Security & Audit

The Webhook Trust Gate is not optional; it is a **mandatory trust layer** in your workflow.

### 1. Tamper-Evident Ledger

* Appends each verified webhook to a Git branch
* Commit includes SHA-256 hash, Event ID, and timestamp
* Append-only history ensures any forced rewrite triggers alerts
* Acts as a cryptographic audit trail

**Example Ledger Entry:**
```
2026-01-03T16:38:05.625Z | evt_test_123 | cdd234fdb16750733809f9db5892fc2f9ba8fa2398df7ddfcafab528e5316316
```

### 2. Fail-Closed Design

* Invalid or duplicate webhooks fail the workflow immediately
* Downstream steps that rely on normalized output cannot execute without verification
* Guarantees structural lock-in for critical workflows

### 3. Step Summary — Certificate of Authenticity

Every run produces a readable certificate in the GitHub UI:

```
✅ Webhook Trust Proof
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event ID     : evt_12345
SHA-256 Hash : 8f32...a1b2
Status       : VERIFIED ✅

This proof uniquely identifies the verified webhook event.
```

### 4. Environment Protection Integration

Combine with GitHub Environments for multi-stage security:

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    environment: verification
    steps:
      - uses: kklabsinfo-del/webhook-trust-gate@v1
        # ... verification steps

  process:
    needs: verify
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - name: Process payment
        # ... only runs after verification succeeds
```

This prevents bypass even by repository admins.

### 5. Idempotency & Deduplication

* Provider-native IDs as idempotency keys
* Cache + ledger ensures no replay attacks
* Duplicate webhooks are **completely blocked** from ledger writes (fixed in v1.0.3)

### 6. Zero External Infrastructure

* Runs entirely in GitHub Actions
* Ledger + cache provide permanent, auditable proof without extra servers or databases
* No ongoing infrastructure costs

---

## 🧪 Local Testing

You can test the action locally without signature verification:

```javascript
// test-local.js
const { execSync } = require('child_process');

process.env.SKIP_SIGNATURE = 'true';

const payload = JSON.stringify({
  id: 'evt_test_123',
  type: 'payment_intent.succeeded',
  data: { object: {} },
  created: 1670000000
});

execSync('node dist/index.js', {
  env: {
    ...process.env,
    INPUT_PROVIDER: 'stripe',
    INPUT_PAYLOAD: payload,
    INPUT_SIGNATURE: 'test',
    INPUT_SECRET: 'test',
    INPUT_SKIP_SIGNATURE: 'true'
  },
  stdio: 'inherit'
});
```

Run with:
```bash
npm run build
node test-local.js
```

**Clean test environment:**
```bash
rm -rf ledger.log .webhook-dedupe
```

---

## 📊 Example Workflows

### Complete Production Example

```yaml
name: Stripe Webhook Handler

on:
  repository_dispatch:
    types: [stripe_webhook]

jobs:
  verify-and-process:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    concurrency:
      group: webhook-ledger
      cancel-in-progress: false
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Verify Webhook
        id: verify
        uses: kklabsinfo-del/webhook-trust-gate@v1
        with:
          provider: "stripe"
          payload: ${{ github.event.client_payload.body }}
          signature: ${{ github.event.client_payload.signature }}
          secret: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
          ledger_branch: "webhook-ledger"

      - name: Parse Event
        id: parse
        run: |
          EVENT='${{ steps.verify.outputs.normalized_event }}'
          echo "type=$(echo $EVENT | jq -r '.type')" >> $GITHUB_OUTPUT
          echo "amount=$(echo $EVENT | jq -r '.data.object.amount')" >> $GITHUB_OUTPUT

      - name: Update Database
        if: steps.parse.outputs.type == 'payment_intent.succeeded'
        run: |
          # Your database update logic
          echo "Processing payment of ${{ steps.parse.outputs.amount }}"

      - name: Send Notification
        if: steps.parse.outputs.type == 'payment_intent.succeeded'
        run: |
          # Send email, Slack notification, etc.
          echo "Payment verified and recorded in ledger"
```

### Multi-Environment Setup

```yaml
name: Webhook Processing (Multi-Stage)

on:
  repository_dispatch:
    types: [webhook]

jobs:
  verify:
    runs-on: ubuntu-latest
    environment: verification
    permissions:
      contents: write
    outputs:
      event_id: ${{ steps.gate.outputs.event_id }}
      event_hash: ${{ steps.gate.outputs.event_hash }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Trust Gate
        id: gate
        uses: kklabsinfo-del/webhook-trust-gate@v1
        with:
          provider: ${{ github.event.client_payload.provider }}
          payload: ${{ github.event.client_payload.body }}
          signature: ${{ github.event.client_payload.signature }}
          secret: ${{ secrets.WEBHOOK_SECRET }}

  process:
    needs: verify
    runs-on: ubuntu-latest
    environment: production  # Requires approval
    
    steps:
      - name: Process Verified Event
        run: |
          echo "Processing event: ${{ needs.verify.outputs.event_id }}"
          echo "Hash proof: ${{ needs.verify.outputs.event_hash }}"
```

---

## 🔧 Troubleshooting

### Webhook Verification Fails

**Error:** `Webhook signature verification failed`

**Solutions:**
1. Verify you're using the correct secret from your provider dashboard
2. Ensure the payload is passed as raw JSON (not parsed)
3. Check that the signature header matches provider format:
   - Stripe: `stripe-signature`
   - Razorpay: `x-razorpay-signature`

### Duplicate Detection Issues

**Error:** `Duplicate webhook detected`

This is **expected behavior** for duplicate webhooks. The action successfully blocked a replay attack.

To reset deduplication (testing only):
```bash
# Delete GitHub Actions cache
gh cache delete <cache-key>

# Or wait 7 days for automatic expiration
```

### Ledger Push Failures

**Error:** `failed to push some refs`

**Solutions:**
1. Ensure workflow has `contents: write` permission
2. Add concurrency control to prevent simultaneous pushes:
   ```yaml
   concurrency:
     group: webhook-ledger
     cancel-in-progress: false
   ```

### Permission Denied on Ledger Branch

Ensure your workflow has the correct permissions:

```yaml
permissions:
  contents: write  # Required for git push
```

---

## 📋 Changelog

### v1.0.3 (2026-01-03) - **Current**
- 🐛 **Critical Fix**: Duplicate webhooks no longer corrupt ledger
- ✅ Fixed deduplication logic to exit early on duplicate detection
- ✅ Added filesystem-based fallback for GitHub Actions cache API
- ✅ Added `provider` field to normalized events for consistency
- ✅ Enhanced retry logic in ledger writes with exponential backoff
- ✅ Improved local testing with persistent `.webhook-dedupe` directory

### v1.0.2 (2026-01-03)
- 🚀 Initial marketplace release
- ✅ Stripe and Razorpay webhook verification
- ✅ Git-based tamper-evident ledger
- ✅ Idempotency checks
- ✅ Step summary proofs

[Full Changelog →](https://github.com/kklabsinfo-del/webhook-trust-gate/releases)

---

## 💡 Use Cases

### Fintech & Payment Processing
- Verify Stripe/Razorpay webhooks before updating payment status
- Maintain cryptographic proof of all payment events
- Meet SOC2/ISO27001 audit requirements

### SaaS Subscription Management
- Process subscription changes with verified webhooks
- Prevent duplicate billing events
- Audit trail for compliance

### E-commerce Order Processing
- Verify payment confirmations before fulfillment
- Track refunds and chargebacks with tamper-evident logs
- Integrate with inventory systems safely

### Enterprise Compliance
- Immutable audit logs for financial transactions
- Cryptographic proof for regulatory audits
- Zero-trust webhook verification

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/kklabsinfo-del/webhook-trust-gate.git
cd webhook-trust-gate

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Local testing
node test-local.js
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- [GitHub Marketplace](https://github.com/marketplace/actions/webhook-trust-gate)
- [Report Issues](https://github.com/kklabsinfo-del/webhook-trust-gate/issues)
- [Discussions](https://github.com/kklabsinfo-del/webhook-trust-gate/discussions)
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Razorpay Webhooks Documentation](https://razorpay.com/docs/webhooks)

---

## 💬 Support

- 📖 [Documentation](https://github.com/kklabsinfo-del/webhook-trust-gate#readme)
- 💬 [GitHub Discussions](https://github.com/kklabsinfo-del/webhook-trust-gate/discussions)
- 🐛 [Report Bug](https://github.com/kklabsinfo-del/webhook-trust-gate/issues/new?template=bug_report.md)
- ✨ [Request Feature](https://github.com/kklabsinfo-del/webhook-trust-gate/issues/new?template=feature_request.md)

---

## ⭐ Show Your Support

If this project helped you, please consider giving it a ⭐ on GitHub!

---

**Built with ❤️ for secure, auditable webhook processing**

## 💖 Support This Project

If Webhook Trust Gate saves your team time, consider sponsoring:

[Become a Sponsor](https://github.com/sponsors/kklabsinfo-del)
