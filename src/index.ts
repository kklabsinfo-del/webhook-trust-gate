import * as core from "@actions/core";
import { verifyStripe } from "./providers/stripe";
import { verifyRazorpay } from "./providers/razorpay";
import { checkAndMarkEvent } from "./store/dedupe";
import { writeLedger } from "./store/ledger";
import { normalizeEvent } from "./util/normalize";
import { hashEvent } from "./util/hash";
import { writeSummary } from "./util/summary";

async function run(): Promise<void> {
  try {
    const provider = core.getInput("provider", { required: true });
    const payloadRaw = core.getInput("payload", { required: true });
    const signature = core.getInput("signature", { required: true });
    const secret = core.getInput("secret", { required: true });
    const ledgerBranch = core.getInput("ledger_branch") || "webhook-ledger";
    const skipSignatureInput = core.getInput("skip_signature") || "false";
    const skipSignature = skipSignatureInput.toLowerCase() === "true";

    const payload = JSON.parse(payloadRaw);

    let verified: boolean = false;
    let providerEventId: string;

    if (skipSignature) {
      console.log("⚡ Skipping signature verification (local/test)");
      providerEventId = payload.id || payload.entity || `local_${Date.now()}`;
      verified = true;
    } else {
      switch (provider) {
        case "stripe": {
          const res = verifyStripe(payloadRaw, signature, secret);
          verified = res.verified;
          providerEventId = res.eventId;
          break;
        }
        case "razorpay": {
          const res = verifyRazorpay(payloadRaw, signature, secret);
          verified = res.verified;
          providerEventId = res.eventId;
          break;
        }
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      if (!verified) throw new Error("Webhook signature verification failed");
    }

    const firstSeen = await checkAndMarkEvent(providerEventId);
    if (!firstSeen) throw new Error(`Duplicate webhook detected: ${providerEventId}`);

    const normalized = normalizeEvent(provider, payload);
    const eventHash = hashEvent(normalized);

    await writeLedger({
      branch: ledgerBranch,
      eventId: providerEventId,
      hash: eventHash,
      timestamp: new Date().toISOString(),
    });

    writeSummary(providerEventId, eventHash);

    core.setOutput("event_id", providerEventId);
    core.setOutput("event_hash", eventHash);
    core.setOutput("normalized_event", JSON.stringify(normalized));
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
