// ── Arg parsing ─────────────────────────────────────────────────────
export function parseArgs(raw) {
    const tokens = tokenize(raw);
    const positional = [];
    const flags = {};
    let subcommand = "";
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.startsWith("--")) {
            const flagName = token.slice(2);
            // Check if next token is a value (not another flag)
            if (i + 1 < tokens.length && !tokens[i + 1].startsWith("-")) {
                flags[flagName] = tokens[i + 1];
                i++;
            }
            else {
                flags[flagName] = true;
            }
        }
        else if (token.startsWith("-") && token.length === 2) {
            // Short flag like -j for json
            const flagName = token.slice(1);
            if (i + 1 < tokens.length && !tokens[i + 1].startsWith("-")) {
                flags[flagName] = tokens[i + 1];
                i++;
            }
            else {
                flags[flagName] = true;
            }
        }
        else {
            if (subcommand === "") {
                subcommand = token;
            }
            else {
                positional.push(token);
            }
        }
    }
    return { subcommand, positional, flags, raw };
}
function tokenize(input) {
    const tokens = [];
    let current = "";
    let inQuote = null;
    for (const char of input) {
        if (inQuote) {
            if (char === inQuote) {
                inQuote = null;
            }
            else {
                current += char;
            }
        }
        else if (char === '"' || char === "'") {
            inQuote = char;
        }
        else if (char === " " || char === "\t") {
            if (current.length > 0) {
                tokens.push(current);
                current = "";
            }
        }
        else {
            current += char;
        }
    }
    if (current.length > 0) {
        tokens.push(current);
    }
    return tokens;
}
// ── Output formatting ────────────────────────────────────────────────
export function hasJsonFlag(args) {
    return args.flags.json === true || args.flags.j === true;
}
export function formatBox(title, rows, width = 40) {
    const innerWidth = width - 4;
    const top = `╔${"═".repeat(innerWidth)}╗`;
    const bottom = `╚${"═".repeat(innerWidth)}╝`;
    const titleLine = `║ ${title.padEnd(innerWidth - 1)}║`;
    const dataLines = rows.map(([key, value]) => {
        const label = key;
        const val = String(value);
        const padding = innerWidth - 1 - label.length - 2 - val.length;
        return `║  ${label}: ${val}${" ".repeat(Math.max(0, padding))}║`;
    });
    return [top, titleLine, `╠${"═".repeat(innerWidth)}╣`, ...dataLines, bottom].join("\n");
}
export function formatTable(headers, rows) {
    const colWidths = headers.map((h, i) => {
        const maxDataLen = rows.reduce((max, row) => Math.max(max, (row[i] ?? "").length), 0);
        return Math.max(h.length, maxDataLen);
    });
    const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join("  ");
    const separator = colWidths.map(w => "─".repeat(w)).join("──");
    const dataLines = rows.map(row => headers.map((_, i) => (row[i] ?? "").padEnd(colWidths[i])).join("  "));
    return [headerLine, separator, ...dataLines].join("\n");
}
export function confirmAction(piCtx, message) {
    return piCtx.ui.confirm("Confirm", message);
}
export function truncate(s, maxLen) {
    if (s.length <= maxLen)
        return s;
    return s.slice(0, maxLen - 3) + "...";
}
//# sourceMappingURL=types.js.map