// stripe.ts content
import * as crypto from "crypto";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function verifyStripe(
  payloadRaw: string,
  signatureHeader: string,
  secret: string
): { verified: boolean; eventId: string } {
  const sigParts = signatureHeader.split(",");
  let timestamp = "";
  let signature = "";

  for (const part of sigParts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signature = value;
  }

  if (!timestamp || !signature) return { verified: false, eventId: "" };

  const timestampMs = parseInt(timestamp, 10) * 1000;
  const nowMs = Date.now();
  if (Math.abs(nowMs - timestampMs) > FIVE_MINUTES_MS)
    return { verified: false, eventId: "" };

  const signedPayload = `${timestamp}.${payloadRaw}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  const verified = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );

  let eventId = "";
  try {
    const parsed = JSON.parse(payloadRaw);
    eventId = parsed.id;
  } catch {}

  return { verified, eventId };
}
