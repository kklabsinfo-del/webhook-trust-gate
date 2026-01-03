
# Security Policy — Webhook Trust Gate

## 🛡 Overview

The **Webhook Trust Gate** is a **security-critical component** in CI/CD workflows. It acts as the primary validator for Stripe and Razorpay webhooks.  

Because downstream jobs rely on this Action for **trusted, deduplicated, and normalized events**, security issues can directly impact:

- Financial transactions  
- Deployment workflows  
- Audit compliance  

This document outlines how we handle **vulnerabilities, responsible disclosure, and user guidance**.

---

## 📢 Reporting a Vulnerability

If you discover a security issue:

1. Email **security@yourdomain.com** with:
   - Subject: `[Security] Webhook Trust Gate`
   - Description of the issue
   - Steps to reproduce
   - Suggested impact

2. Do **not** open a public issue — all security reports are handled confidentially.  

3. We will acknowledge receipt within **24 hours** and provide an estimated timeline for resolution.

---

## 🔐 Supported Security Features

### 1. Signature Verification
- All webhooks are verified using provider-specific cryptographic signatures.  
- Verification is done **locally**, preventing any reliance on external networks.  

### 2. Idempotency & Replay Protection
- Provider-native Event IDs are used to prevent duplicate processing.  
- Duplicate or replayed events **fail the workflow immediately**.

### 3. Ledger & Audit Trail
- Ledger branch provides an **immutable, append-only record** of every verified event.  
- SHA-256 hash proof ensures tamper-evidence.

### 4. Step Summary Certificate
- Each run produces a **Certificate of Authenticity** visible in GitHub Actions UI.  
- Auditors can confirm proof without parsing logs.

### 5. Fail-Closed Execution
- Any verification failure stops the workflow.  
- Downstream jobs cannot execute without successful verification, ensuring structural lock-in.

---

## ⚠ Recommendations for Enterprise Users

1. **Pin to a release SHA** in your workflow to prevent unverified updates.  
2. **Use GitHub Environment Protection Rules**:  
   - Trust Gate runs in a “Verification” environment.  
   - Downstream production jobs require verification success.  
3. **Secure secrets**: Store provider secrets (`STRIPE_SECRET`, `RAZORPAY_SECRET`) in GitHub Secrets.  
4. **Ledger branch protection**: Mark ledger branch as protected, append-only, and require reviews to maintain integrity.  

---

## 📝 Versioning & Patch Policy

- Major releases (`v2.x.x`) may introduce breaking changes.  
- Minor and patch releases (`v1.x.x`) maintain backward compatibility and security fixes.  
- Users should always pin a **specific SHA or version tag** for maximum trust.

---

## 🔗 References

- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)  
- [Stripe Webhook Security](https://stripe.com/docs/webhooks/signatures)  
- [Razorpay Webhook Security](https://razorpay.com/docs/webhooks/)
