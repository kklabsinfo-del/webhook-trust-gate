import * as cache from "@actions/cache";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const CACHE_PREFIX = "webhook-event";
const MARKER_DIR = ".webhook-dedupe";

/**
 * Checks if an event has been seen before and marks it as seen.
 * Returns true if this is the first time seeing the event (not a duplicate).
 * Returns false if this is a duplicate event.
 */
export async function checkAndMarkEvent(eventId: string): Promise<boolean> {
  if (!eventId) throw new Error("Missing provider event ID");

  const eventHash = hash(eventId);
  const cacheKey = `${CACHE_PREFIX}-${eventHash}`;
  const markerFile = path.join(MARKER_DIR, eventHash);

  // Check if running in local/test mode
  const isLocal = process.env.SKIP_SIGNATURE === "true";

  if (isLocal) {
    // Local mode: use file-based deduplication
    return checkLocalDedupe(markerFile, eventId);
  }

  // GitHub Actions mode: use cache API
  return checkCacheDedupe(cacheKey, markerFile, eventId);
}

/**
 * Local/test mode: Check for duplicates using the filesystem
 */
function checkLocalDedupe(markerFile: string, eventId: string): boolean {
  // Ensure marker directory exists
  const markerDir = path.dirname(markerFile);
  if (!fs.existsSync(markerDir)) {
    fs.mkdirSync(markerDir, { recursive: true });
  }

  // Check if marker file exists
  if (fs.existsSync(markerFile)) {
    console.log(`🔴 Duplicate detected (local): ${eventId}`);
    return false; // Duplicate
  }

  // Create marker file with timestamp
  fs.writeFileSync(markerFile, new Date().toISOString(), { encoding: "utf8" });
  console.log(`✅ First occurrence (local): ${eventId}`);
  return true; // First time
}

/**
 * GitHub Actions mode: Check for duplicates using cache API
 */
async function checkCacheDedupe(
  cacheKey: string,
  markerFile: string,
  eventId: string
): Promise<boolean> {
  // Ensure marker directory exists
  const markerDir = path.dirname(markerFile);
  if (!fs.existsSync(markerDir)) {
    fs.mkdirSync(markerDir, { recursive: true });
  }

  try {
    // Try to restore from cache
    const cacheHit = await cache.restoreCache([markerFile], cacheKey);

    if (cacheHit) {
      console.log(`🔴 Duplicate detected (cache): ${eventId}`);
      return false; // Duplicate
    }

    // Not in cache - this is the first occurrence
    // Create marker file and save to cache
    fs.writeFileSync(markerFile, new Date().toISOString(), { encoding: "utf8" });
    await cache.saveCache([markerFile], cacheKey);

    console.log(`✅ First occurrence (cache): ${eventId}`);
    return true; // First time
  } catch (error: any) {
    // Cache API might fail in some scenarios (rate limits, permissions)
    // Fall back to filesystem check
    console.warn(`⚠️ Cache API error, falling back to filesystem: ${error.message}`);
    return checkLocalDedupe(markerFile, eventId);
  }
}

/**
 * Hash the event ID to create a safe cache key
 */
function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}