import * as core from "@actions/core";

export function writeSummary(eventId: string, hash: string): void {
  core.summary
    .addHeading("Webhook Trust Proof")
    .addTable([
      [{ data: "Event ID", header: true }, eventId],
      [{ data: "SHA-256 Hash", header: true }, hash],
    ])
    .addRaw("\nThis proof uniquely identifies the verified webhook event.\n")
    .write();
}
