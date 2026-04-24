#!/usr/bin/env node
/**
 * Token Report — Generate a usage report from the telemetry database.
 */
import Database from "better-sqlite3";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
const DB_PATH = process.argv[2] || join(homedir(), ".tekton", "telemetry.db");
if (!existsSync(DB_PATH)) {
    console.log("No telemetry database found at:", DB_PATH);
    console.log("Run Tekton first to generate telemetry data.");
    process.exit(1);
}
const db = new Database(DB_PATH, { readonly: true });
console.log("⚡ Tekton Token Report\n");
console.log("═".repeat(60));
// Total usage
const totalRow = db.prepare("SELECT SUM(input_tokens) as inp, SUM(output_tokens) as out, COUNT(*) as count FROM events").get();
console.log(`Total Events:  ${(totalRow?.count ?? 0).toLocaleString()}`);
console.log(`Input Tokens:   ${(totalRow?.inp ?? 0).toLocaleString()}`);
console.log(`Output Tokens:  ${(totalRow?.out ?? 0).toLocaleString()}`);
console.log(`Total Tokens:   ${((totalRow?.inp ?? 0) + (totalRow?.out ?? 0)).toLocaleString()}`);
// By model
console.log("\n" + "─".repeat(60));
console.log("Usage by Model:");
const modelRows = db.prepare("SELECT model, provider, SUM(input_tokens) as inp, SUM(output_tokens) as out, COUNT(*) as count FROM events GROUP BY model ORDER BY SUM(input_tokens + output_tokens) DESC").all();
for (const row of modelRows) {
    const total = (row.inp ?? 0) + (row.out ?? 0);
    console.log(`  ${row.model} (${row.provider}): ${total.toLocaleString()} tokens, ${row.count} events`);
}
// Compression stats
console.log("\n" + "─".repeat(60));
try {
    const compRow = db.prepare("SELECT AVG(ratio) as avgRatio, SUM(tokens_saved) as saved, COUNT(*) as count FROM compression_events").get();
    if (compRow && compRow.count > 0) {
        console.log("Compression Statistics:");
        console.log(`  Events:    ${compRow.count.toLocaleString()}`);
        console.log(`  Avg Ratio: ${(compRow.avgRatio ?? 0).toFixed(2)}x`);
        console.log(`  Tokens Saved: ${(compRow.saved ?? 0).toLocaleString()}`);
    }
    else {
        console.log("No compression events recorded.");
    }
}
catch {
    console.log("Compression table not available.");
}
// Budget
console.log("\n" + "─".repeat(60));
try {
    const budgetRow = db.prepare("SELECT * FROM budget_tracking ORDER BY date DESC LIMIT 1").get();
    if (budgetRow) {
        console.log("Budget Status:");
        console.log(`  Date: ${budgetRow.date}`);
        console.log(`  Daily Spend: $${(budgetRow.daily_spend ?? 0).toFixed(4)}`);
        console.log(`  Session Spend: $${(budgetRow.session_spend ?? 0).toFixed(4)}`);
    }
}
catch {
    console.log("No budget data available.");
}
console.log("\n" + "═".repeat(60));
db.close();
//# sourceMappingURL=token-report.js.map