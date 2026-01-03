// dedupe.ts content
import * as cache from "@actions/cache";
import * as crypto from "crypto";

const CACHE_PREFIX = "webhook-event";

export async function checkAndMarkEvent(eventId: string): Promise<boolean> {
  if (!eventId) throw new Error("Missing provider event ID");

  const key = `${CACHE_PREFIX}-${hash(eventId)}`;

  try {
    await cache.restoreCache([], key);
    return false; // already seen
  } catch {
    await cache.saveCache([], key);
    return true; // first time
  }
}

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
