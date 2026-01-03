import * as fs from "fs";
import * as path from "path";

type LedgerEntry = {
  branch: string;
  eventId: string;
  hash: string;
  timestamp: string;
};

export async function writeLedger(entry: LedgerEntry): Promise<void> {
  const skipGit = process.env.SKIP_SIGNATURE === "true"; // detect local test mode
  const fileName = "ledger.log";

  const workDir = process.cwd();
  const ledgerPath = path.join(workDir, fileName);

  // Ensure ledger file exists
  if (!fs.existsSync(ledgerPath)) fs.writeFileSync(ledgerPath, "");

  // Append the entry
  const line = `${entry.timestamp} | ${entry.eventId} | ${entry.hash}\n`;
  fs.appendFileSync(ledgerPath, line, { encoding: "utf8" });

  if (skipGit) {
    console.log(`Ledger entry written (local/test): ${line.trim()}`);
    return;
  }

  // Production: Git commands
  const exec = require("@actions/exec");

  try {
    await exec.exec("git", ["fetch", "origin", entry.branch], { ignoreReturnCode: true });
    await exec.exec("git", ["checkout", "-B", entry.branch]);
    await exec.exec("git", ["add", fileName]);
    await exec.exec("git", ["commit", "-m", `ledger: ${entry.eventId}`]);
    await exec.exec("git", ["push", "origin", entry.branch]);
  } catch (err: any) {
    console.error("Git error in writeLedger:", err.message);
    // Optional: add retry logic if push fails
  }
}
