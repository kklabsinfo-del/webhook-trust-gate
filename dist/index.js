"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const stripe_1 = require("./providers/stripe");
const razorpay_1 = require("./providers/razorpay");
const dedupe_1 = require("./store/dedupe");
const ledger_1 = require("./store/ledger");
const normalize_1 = require("./util/normalize");
const hash_1 = require("./util/hash");
const summary_1 = require("./util/summary");
async function run() {
    try {
        const provider = core.getInput("provider", { required: true });
        const payloadRaw = core.getInput("payload", { required: true });
        const signature = core.getInput("signature", { required: true });
        const secret = core.getInput("secret", { required: true });
        const ledgerBranch = core.getInput("ledger_branch") || "webhook-ledger";
        const skipSignatureInput = core.getInput("skip_signature") || "false";
        const skipSignature = skipSignatureInput.toLowerCase() === "true";
        const payload = JSON.parse(payloadRaw);
        let verified = false;
        let providerEventId;
        if (skipSignature) {
            console.log("⚡ Skipping signature verification (local/test)");
            providerEventId = payload.id || payload.entity || `local_${Date.now()}`;
            verified = true;
        }
        else {
            switch (provider) {
                case "stripe": {
                    const res = (0, stripe_1.verifyStripe)(payloadRaw, signature, secret);
                    verified = res.verified;
                    providerEventId = res.eventId;
                    break;
                }
                case "razorpay": {
                    const res = (0, razorpay_1.verifyRazorpay)(payloadRaw, signature, secret);
                    verified = res.verified;
                    providerEventId = res.eventId;
                    break;
                }
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
            if (!verified)
                throw new Error("Webhook signature verification failed");
        }
        const firstSeen = await (0, dedupe_1.checkAndMarkEvent)(providerEventId);
        if (!firstSeen)
            throw new Error(`Duplicate webhook detected: ${providerEventId}`);
        const normalized = (0, normalize_1.normalizeEvent)(provider, payload);
        const eventHash = (0, hash_1.hashEvent)(normalized);
        await (0, ledger_1.writeLedger)({
            branch: ledgerBranch,
            eventId: providerEventId,
            hash: eventHash,
            timestamp: new Date().toISOString(),
        });
        (0, summary_1.writeSummary)(providerEventId, eventHash);
        core.setOutput("event_id", providerEventId);
        core.setOutput("event_hash", eventHash);
        core.setOutput("normalized_event", JSON.stringify(normalized));
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
