const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ----------------------------
// Utility Functions
// ----------------------------
function hashEvent(event) {
  const str = JSON.stringify(event);
  return crypto.createHash("sha256").update(str).digest("hex");
}

function normalizeEvent(provider, payload) {
  switch (provider) {
    case "stripe":
      return {
        provider: "stripe", // ← Added for consistency
        id: payload.id,
        type: payload.type,
        created: payload.created,
        data: payload.data,
      };
    case "razorpay":
      return {
        provider: "razorpay", // ← Added for consistency
        id: payload.id || payload.entity,
        entity: payload.entity,
        amount: payload.amount,
        status: payload.status,
        created_at: payload.created_at,
      };
    default:
      throw new Error("Unsupported provider");
  }
}

// ----------------------------
// Ledger + Deduplication
// ----------------------------
const ledgerFile = path.join(process.cwd(), "ledger.log");
const dedupeDir = path.join(process.cwd(), ".webhook-dedupe");

// Ensure dedupe directory exists
if (!fs.existsSync(dedupeDir)) {
  fs.mkdirSync(dedupeDir, { recursive: true });
}

function checkAndMarkEvent(eventId) {
  const eventHash = crypto.createHash("sha256").update(eventId).digest("hex");
  const markerFile = path.join(dedupeDir, eventHash);

  // Check if we've seen this event before
  if (fs.existsSync(markerFile)) {
    return false; // Duplicate
  }

  // Mark as seen
  fs.writeFileSync(markerFile, new Date().toISOString(), { encoding: "utf8" });
  return true; // First time
}

function writeLedger(eventId, hash) {
  // Create ledger file if missing
  if (!fs.existsSync(ledgerFile)) fs.writeFileSync(ledgerFile, "");

  const timestamp = new Date().toISOString();
  const line = `${timestamp} | ${eventId} | ${hash}\n`;

  fs.appendFileSync(ledgerFile, line, { encoding: "utf8" });
  console.log(`✅ Ledger entry written: ${eventId}`);
}

// ----------------------------
// Test Webhooks
// ----------------------------
const webhooks = [
  // Stripe events
  {
    provider: "stripe",
    payload: {
      id: "evt_test_123",
      type: "payment_intent.succeeded",
      data: { object: {} },
      created: 1670000000,
    },
  },
  {
    provider: "stripe",
    payload: {
      id: "evt_test_124",
      type: "payment_intent.succeeded",
      data: { object: {} },
      created: 1670000100,
    },
  },
  // Duplicate Stripe event
  {
    provider: "stripe",
    payload: {
      id: "evt_test_123",
      type: "payment_intent.succeeded",
      data: { object: {} },
      created: 1670000000,
    },
  },
  // Razorpay events
  {
    provider: "razorpay",
    payload: {
      entity: "payment",
      id: "pay_test_001",
      amount: 1000,
      status: "captured",
      created_at: 1670000200,
    },
  },
  // Duplicate Razorpay event
  {
    provider: "razorpay",
    payload: {
      entity: "payment",
      id: "pay_test_001",
      amount: 1000,
      status: "captured",
      created_at: 1670000200,
    },
  },
];

// ----------------------------
// Run Simulation
// ----------------------------
console.log("\n=== Starting Webhook Trust Gate Simulation ===\n");

for (const wh of webhooks) {
  const provider = wh.provider;
  const payload = wh.payload;
  const eventId = payload.id || payload.entity || `local_${Date.now()}`;

  // Deduplication check
  const firstSeen = checkAndMarkEvent(eventId);
  if (!firstSeen) {
    console.log(`🔴 Duplicate webhook detected, BLOCKED: ${eventId}`);
    console.log("----------------------------\n");
    continue; // ← Skip ledger write for duplicates
  }

  // Normalization
  const normalized = normalizeEvent(provider, payload);

  // SHA-256 hash
  const eventHash = hashEvent(normalized);

  // Write ledger (only for first occurrence)
  writeLedger(eventId, eventHash);

  // Output summary
  console.log(`Event ID     : ${eventId}`);
  console.log(`SHA-256 hash : ${eventHash}`);
  console.log(`Normalized   : ${JSON.stringify(normalized)}`);
  console.log("----------------------------\n");
}

// ----------------------------
// Final Ledger
// ----------------------------
console.log("\n=== Final Ledger Content ===");
const ledgerContent = fs.readFileSync(ledgerFile, "utf-8");
console.log(ledgerContent);

// Count unique events
const lines = ledgerContent.trim().split("\n").filter((l) => l);
console.log(`\nTotal events in ledger: ${lines.length}`);

// ----------------------------
// Cleanup Instructions
// ----------------------------
console.log("\n💡 To reset the test environment:");
console.log("   rm -rf ledger.log .webhook-dedupe");
console.log("   (or manually delete these files/folders)\n");