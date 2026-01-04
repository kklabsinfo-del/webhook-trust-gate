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
exports.writeLedger = writeLedger;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const exec = __importStar(require("@actions/exec"));
/**
 * Writes a verified webhook event to the tamper-evident Git ledger.
 * Handles concurrency with retries and ensures atomic operations.
 */
async function writeLedger(entry) {
    const skipGit = process.env.SKIP_SIGNATURE === "true"; // detect local/test mode
    const fileName = "ledger.log";
    const workDir = process.cwd();
    const ledgerPath = path.join(workDir, fileName);
    // Ensure ledger file exists
    if (!fs.existsSync(ledgerPath)) {
        fs.writeFileSync(ledgerPath, "", { encoding: "utf8" });
    }
    // Append the entry
    const line = `${entry.timestamp} | ${entry.eventId} | ${entry.hash}\n`;
    fs.appendFileSync(ledgerPath, line, { encoding: "utf8" });
    if (skipGit) {
        console.log(`✅ Ledger entry written (local/test): ${line.trim()}`);
        return;
    }
    // Production: Git commands with concurrency handling
    await commitAndPushWithRetry(entry.branch, fileName, entry.eventId, ledgerPath);
}
/**
 * Commits and pushes to the ledger branch with retry logic to handle
 * concurrent webhook processing.
 */
async function commitAndPushWithRetry(branch, fileName, eventId, ledgerPath, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Attempt ${attempt}/${maxRetries}: Committing to ${branch}...`);
            // Configure git user (required for commits)
            await exec.exec("git", [
                "config",
                "user.name",
                "webhook-trust-gate[bot]",
            ]);
            await exec.exec("git", [
                "config",
                "user.email",
                "webhook-trust-gate[bot]@users.noreply.github.com",
            ]);
            // Fetch the latest state of the ledger branch
            await exec.exec("git", ["fetch", "origin", branch], {
                ignoreReturnCode: true, // Branch might not exist yet
            });
            // Checkout or create the ledger branch
            const checkoutResult = await exec.exec("git", ["checkout", "-B", branch, `origin/${branch}`], { ignoreReturnCode: true });
            // If branch doesn't exist on remote, create it fresh
            if (checkoutResult !== 0) {
                await exec.exec("git", ["checkout", "--orphan", branch]);
                await exec.exec("git", ["rm", "-rf", "."], { ignoreReturnCode: true });
                // Recreate the ledger file (it was deleted by rm -rf)
                const line = fs.readFileSync(ledgerPath, "utf8");
                fs.writeFileSync(fileName, line, { encoding: "utf8" });
            }
            // Stage the ledger file
            await exec.exec("git", ["add", fileName]);
            // Check if there are changes to commit
            let hasChanges = false;
            await exec.exec("git", ["diff", "--cached", "--quiet"], {
                ignoreReturnCode: true,
                listeners: {
                    stderr: () => {
                        hasChanges = true;
                    },
                },
            });
            if (!hasChanges) {
                const statusCode = await exec.exec("git", ["diff", "--cached", "--exit-code"], { ignoreReturnCode: true });
                hasChanges = statusCode !== 0;
            }
            if (hasChanges) {
                // Commit with descriptive message
                await exec.exec("git", [
                    "commit",
                    "-m",
                    `ledger: ${eventId}`,
                    "-m",
                    `Event verified and recorded at ${new Date().toISOString()}`,
                ]);
                // Pull with rebase to merge any concurrent changes
                const pullResult = await exec.exec("git", ["pull", "--rebase", "origin", branch], { ignoreReturnCode: true });
                // If rebase failed, abort and retry
                if (pullResult !== 0) {
                    await exec.exec("git", ["rebase", "--abort"], {
                        ignoreReturnCode: true,
                    });
                    throw new Error("Rebase conflict detected");
                }
                // Push to remote
                await exec.exec("git", ["push", "origin", branch]);
                console.log(`✅ Ledger entry committed and pushed: ${eventId}`);
                return; // Success!
            }
            else {
                console.log(`ℹ️ No changes to commit for ${eventId} (already in ledger)`);
                return;
            }
        }
        catch (error) {
            console.warn(`⚠️ Attempt ${attempt} failed: ${error.message}`);
            if (attempt === maxRetries) {
                throw new Error(`Failed to write ledger after ${maxRetries} attempts: ${error.message}`);
            }
            // Exponential backoff: 1s, 2s, 4s
            const backoffMs = 1000 * Math.pow(2, attempt - 1);
            console.log(`⏳ Retrying in ${backoffMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            // Clean up any partial state before retry
            await exec.exec("git", ["reset", "--hard", "HEAD"], {
                ignoreReturnCode: true,
            });
            await exec.exec("git", ["clean", "-fd"], { ignoreReturnCode: true });
        }
    }
}
