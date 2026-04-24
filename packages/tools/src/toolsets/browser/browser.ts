import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";

// Lazy Playwright import — playwright is a peer dependency
interface BrowserLike {
  newContext(options?: Record<string, unknown>): Promise<ContextLike>;
  close(): Promise<void>;
  isConnected(): boolean;
}
interface ContextLike {
  newPage(): Promise<PageLike>;
}
interface PageLike {
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
  title(): Promise<string>;
  accessibility: { snapshot(): Promise<AccessibilityNode> };
  click(selector: string): Promise<void>;
  locator(selector: string): { fill(text: string): Promise<void>; type(text: string): Promise<void>; first: PageLike };
  keyboard: { press(key: string): Promise<void> };
  mouse: { wheel(dx: number, dy: number): Promise<void> };
  goBack(): Promise<void>;
  url(): string;
  waitForTimeout(ms: number): Promise<void>;
  evaluate(fn: () => unknown): Promise<unknown>;
  isClosed(): boolean;
  on(event: string, callback: (...args: unknown[]) => void): void;
}
interface AccessibilityNode {
  role?: string;
  name?: string;
  value?: string;
  children?: AccessibilityNode[];
}

let _browser: BrowserLike | null = null;
let _page: PageLike | null = null;

async function getBrowser(): Promise<BrowserLike> {
  if (!_browser || !_browser.isConnected()) {
    try {
      // @ts-expect-error playwright is an optional peer dependency
      const pw = await import("playwright");
      _browser = await pw.chromium.launch({ headless: true }) as unknown as BrowserLike;
    } catch {
      throw new Error("Playwright not installed. Run: npm install playwright && npx playwright install chromium");
    }
  }
  return _browser;
}

async function getPage(): Promise<PageLike> {
  const browser = await getBrowser();
  if (!_page || _page.isClosed()) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    _page = await context.newPage();
  }
  return _page;
}

let refCounter = 0;

function formatSnapshot(node: AccessibilityNode, indent = 0): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);
  const ref = `@e${++refCounter}`;
  const role = node.role ?? "unknown";
  const name = node.name ?? "";

  if (role === "RootElement" || role === "WebArea") {
    for (const child of node.children ?? []) {
      lines.push(formatSnapshot(child, indent));
    }
  } else if (role !== "text" || name) {
    lines.push(`${prefix}[${role}] ${ref} ${name}`);
    for (const child of node.children ?? []) {
      lines.push(formatSnapshot(child, indent + 1));
    }
  }
  return lines.join("\n");
}

export const browserNavigateTool: ToolDefinition = {
  name: "browser_navigate",
  toolset: "browser",
  description: "Navigate browser to URL and initialize session.",
  parameters: Type.Object({ url: Type.String() }),
  async execute(params): Promise<ToolResult> {
    try {
      const page = await getPage();
      await page.goto(params.url as string, { waitUntil: "domcontentloaded", timeout: 30000 } as Record<string, unknown>);
      const title = await page.title();
      return { content: `Navigated to: ${params.url}\nTitle: ${title}` };
    } catch (err) {
      return { content: `Navigation error: ${err}`, isError: true };
    }
  },
};

export const browserSnapshotTool: ToolDefinition = {
  name: "browser_snapshot",
  toolset: "browser",
  description: "Get accessibility tree snapshot with ref IDs.",
  parameters: Type.Object({}),
  async execute(): Promise<ToolResult> {
    try {
      const page = await getPage();
      const snapshot = await page.accessibility.snapshot();
      refCounter = 0;
      const formatted = formatSnapshot(snapshot as AccessibilityNode);
      return { content: formatted || "Empty page" };
    } catch (err) {
      return { content: `Snapshot error: ${err}`, isError: true };
    }
  },
};

export const browserClickTool: ToolDefinition = {
  name: "browser_click",
  toolset: "browser",
  description: "Click element by ref ID from snapshot.",
  parameters: Type.Object({ ref: Type.String({ description: "Element ref ID" }) }),
  async execute(params): Promise<ToolResult> {
    try {
      const page = await getPage();
      const ref = params.ref as string;
      try { await page.click(`text=${ref}`); return { content: `Clicked: ${ref}` }; } catch {}
      try { await page.click(`#${ref}`); return { content: `Clicked: ${ref}` }; } catch {}
      return { content: `Could not find element: ${ref}`, isError: true };
    } catch (err) {
      return { content: `Click error: ${err}`, isError: true };
    }
  },
};

export const browserTypeTool: ToolDefinition = {
  name: "browser_type",
  toolset: "browser",
  description: "Type text into input element by ref ID.",
  parameters: Type.Object({
    ref: Type.String({ description: "Element ref ID" }),
    text: Type.String({ description: "Text to type" }),
    clear: Type.Optional(Type.Boolean({ description: "Clear existing text first" })),
  }),
  async execute(params): Promise<ToolResult> {
    try {
      const page = await getPage();
      const ref = params.ref as string;
      const text = params.text as string;
      const locator = page.locator(`[placeholder*="${ref}"], input[name*="${ref}"], textarea[name*="${ref}"]`);
      if (params.clear) {
        await locator.fill(text);
      } else {
        await locator.type(text);
      }
      return { content: `Typed "${text}" into ${ref}` };
    } catch (err) {
      return { content: `Type error: ${err}`, isError: true };
    }
  },
};

export const browserPressTool: ToolDefinition = {
  name: "browser_press",
  toolset: "browser",
  description: "Press keyboard key in browser.",
  parameters: Type.Object({ key: Type.String() }),
  async execute(params): Promise<ToolResult> {
    try {
      const page = await getPage();
      await page.keyboard.press(params.key as string);
      return { content: `Pressed: ${params.key}` };
    } catch (err) {
      return { content: `Press error: ${err}`, isError: true };
    }
  },
};

export const browserScrollTool: ToolDefinition = {
  name: "browser_scroll",
  toolset: "browser",
  description: "Scroll page in direction.",
  parameters: Type.Object({
    direction: Type.Union([Type.Literal("up"), Type.Literal("down"), Type.Literal("left"), Type.Literal("right")]),
    amount: Type.Optional(Type.Number()),
  }),
  async execute(params): Promise<ToolResult> {
    try {
      const page = await getPage();
      const direction = params.direction as string;
      const amount = (params.amount as number) ?? 500;
      const deltas: Record<string, [number, number]> = { up: [0, -amount], down: [0, amount], left: [-amount, 0], right: [amount, 0] };
      const [dx, dy] = deltas[direction] ?? [0, amount];
      await page.mouse.wheel(dx, dy);
      return { content: `Scrolled ${direction} ${amount}px` };
    } catch (err) {
      return { content: `Scroll error: ${err}`, isError: true };
    }
  },
};

export const browserBackTool: ToolDefinition = {
  name: "browser_back",
  toolset: "browser",
  description: "Navigate back in browser history.",
  parameters: Type.Object({}),
  async execute(): Promise<ToolResult> {
    try {
      const page = await getPage();
      await page.goBack();
      return { content: `Navigated back to: ${page.url()}` };
    } catch (err) {
      return { content: `Back error: ${err}`, isError: true };
    }
  },
};

export const browserConsoleTool: ToolDefinition = {
  name: "browser_console",
  toolset: "browser",
  description: "Get console output and JS errors.",
  parameters: Type.Object({}),
  async execute(): Promise<ToolResult> {
    try {
      const page = await getPage();
      const logs: string[] = [];
      page.on("console", (msg: unknown) => {
        const m = msg as { type: () => string; text: () => string };
        logs.push(`[${m.type()}] ${m.text()}`);
      });
      page.on("pageerror", (err: unknown) => {
        const e = err as { message: string };
        logs.push(`[ERROR] ${e.message}`);
      });
      await page.waitForTimeout(500);
      return { content: logs.join("\n") || "No console output" };
    } catch (err) {
      return { content: `Console error: ${err}`, isError: true };
    }
  },
};

export const browserGetImagesTool: ToolDefinition = {
  name: "browser_get_images",
  toolset: "browser",
  description: "List all images on current page.",
  parameters: Type.Object({}),
  async execute(): Promise<ToolResult> {
    try {
      const page = await getPage();
      interface ImgInfo { src: string; alt: string; width: number; height: number }
      const images = await page.evaluate(() => {
        // Run in browser context
        return (Array as unknown as any).from(document.images).map((img: any) => ({
          src: img.src, alt: img.alt || "", width: img.naturalWidth, height: img.naturalHeight,
        }));
      }) as Array<{ src: string; alt: string; width: number; height: number }>;
      return { content: images.map((img, i) => `Image ${i + 1}: [${img.alt}](${img.src}) ${img.width}x${img.height}`).join("\n") || "No images" };
    } catch (err) {
      return { content: `Get images error: ${err}`, isError: true };
    }
  },
};

export const browserVisionTool: ToolDefinition = {
  name: "browser_vision",
  toolset: "browser",
  description: "Screenshot + vision AI analysis. Requires vision model configuration.",
  parameters: Type.Object({ prompt: Type.Optional(Type.String()) }),
  async execute(): Promise<ToolResult> {
    return { content: "Requires vision model configuration. Set up an auxiliary vision model in config." };
  },
};

export const browserCdpTool: ToolDefinition = {
  name: "browser_cdp",
  toolset: "browser",
  description: "Send raw Chrome DevTools Protocol command. Requires CDP configuration.",
  parameters: Type.Object({
    method: Type.String(),
    params: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  }),
  async execute(): Promise<ToolResult> {
    return { content: "CDP requires low-level browser access. Configure via browser.cdp in config." };
  },
};