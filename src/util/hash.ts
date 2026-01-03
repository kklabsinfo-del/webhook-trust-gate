import * as crypto from "crypto";

export function hashEvent(event: any): string {
  const serialized = JSON.stringify(event);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}
