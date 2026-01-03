
# Webhook Trust Gate

**Verified, deduplicated, auditable webhook processing for GitHub Actions.**  

The Webhook Trust Gate turns incoming webhooks from Stripe and Razorpay into a **trusted, normalized, and provable source of truth** inside your CI/CD workflows. Once integrated, it becomes **structurally unavoidable**, ensuring downstream steps cannot execute without verified webhooks.

---

## 🚀 Features

- **Fail-Closed Verification**: Workflow stops immediately if a webhook fails signature verification or is a duplicate.  
- **Multi-Provider Support**: Stripe and Razorpay with normalization into a common schema.  
- **Idempotency**: Prevents replay attacks using provider-native Event IDs.  
- **Tamper-Evident Ledger**: Git branch ledger with SHA-256 proof of every verified event.  
- **Step Summary Proof**: Human-readable certificate of authenticity in GitHub Actions UI.  
- **Enterprise-Ready**: Can be combined with GitHub Environment Protection rules for production workflows.  
- **Zero External Infrastructure**: Fully runs in GitHub Actions without servers, databases, or middleware.  

---

## 🛠 Usage

```yaml
steps:
  - uses: actions/checkout@v3

  - name: Run Webhook Trust Gate
    uses: your-username/webhook-trust-gate@v1.0.0
    with:
      provider: "stripe"
      payload: ${{ github.event.body }}
      signature: ${{ github.event.headers['stripe-signature'] }}
      secret: ${{ secrets.STRIPE_SECRET }}
      ledger_branch: "webhook-ledger"
```

---

## ⚡ Outputs

| Name | Description |
|------|-------------|
| `event_id` | Provider-native unique event ID |
| `event_hash` | SHA-256 hash of the normalized event |
| `normalized_event` | JSON of the normalized event |

---

## 🔒 Security & Audit

The Webhook Trust Gate is **not optional**; it is a **mandatory trust layer** in your workflow.

### 1. Tamper-Evident Ledger
- Appends each verified webhook to a Git branch.
- Commit includes SHA-256 hash, Event ID, timestamp.
- Append-only history ensures any forced rewrite triggers alerts.
- Acts as a cryptographic audit trail.

### 2. Fail-Closed Design
- Invalid or duplicate webhooks **fail the workflow immediately**.
- Downstream steps that rely on normalized output **cannot execute without verification**.
- Guarantees structural lock-in for critical workflows.

### 3. Step Summary — Certificate of Authenticity
Every run produces a readable certificate in the GitHub UI:

```
Verified by Trust Gate
• Provider: Stripe
• Event ID: evt_12345
• Hash: 8f32...a1b2
• Status: ✅ IRREVERSIBLE
```

### 4. Environment Protection Integration
- Combine with GitHub Environments:
  - Verification environment runs the Trust Gate.
  - Production environment runs downstream jobs only if verification succeeds.
- Prevents bypass even by admins.

### 5. Idempotency & Deduplication
- Provider-native IDs as idempotency keys.
- Cache + ledger ensures no replay attacks.

### 6. Zero External Infrastructure
- Runs entirely in GitHub Actions.
- Ledger + cache provide permanent, auditable proof **without extra servers or DBs**.

---

## 📄 Example Ledger Entry

```
2026-01-03T08:15:22Z | evt_12345 | 8f32c2e1a9b7d8c1e5d4f9b6a2c7d8e1f3b4a5c6d7e8f9a0b1c2d3e4f5a6b7c8
```

---

## ✅ Strategic Impact

- GitHub Actions is elevated from a sidecar tool to **primary validator** of business-critical events.  
- Structural lock-in + auditability makes skipping the Trust Gate **costly and risky**.  
- Enterprises can pay a premium for the **security, compliance, and audit certainty** it provides.
