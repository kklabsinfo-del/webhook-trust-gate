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
exports.verifyStripe = verifyStripe;
// stripe.ts content
const crypto = __importStar(require("crypto"));
const FIVE_MINUTES_MS = 5 * 60 * 1000;
function verifyStripe(payloadRaw, signatureHeader, secret) {
    const sigParts = signatureHeader.split(",");
    let timestamp = "";
    let signature = "";
    for (const part of sigParts) {
        const [key, value] = part.split("=");
        if (key === "t")
            timestamp = value;
        if (key === "v1")
            signature = value;
    }
    if (!timestamp || !signature)
        return { verified: false, eventId: "" };
    const timestampMs = parseInt(timestamp, 10) * 1000;
    const nowMs = Date.now();
    if (Math.abs(nowMs - timestampMs) > FIVE_MINUTES_MS)
        return { verified: false, eventId: "" };
    const signedPayload = `${timestamp}.${payloadRaw}`;
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(signedPayload, "utf8")
        .digest("hex");
    const verified = crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
    let eventId = "";
    try {
        const parsed = JSON.parse(payloadRaw);
        eventId = parsed.id;
    }
    catch { }
    return { verified, eventId };
}
