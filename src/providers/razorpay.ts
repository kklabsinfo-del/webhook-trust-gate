import * as crypto from "crypto";

export function verifyRazorpay(
  payloadRaw: string,
  signatureHeader: string,
  secret: string
): { verified: boolean; eventId: string } {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadRaw, "utf8")
    .digest("hex");

  const verified = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signatureHeader)
  );

  let eventId = "";
  try {
    const parsed = JSON.parse(payloadRaw);
    eventId =
      parsed?.payload?.payment?.entity?.id ||
      parsed?.payload?.order?.entity?.id ||
      "";
  } catch {}

  return { verified, eventId };
}
