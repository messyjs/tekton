const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brm\s+(-rf?|-fr?|--force)\s+[\/~]/i, reason: "Recursive force delete from root or home" },
  { pattern: /\brm\s+(-rf?|-fr?)\s+\S/i, reason: "Recursive force delete" },
  { pattern: /\bDROP\s+TABLE\b/i, reason: "SQL DROP TABLE" },
  { pattern: /\bFORMAT\s+/i, reason: "Disk format command" },
  { pattern: /\bmkfs/i, reason: "Filesystem format command" },
  { pattern: /\bdd\s+if=/i, reason: "Raw disk write command" },
  { pattern: /\bchmod\s+777/i, reason: "Setting world-writable permissions" },
  { pattern: />\s*\/dev\//i, reason: "Writing directly to device" },
  { pattern: /\bshutdown\b/i, reason: "System shutdown" },
  { pattern: /\breboot\b/i, reason: "System reboot" },
  { pattern: /\bgit\s+push.*--force.*\b(main|master)\b/i, reason: "Force push to main/master branch" },
  { pattern: /\bgit\s+push.*-f\b.*\b(main|master)\b/i, reason: "Force push to main/master branch" },
  { pattern: /\bgit\s+push\s+--force/i, reason: "Force push (may affect shared history)" },
  { pattern: /\b(:\s*\{%\s*\{|\\$\{)\s*\{/i, reason: "Template injection pattern" },
  { pattern: /\bcurl.*\|\s*(sh|bash|zsh)/i, reason: "Piping remote content to shell" },
  { pattern: /\bwget.*\|\s*(sh|bash|zsh)/i, reason: "Piping remote content to shell" },
  { pattern: /\beval\s+/i, reason: "eval is dangerous" },
  { pattern: /\bsudo\s+rm/i, reason: "Privileged delete" },
  { pattern: /\bchmod\s+-R/i, reason: "Recursive permission change" },
  { pattern: /\bchown\s+-R/i, reason: "Recursive ownership change" },
];

export function isDangerous(command: string): { dangerous: boolean; reason?: string } {
  const trimmed = command.trim();
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { dangerous: true, reason };
    }
  }
  return { dangerous: false };
}