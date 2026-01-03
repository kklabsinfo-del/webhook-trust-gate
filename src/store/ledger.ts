import * as fs from "fs";
import * as path from "path";

type LedgerEntry = {
  branch: string;
  eventId: string;
  hash: string;
  timestamp: string;
};

export async function writeLedger(entry: LedgerEntry): Promise<void> {
  const skipGit = process.env.SKIP_SIGNATURE === "true"; // Local test mode
  const fileName = "ledger.log";

  const workDir = process.cwd();
  const ledgerPath = path.join(workDir, fileName);

  if (!fs.existsSync(ledgerPath)) fs.writeFileSync(ledgerPath, "");

  const line = `${entry.timestamp} | ${entry.eventId} | ${entry.hash}\n`;
  fs.appendFileSync(ledgerPath, line, { encoding: "utf8" });

  if (skipGit) {
    console.log(`Ledger entry written (local/test): ${line.trim()}`);
    return;
  }

  const exec = require("@actions/exec");

  try {
    // Fetch branch, create if not exists
    await exec.exec("git", ["fetch", "origin", entry.branch], { ignoreReturnCode: true });
    await exec.exec("git", ["checkout", "-B", entry.branch]);

    // Add, commit, and push
    await exec.exec("git", ["add", fileName]);
    await exec.exec("git", ["commit", "-m", `ledger: ${entry.eventId}`]);
    await exec.exec("git", ["push", "origin", entry.branch"]);

    console.log(`Ledger committed & pushed for event: ${entry.eventId}`);
  } catch (err: any) {
    console.error("Git error in writeLedger:", err.message);
    // Optional: retry logic
  }
}
