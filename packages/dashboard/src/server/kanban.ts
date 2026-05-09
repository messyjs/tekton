/**
 * Kanban Manager — Board-based task tracking for missions and briefs.
 *
 * Cards flow through lanes: Backlog -> Ready -> Running -> Review -> Done
 * Each card can reference a SwarmBrief or be a standalone task.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// ── Types ───────────────────────────────────────────────────────────────

export type KanbanLane = "backlog" | "ready" | "running" | "review" | "done";

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  lane: KanbanLane;
  /** Optional link to a swarm brief */
  briefId?: string;
  /** Optional link to a worker */
  assigneeId?: string;
  /** Priority: 0=low, 1=normal, 2=high, 3=critical */
  priority: number;
  /** Tags for filtering */
  tags: string[];
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last updated */
  updatedAt: string;
  /** ISO timestamp when moved to done */
  completedAt?: string;
  /** Custom metadata */
  metadata: Record<string, unknown>;
}

export interface KanbanBoard {
  id: string;
  title: string;
  description: string;
  /** Lane order for this board */
  lanes: KanbanLane[];
  /** Cards in this board */
  cards: KanbanCard[];
  createdAt: string;
  updatedAt: string;
}

// ── Defaults ────────────────────────────────────────────────────────────

const DEFAULT_LANES: KanbanLane[] = ["backlog", "ready", "running", "review", "done"];

const LANE_COLORS: Record<KanbanLane, string> = {
  backlog: "#484f58",
  ready: "#58a6ff",
  running: "#3fb950",
  review: "#d29922",
  done: "#8957e5",
};

const LANE_ICONS: Record<KanbanLane, string> = {
  backlog: "inbox",
  ready: "circle-check",
  running: "play",
  review: "eye",
  done: "check",
};

const PRIORITY_LABELS = ["low", "normal", "high", "critical"] as const;

// ── Kanban Manager ────────────────────────────────────────────────────

export class KanbanManager {
  private boards: Map<string, KanbanBoard> = new Map();
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(process.cwd(), ".tekton", "kanban");
  }

  /** Ensure data directory exists */
  private ensureDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /** Persist a board to disk */
  private saveBoard(board: KanbanBoard): void {
    this.ensureDir();
    const filePath = path.join(this.dataDir, `${board.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(board, null, 2), "utf-8");
  }

  /** Load a board from disk */
  private loadBoard(id: string): KanbanBoard | null {
    const filePath = path.join(this.dataDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      return null;
    }
  }

  /** Load all boards from disk */
  private loadAll(): void {
    this.ensureDir();
    const files = fs.readdirSync(this.dataDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const id = file.replace(".json", "");
      const board = this.loadBoard(id);
      if (board) this.boards.set(id, board);
    }
  }

  // ── Board CRUD ─────────────────────────────────────────────────

  /** Create a new board */
  createBoard(title: string, description?: string): KanbanBoard {
    this.loadAll();
    const board: KanbanBoard = {
      id: `board_${randomUUID().slice(0, 8)}`,
      title,
      description: description || "",
      lanes: [...DEFAULT_LANES],
      cards: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.boards.set(board.id, board);
    this.saveBoard(board);
    return board;
  }

  /** Get a board by ID */
  getBoard(boardId: string): KanbanBoard | undefined {
    let board = this.boards.get(boardId);
    if (!board) {
      board = this.loadBoard(boardId) || undefined;
      if (board) this.boards.set(boardId, board);
    }
    return board;
  }

  /** List all boards */
  listBoards(): Array<{ id: string; title: string; description: string; cardCount: number; lanes: KanbanLane[]; updatedAt: string }> {
    this.loadAll();
    return Array.from(this.boards.values()).map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      cardCount: b.cards.length,
      lanes: b.lanes,
      updatedAt: b.updatedAt,
    }));
  }

  /** Delete a board */
  deleteBoard(boardId: string): boolean {
    this.loadAll();
    const board = this.boards.get(boardId);
    if (!board) return false;
    this.boards.delete(boardId);
    const filePath = path.join(this.dataDir, `${boardId}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  }

  // ── Card CRUD ──────────────────────────────────────────────────

  /** Add a card to a board */
  addCard(boardId: string, card: {
    title: string;
    description?: string;
    lane?: KanbanLane;
    briefId?: string;
    assigneeId?: string;
    priority?: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): KanbanCard | null {
    const board = this.getBoard(boardId);
    if (!board) return null;

    const now = new Date().toISOString();
    const newCard: KanbanCard = {
      id: `card_${randomUUID().slice(0, 8)}`,
      title: card.title,
      description: card.description || "",
      lane: card.lane || "backlog",
      briefId: card.briefId,
      assigneeId: card.assigneeId,
      priority: card.priority ?? 1,
      tags: card.tags || [],
      createdAt: now,
      updatedAt: now,
      metadata: card.metadata || {},
    };

    board.cards.push(newCard);
    board.updatedAt = now;
    this.saveBoard(board);
    return newCard;
  }

  /** Move a card to a different lane */
  moveCard(boardId: string, cardId: string, targetLane: KanbanLane): KanbanCard | null {
    const board = this.getBoard(boardId);
    if (!board) return null;

    const card = board.cards.find((c) => c.id === cardId);
    if (!card) return null;

    const now = new Date().toISOString();
    card.lane = targetLane;
    card.updatedAt = now;
    if (targetLane === "done") card.completedAt = now;

    board.updatedAt = now;
    this.saveBoard(board);
    return card;
  }

  /** Update card fields */
  updateCard(boardId: string, cardId: string, updates: Partial<Pick<KanbanCard, "title" | "description" | "assigneeId" | "priority" | "tags" | "metadata">>): KanbanCard | null {
    const board = this.getBoard(boardId);
    if (!board) return null;

    const card = board.cards.find((c) => c.id === cardId);
    if (!card) return null;

    const now = new Date().toISOString();
    if (updates.title !== undefined) card.title = updates.title;
    if (updates.description !== undefined) card.description = updates.description;
    if (updates.assigneeId !== undefined) card.assigneeId = updates.assigneeId;
    if (updates.priority !== undefined) card.priority = updates.priority;
    if (updates.tags !== undefined) card.tags = updates.tags;
    if (updates.metadata !== undefined) card.metadata = { ...card.metadata, ...updates.metadata };
    card.updatedAt = now;
    board.updatedAt = now;
    this.saveBoard(board);
    return card;
  }

  /** Delete a card from a board */
  deleteCard(boardId: string, cardId: string): boolean {
    const board = this.getBoard(boardId);
    if (!board) return false;

    const idx = board.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return false;

    board.cards.splice(idx, 1);
    board.updatedAt = new Date().toISOString();
    this.saveBoard(board);
    return true;
  }

  /** Get cards by lane */
  getCardsByLane(boardId: string, lane: KanbanLane): KanbanCard[] {
    const board = this.getBoard(boardId);
    if (!board) return [];
    return board.cards.filter((c) => c.lane === lane);
  }

  // ── Utility ────────────────────────────────────────────────────

  /** Get lane display info */
  static getLaneInfo(lane: KanbanLane): { label: string; color: string; icon: string } {
    const labels: Record<KanbanLane, string> = {
      backlog: "Backlog",
      ready: "Ready",
      running: "Running",
      review: "Review",
      done: "Done",
    };
    return { label: labels[lane], color: LANE_COLORS[lane], icon: LANE_ICONS[lane] };
  }

  /** Get priority label */
  static getPriorityLabel(priority: number): string {
    return PRIORITY_LABELS[priority] || "normal";
  }

  /** Default lanes */
  static getDefaultLanes(): KanbanLane[] {
    return [...DEFAULT_LANES];
  }
}