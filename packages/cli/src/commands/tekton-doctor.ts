import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";

/**
 * tekton:doctor — Diagnose and auto-fix Ollama + Tekton infrastructure issues.
 *
 * Subcommands:
 *   (default)   Run all checks (read-only)
 *   fix         Run checks and attempt auto-fixes
 *   ollama      Check only Ollama endpoints
 *   tunnels     Check only Cloudflare tunnels
 *   config      Check only Tekton config consistency
 *   ssh         Check only SSH connectivity
 *   cloud       Check only Ollama cloud model auth
 */
export function createDoctorCommand(): CommandRegistration {
  return {
    name: "tekton:doctor",
    description: "Diagnose and auto-fix Ollama, Cloudflare tunnels, SSH, cloud auth, and config issues",
    subcommands: {
      "fix": "Run all checks and attempt auto-remediation",
      "ollama": "Check Ollama endpoint reachability",
      "tunnels": "Check Cloudflare tunnel connectivity",
      "config": "Check Tekton config consistency",
      "ssh": "Check SSH connectivity to remote machines",
      "cloud": "Check Ollama cloud model authentication",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const sub = args.subcommand || "";
      const doFix = sub === "fix";
      const filter = doFix ? "all" : (sub || "all");

      const { execSync } = await import("node:child_process");
      const fs = await import("node:fs");
      const path = await import("node:path");
      const os = await import("node:os");

      const home = os.default.homedir();
      const tektonHome = ctx.tektonHome || path.default.join(home, ".tekton");
      const configYaml = path.default.join(tektonHome, "config.yaml");
      const settingsJson = path.default.join(tektonHome, "settings.json");
      const ollamaDir = path.default.join(home, ".ollama");
      const fusedConfig = path.default.join(home, "AppData", "Roaming", "TektonFused", "config.json");

      interface CheckResult {
        status: "pass" | "warn" | "fail" | "fixed" | "info";
        message: string;
        detail?: string;
      }

      const results: CheckResult[] = [];
      const pass = (msg: string, detail?: string) => results.push({ status: "pass", message: msg, detail });
      const warn = (msg: string, detail?: string) => results.push({ status: "warn", message: msg, detail });
      const fail = (msg: string, detail?: string) => results.push({ status: "fail", message: msg, detail });
      const fixed = (msg: string, detail?: string) => results.push({ status: "fixed", message: msg, detail });
      const info = (msg: string) => results.push({ status: "info", message: msg });

      const shouldCheck = (area: string) => filter === "all" || filter === area;

      const tryExec = (cmd: string, timeout = 5000): string => {
        try {
          return execSync(cmd, { encoding: "utf-8", timeout, stdio: ["pipe", "pipe", "pipe"] }).trim();
        } catch {
          return "";
        }
      };

      const httpGet = (url: string, timeout = 5): string => {
        return tryExec(`curl -s --connect-timeout ${timeout} --max-time ${timeout + 5} "${url}"`, (timeout + 5) * 1000);
      };

      const checkOllamaEndpoint = (name: string, url: string): boolean => {
        const resp = httpGet(`${url}/api/tags`, 5);
        if (resp.includes('"models"')) {
          let count = "?";
          try {
            const parsed = JSON.parse(resp);
            count = String(parsed.models?.length ?? "?");
          } catch {}
          pass(`${name} (${url}) — ${count} models`);
          return true;
        }
        if (resp.includes("502") || resp.includes("Bad Gateway")) {
          fail(`${name} (${url}) — 502 Bad Gateway`);
          info("  Backend Ollama may be down or IP changed");
          return false;
        }
        if (!resp) {
          fail(`${name} (${url}) — no response`);
          return false;
        }
        fail(`${name} (${url}) — unexpected: ${resp.slice(0, 100)}`);
        return false;
      };

      const checkCloudModel = (name: string, url: string, model: string): boolean => {
        const resp = tryExec(
          `curl -s --connect-timeout 10 --max-time 30 "${url}/api/chat" -d '{"model":"${model}","messages":[{"role":"user","content":"hi"}],"stream":false}'`,
          35000
        );
        if (resp.includes('"message"')) {
          pass(`${name}: cloud model ${model} — working`);
          return true;
        }
        if (resp.includes("403") || resp.includes("subscription")) {
          fail(`${name}: cloud model ${model} — 403 (auth/subscription issue)`);
          info("  Key pair or API key may not have cloud subscription");
          return false;
        }
        fail(`${name}: cloud model ${model} — error: ${resp.slice(0, 100)}`);
        return false;
      };

      // ═══════════════════════════════════════════════════════════════════════
      // 1. ENVIRONMENT VARIABLES
      // ═══════════════════════════════════════════════════════════════════════
      if (shouldCheck("config")) {
        const ollamaHost = process.env.OLLAMA_HOST ?? "";
        if (!ollamaHost) {
          warn("OLLAMA_HOST not set — CLI defaults to 127.0.0.1:11434");
        } else {
          const hostPart = ollamaHost.replace(/:\d+$/, "");
          if (hostPart === "127.0.0.1" || hostPart === "localhost") {
            pass(`OLLAMA_HOST=${ollamaHost} (local)`);
          } else {
            const ip = tryExec(`ping -n 1 ${hostPart} 2>/dev/null | grep -oP '\\[\\K[0-9.]+'`);
            if (ip) {
              pass(`OLLAMA_HOST=${ollamaHost} (resolves to ${ip})`);
            } else {
              fail(`OLLAMA_HOST=${ollamaHost} — hostname '${hostPart}' does not resolve`);
            }
          }
        }

        if (process.env.OLLAMA_API_KEY) {
          warn("OLLAMA_API_KEY is set — may cause 403 if wrong account");
          info("  Try unsetting to use id_ed25519 key-based auth");
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 2. OLLAMA ENDPOINTS
      // ═══════════════════════════════════════════════════════════════════════
      if (shouldCheck("ollama")) {
        checkOllamaEndpoint("Local", "http://127.0.0.1:11434");

        // Check known endpoints from config
        if (fs.default.existsSync(configYaml)) {
          const configContent = fs.default.readFileSync(configYaml, "utf-8");
          const urlMatches = configContent.matchAll(/(?:baseUrl|serverUrl\w*):\s*(.+)/g);
          const seen = new Set<string>();
          for (const m of urlMatches) {
            let url = m[1].trim().replace(/["']/g, "");
            if (!url || seen.has(url)) continue;
            seen.add(url);

            if (url.includes("tekton-fused")) {
              checkOllamaEndpoint("Workstation (tunnel)", url);
            } else if (url.includes("ollama-mjlaptop")) {
              checkOllamaEndpoint("MJ Laptop (tunnel)", url);
            } else if (url.includes("ollama.messy-jesse")) {
              checkOllamaEndpoint("Laptop (tunnel)", url);
            } else if (url.includes("192.168.68.70")) {
              checkOllamaEndpoint("Workstation (LAN)", url);
            } else if (url.includes("192.168.68.61")) {
              checkOllamaEndpoint("MJ Laptop (LAN)", url);
            } else if (url.includes("192.168.68.55")) {
              warn(`Config references old MJ Laptop IP 192.168.68.55 (current: 192.168.68.61)`);
            }
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 3. CLOUDFLARE TUNNELS
      // ═══════════════════════════════════════════════════════════════════════
      if (shouldCheck("tunnels")) {
        const tunnels: Array<[string, string]> = [
          ["Workstation", "https://tekton-fused.messy-jesse.com"],
          ["MJ Laptop", "https://ollama-mjlaptop.messy-jesse.com"],
          ["Laptop", "https://ollama.messy-jesse.com"],
        ];

        for (const [name, url] of tunnels) {
          const resp = httpGet(`${url}/api/tags`, 8);
          if (resp.includes('"models"')) {
            pass(`Tunnel: ${name} (${url}) — OK`);
          } else if (resp.includes("502") || resp.includes("Bad Gateway")) {
            fail(`Tunnel: ${name} (${url}) — 502 Bad Gateway`);
            info("  Backend Ollama may be down, IP changed, or tunnel config stale");

            if (doFix && name === "MJ Laptop") {
              info("  Checking mjlaptop via SSH...");
              const ollamaRunning = tryExec(
                `ssh -o ConnectTimeout=5 -o BatchMode=yes mjlaptop "tasklist /fi \\"imagename eq ollama.exe\\"" 2>/dev/null`,
                10000
              );
              if (ollamaRunning.includes("ollama.exe")) {
                info("  Ollama IS running — tunnel config may point to wrong IP/port");
              } else {
                warn("Ollama NOT running on mjlaptop — attempting restart...");
                tryExec(
                  `ssh -o ConnectTimeout=5 -o BatchMode=yes mjlaptop "powershell -Command \\"Start-Process -FilePath 'C:\\Users\\noizv\\AppData\\Local\\Programs\\Ollama\\ollama.exe' -ArgumentList 'serve' -PassThru -WindowStyle Hidden\\"" 2>/dev/null`,
                  15000
                );
                await new Promise(r => setTimeout(r, 5000));
                const recheck = tryExec(
                  `ssh -o ConnectTimeout=5 -o BatchMode=yes mjlaptop "tasklist /fi \\"imagename eq ollama.exe\\"" 2>/dev/null`,
                  10000
                );
                if (recheck.includes("ollama.exe")) {
                  fixed("Restarted Ollama on mjlaptop");
                } else {
                  fail("Could not restart Ollama on mjlaptop (may need interactive session)");
                  info("  Try: schtasks approach or log in to mjlaptop directly");
                }
              }
            }
          } else if (!resp) {
            fail(`Tunnel: ${name} (${url}) — no response (DNS or tunnel down)`);
          } else {
            fail(`Tunnel: ${name} (${url}) — ${resp.slice(0, 80)}`);
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 4. SSH CONNECTIVITY
      // ═══════════════════════════════════════════════════════════════════════
      if (shouldCheck("ssh")) {
        const sshOk = tryExec(`ssh -o ConnectTimeout=5 -o BatchMode=yes mjlaptop "echo ok" 2>/dev/null`);
        if (sshOk.includes("ok")) {
          pass("SSH to mjlaptop — connected");

          // Check key pair
          const remoteKey = tryExec(`ssh -o ConnectTimeout=5 -o BatchMode=yes mjlaptop "type .ollama\\\\id_ed25519.pub" 2>/dev/null`).trim();
          const localKeyPath = path.default.join(ollamaDir, "id_ed25519.pub");
          let localKey = "";
          if (fs.default.existsSync(localKeyPath)) {
            localKey = fs.default.readFileSync(localKeyPath, "utf-8").trim();
          }
          if (remoteKey && localKey) {
            if (remoteKey === localKey) {
              pass("Ollama key pair matches between local and mjlaptop");
            } else {
              warn("Ollama key pairs DIFFER between local and mjlaptop");
              info(`  Local:  ${localKey.slice(0, 50)}...`);
              info(`  Remote: ${remoteKey.slice(0, 50)}...`);
              info("  Cloud models may fail with 403 if different subscription accounts");
              if (doFix) {
                info("  To fix: scp ~/.ollama/id_ed25519 ~/.ollama/id_ed25519.pub mjlaptop:.ollama/");
              }
            }
          }

          // Check remote OLLAMA_API_KEY
          const remoteEnv = tryExec(`ssh -o ConnectTimeout=5 -o BatchMode=yes mjlaptop "set OLLAMA_API_KEY 2>nul" 2>/dev/null`);
          if (remoteEnv.includes("OLLAMA_API_KEY=") && !remoteEnv.trim().endsWith("OLLAMA_API_KEY=")) {
            warn("OLLAMA_API_KEY is set on mjlaptop — may cause 403");
          }
        } else {
          fail("SSH to mjlaptop — cannot connect");
          info("  Check SSH keys, network, or if mjlaptop is online");
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 5. CLOUD MODEL AUTH
      // ═══════════════════════════════════════════════════════════════════════
      if (shouldCheck("cloud")) {
        const cloudModels = ["glm-5.1:cloud", "glm-5.2:cloud", "kimi-k2.5:cloud"];

        // Local
        const localResp = httpGet("http://127.0.0.1:11434/api/tags", 3);
        if (localResp.includes('"models"')) {
          for (const model of cloudModels) {
            checkCloudModel("Local", "http://127.0.0.1:11434", model);
          }
        }

        // MJ Laptop via LAN
        const mjResp = httpGet("http://192.168.68.61:11434/api/tags", 3);
        if (mjResp.includes('"models"')) {
          for (const model of cloudModels) {
            checkCloudModel("MJ Laptop", "http://192.168.68.61:11434", model);
          }
        }

        // Workstation via tunnel
        const wsResp = httpGet("https://tekton-fused.messy-jesse.com/api/tags", 5);
        if (wsResp.includes('"models"')) {
          for (const model of cloudModels) {
            checkCloudModel("Workstation", "https://tekton-fused.messy-jesse.com", model);
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 6. CONFIG CONSISTENCY
      // ═══════════════════════════════════════════════════════════════════════
      if (shouldCheck("config")) {
        if (fs.default.existsSync(configYaml)) {
          pass("config.yaml found");
        } else {
          fail(`config.yaml not found at ${configYaml}`);
        }

        if (fs.default.existsSync(settingsJson)) {
          pass("settings.json found");
          try {
            const settings = JSON.parse(fs.default.readFileSync(settingsJson, "utf-8"));
            info(`  defaultProvider=${settings.defaultProvider ?? ""}, defaultModel=${settings.defaultModel ?? ""}`);
          } catch {}
        } else {
          warn("settings.json not found");
        }

        // IP mismatch detection
        if (fs.default.existsSync(configYaml)) {
          const configContent = fs.default.readFileSync(configYaml, "utf-8");
          if (configContent.includes("192.168.68.55")) {
            const currentIp = tryExec(`ping -n 1 mjlaptop 2>/dev/null | grep -oP '\\[\\K[0-9.]+'`);
            if (currentIp && currentIp !== "192.168.68.55") {
              fail(`IP mismatch: config has 192.168.68.55 but mjlaptop is at ${currentIp}`);
              if (doFix) {
                const backup = `${configYaml}.bak-doctor-${Date.now()}`;
                fs.default.copyFileSync(configYaml, backup);
                const updated = configContent.replace(/192\.168\.68\.55/g, currentIp);
                fs.default.writeFileSync(configYaml, updated);
                fixed(`Updated config.yaml: 192.168.68.55 → ${currentIp}`);
              }
            }
          }
        }

        // TektonFused config
        if (fs.default.existsSync(fusedConfig)) {
          if (fs.default.readFileSync(fusedConfig, "utf-8").includes("192.168.68.55")) {
            warn("TektonFused config.json references old MJ Laptop IP 192.168.68.55");
            if (doFix) {
              const currentIp = tryExec(`ping -n 1 mjlaptop 2>/dev/null | grep -oP '\\[\\K[0-9.]+'`);
              if (currentIp && currentIp !== "192.168.68.55") {
                const backup = `${fusedConfig}.bak-doctor-${Date.now()}`;
                fs.default.copyFileSync(fusedConfig, backup);
                const content = fs.default.readFileSync(fusedConfig, "utf-8");
                fs.default.writeFileSync(fusedConfig, content.replace(/192\.168\.68\.55/g, currentIp));
                fixed(`Updated TektonFused config.json: 192.168.68.55 → ${currentIp}`);
              }
            }
          }
        }

        // Ollama key exists
        if (fs.default.existsSync(path.default.join(ollamaDir, "id_ed25519"))) {
          pass("Ollama key pair (id_ed25519) exists locally");
        } else {
          fail("Ollama key pair (id_ed25519) missing — cloud models will not work");
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // OUTPUT
      // ═══════════════════════════════════════════════════════════════════════
      const counts = results.reduce(
        (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; },
        {} as Record<string, number>
      );

      if (hasJsonFlag(args)) {
        piCtx.ui.notify(JSON.stringify({
          mode: doFix ? "fix" : "check",
          filter,
          summary: {
            pass: counts.pass ?? 0,
            warn: counts.warn ?? 0,
            fail: counts.fail ?? 0,
            fixed: counts.fixed ?? 0,
          },
          results: results.map(r => ({ status: r.status, message: r.message, detail: r.detail })),
        }, null, 2));
        return;
      }

      const icons: Record<string, string> = {
        pass: "✅", warn: "⚠️ ", fail: "❌", fixed: "🔧", info: "   ℹ️ ",
      };

      const lines: string[] = ["🔬 Tekton Doctor — Diagnostic Results\n"];
      for (const r of results) {
        lines.push(`${icons[r.status] ?? "•"} ${r.message}`);
        if (r.detail) lines.push(`   ${r.detail}`);
      }

      lines.push("");
      lines.push(`Summary: ${counts.pass ?? 0} passed, ${counts.warn ?? 0} warnings, ${counts.fail ?? 0} failed, ${counts.fixed ?? 0} fixed`);

      if ((counts.fail ?? 0) > 0 && !doFix) {
        lines.push("\n⚠ Issues detected. Run /tekton:doctor fix to attempt auto-remediation.");
      }

      piCtx.ui.notify(lines.join("\n"));
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["fix", "ollama", "tunnels", "config", "ssh", "cloud"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Check ${s}` }));
    },
  };
}