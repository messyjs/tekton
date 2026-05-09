/**
 * Terminal Manager — PTY session management for browser-based terminals.
 *
 * Spawns node-pty processes and pipes I/O through WebSocket messages.
 * Uses the existing DashboardWS connection on port 7701.
 */
import type { IPty } from "node-pty";

// Lazy-load node-pty (native addon, may not be available on all platforms)
let pty: typeof import("node-pty") | null = null;
function getPty() {
  if (!pty) {
    try {
      pty = require("node-pty");
    } catch {
      return null;
    }
  }
  return pty;
}

// ── Types ───────────────────────────────────────────────────────────────

export interface TerminalSession {
  id: string;
  pty: IPty;
  shell: string;
  cwd: string;
  createdAt: number;
  lastActivityAt: number;
}

export interface TerminalConfig {
  /** Default shell (auto-detected if not set) */
  shell?: string;
  /** Default working directory */
  cwd?: string;
  /** Initial columns */
  cols: number;
  /** Initial rows */
  rows: number;
}

export const DEFAULT_TERMINAL_CONFIG: TerminalConfig = {
  cols: 80,
  rows: 24,
};

// ── Terminal Manager ────────────────────────────────────────────────────

export class TerminalManager {
  private sessions = new Map<string, TerminalSession>();
  private config: TerminalConfig;
  private outputCallbacks = new Map<string, (data: string, sessionId: string) => void>();
  private exitCallbacks = new Map<string, (exitCode: number | null, sessionId: string) => void>();

  constructor(config?: Partial<TerminalConfig>) {
    this.config = { ...DEFAULT_TERMINAL_CONFIG, ...config };
  }

  /** Detect the default shell for the current platform */
  private getDefaultShell(): string {
    if (process.platform === "win32") {
      return process.env.COMSPEC || "cmd.exe";
    }
    return process.env.SHELL || "/bin/bash";
  }

  /** Create a new terminal session */
  createSession(options?: {
    shell?: string;
    cwd?: string;
    cols?: number;
    rows?: number;
    env?: Record<string, string>;
  }): { session: TerminalSession } | { error: string } {
    const ptyModule = getPty();
    if (!ptyModule) {
      return { error: "node-pty is not available on this platform" };
    }

    const id = `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const shell = options?.shell || this.config.shell || this.getDefaultShell();
    const cwd = options?.cwd || this.config.cwd || process.cwd();
    const cols = options?.cols || this.config.cols;
    const rows = options?.rows || this.config.rows;

    try {
      const ptyProcess = ptyModule.spawn(shell, [], {
        name: "xterm-256color",
        cols,
        rows,
        cwd,
        env: { ...process.env, ...options?.env, TERM: "xterm-256color" } as Record<string, string>,
      });

      const session: TerminalSession = {
        id,
        pty: ptyProcess,
        shell,
        cwd,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
      };

      // Wire up output events
      ptyProcess.onData((data: string) => {
        session.lastActivityAt = Date.now();
        const cb = this.outputCallbacks.get(id);
        if (cb) {
          cb(data, id);
        }
      });

      // Wire up exit
      ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        const cb = this.exitCallbacks.get(id);
        this.sessions.delete(id);
        this.outputCallbacks.delete(id);
        this.exitCallbacks.delete(id);
        if (cb) {
          cb(exitCode, id);
        }
      });

      this.sessions.set(id, session);

      return { session };
    } catch (err: any) {
      return { error: err.message ?? String(err) };
    }
  }

  /** Send input data to a terminal session */
  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.lastActivityAt = Date.now();
    session.pty.write(data);
    return true;
  }

  /** Resize a terminal session */
  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.pty.resize(cols, rows);
    return true;
  }

  /** Kill a terminal session */
  kill(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    try {
      session.pty.kill();
    } catch {}
    this.sessions.delete(sessionId);
    this.outputCallbacks.delete(sessionId);
    this.exitCallbacks.delete(sessionId);
    return true;
  }

  /** Kill all terminal sessions */
  killAll(): number {
    let count = 0;
    for (const [id] of this.sessions) {
      this.kill(id);
      count++;
    }
    return count;
  }

  /** Register a callback for terminal output */
  onOutput(sessionId: string, callback: (data: string, sessionId: string) => void): void {
    this.outputCallbacks.set(sessionId, callback);
  }

  /** Register a callback for terminal exit */
  onExit(sessionId: string, callback: (exitCode: number | null, sessionId: string) => void): void {
    this.exitCallbacks.set(sessionId, callback);
  }

  /** List all active sessions */
  listSessions(): Array<{
    id: string;
    shell: string;
    cwd: string;
    createdAt: number;
    lastActivityAt: number;
  }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      shell: s.shell,
      cwd: s.cwd,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
    }));
  }

  /** Get a session by ID */
  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  /** Check if terminal support is available */
  isAvailable(): boolean {
    return getPty() !== null;
  }

  /** Get stats */
  getStats(): { available: boolean; activeSessions: number } {
    return {
      available: this.isAvailable(),
      activeSessions: this.sessions.size,
    };
  }
}