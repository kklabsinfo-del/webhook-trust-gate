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
exports.checkAndMarkEvent = checkAndMarkEvent;
const cache = __importStar(require("@actions/cache"));
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CACHE_PREFIX = "webhook-event";
const MARKER_DIR = ".webhook-dedupe";
/**
 * Checks if an event has been seen before and marks it as seen.
 * Returns true if this is the first time seeing the event (not a duplicate).
 * Returns false if this is a duplicate event.
 */
async function checkAndMarkEvent(eventId) {
    if (!eventId)
        throw new Error("Missing provider event ID");
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
function checkLocalDedupe(markerFile, eventId) {
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
async function checkCacheDedupe(cacheKey, markerFile, eventId) {
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
    }
    catch (error) {
        // Cache API might fail in some scenarios (rate limits, permissions)
        // Fall back to filesystem check
        console.warn(`⚠️ Cache API error, falling back to filesystem: ${error.message}`);
        return checkLocalDedupe(markerFile, eventId);
    }
}
/**
 * Hash the event ID to create a safe cache key
 */
function hash(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
