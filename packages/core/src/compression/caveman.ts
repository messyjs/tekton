export type CompressionTier = "none" | "lite" | "full" | "ultra";

interface ProtectedRegion {
  start: number;
  end: number;
  text: string;
}

const CODE_BLOCK_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`]+`/g;
const URL_RE = /https?:\/\/[^\s)>"']+/g;
const QUOTED_RE = /"[^"]*"|'[^']*'/g;

function extractProtected(text: string): { protected: ProtectedRegion[]; stripped: string } {
  const regions: ProtectedRegion[] = [];
  const patterns = [CODE_BLOCK_RE, INLINE_CODE_RE, QUOTED_RE, URL_RE];

  let result = text;
  for (const pattern of patterns) {
    const matches = [...result.matchAll(pattern)];
    for (const m of matches) {
      if (m.index !== undefined) {
        regions.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
      }
    }
  }

  let idx = 0;
  for (const r of regions) {
    const placeholder = `\x00${idx}\x00`;
    result = result.slice(0, r.start) + placeholder + result.slice(r.end);
    idx++;
  }

  return { protected: regions, stripped: result };
}

function restoreProtected(text: string, regions: ProtectedRegion[]): string {
  let result = text;
  for (let i = regions.length - 1; i >= 0; i--) {
    const placeholder = `\x00${i}\x00`;
    result = result.replace(placeholder, regions[i].text);
  }
  return result;
}

function compressLite(text: string): string {
  let t = text;
  t = t.replace(/\bthe\b/gi, "");
  t = t.replace(/\ba\b(?=\s+[aeiou])/gi, "");
  t = t.replace(/\ba\b/gi, "");
  t = t.replace(/\ban\b/gi, "");
  // Contract negations
  t = t.replace(/\bis not\b/gi, "isn't");
  t = t.replace(/\bare not\b/gi, "aren't");
  t = t.replace(/\bdo not\b/gi, "don't");
  t = t.replace(/\bdoes not\b/gi, "doesn't");
  t = t.replace(/\bcan not\b/gi, "can't");
  t = t.replace(/\bcannot\b/gi, "can't");
  t = t.replace(/\bwill not\b/gi, "won't");
  t = t.replace(/\bshould not\b/gi, "shouldn't");
  t = t.replace(/\bwould not\b/gi, "wouldn't");
  // Strip filler words
  t = t.replace(/\bvery\b/gi, "");
  t = t.replace(/\breally\b/gi, "");
  t = t.replace(/\bjust\b/gi, "");
  t = t.replace(/\bactually\b/gi, "");
  t = t.replace(/\bbasically\b/gi, "");
  t = t.replace(/\bliterally\b/gi, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

function compressFull(text: string): string {
  let t = compressLite(text);
  t = t.replace(/\bin order to\b/gi, "to");
  t = t.replace(/\bas well as\b/gi, "and");
  t = t.replace(/\bdue to the fact that\b/gi, "because");
  t = t.replace(/\bfor the purpose of\b/gi, "to");
  t = t.replace(/\bat this point in time\b/gi, "now");
  t = t.replace(/\bin the event that\b/gi, "if");
  t = t.replace(/\bwith regard to\b/gi, "regarding");
  t = t.replace(/\bin spite of\b/gi, "despite");
  t = t.replace(/\bon the other hand\b/gi, "however");
  t = t.replace(/\bby means of\b/gi, "via");
  t = t.replace(/\ba large number of\b/gi, "many");
  t = t.replace(/\bthe majority of\b/gi, "most");
  t = t.replace(/\bprior to\b/gi, "before");
  t = t.replace(/\bsubsequent to\b/gi, "after");
  t = t.replace(/\bin conjunction with\b/gi, "with");
  t = t.replace(/\bwith respect to\b/gi, "regarding");
  t = t.replace(/\bin addition to\b/gi, "besides");
  t = t.replace(/\bit is important to note that\b/gi, "");
  t = t.replace(/\bplease note that\b/gi, "");
  t = t.replace(/\bI would like to\b/gi, "");
  t = t.replace(/\bneed to\b/gi, "must");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

const ULTRA_ABBREVS: Record<string, string> = {
  "function": "fn",
  "variable": "var",
  "parameter": "param",
  "parameters": "params",
  "argument": "arg",
  "arguments": "args",
  "configuration": "cfg",
  "repository": "repo",
  "directory": "dir",
  "directories": "dirs",
  "component": "cmp",
  "components": "cmps",
  "definition": "def",
  "implementation": "impl",
  "environment": "env",
  "reference": "ref",
  "references": "refs",
  "property": "prop",
  "properties": "props",
  "attribute": "attr",
  "attributes": "attrs",
  "dependency": "dep",
  "dependencies": "deps",
  "application": "app",
  "authentication": "auth",
  "authorization": "authz",
  "operation": "op",
  "operations": "ops",
  "initialize": "init",
  "synchronize": "sync",
  "synchronous": "sync",
  "asynchronous": "async",
  "development": "dev",
  "production": "prod",
  "performance": "perf",
  "information": "info",
  "documentation": "docs",
  "specification": "spec",
  "specifications": "specs",
  "management": "mgmt",
  "administrator": "admin",
  "navigation": "nav",
  "utility": "util",
  "utilities": "utils",
  "callback": "cb",
  "expression": "expr",
  "statement": "stmt",
  "conditional": "cond",
  "condition": "cond",
  "conditions": "conds",
  "iterator": "iter",
  "iteration": "iter",
  "identifier": "id",
  "identifiers": "ids",
  "constant": "const",
  "constants": "consts",
  "structure": "struct",
  "structures": "structs",
  "enumeration": "enum",
  "enumerations": "enums",
  "interface": "iface",
  "instance": "inst",
  "instances": "insts",
  "return": "ret",
  "returns": "ret",
  "response": "resp",
  "responses": "resps",
  "request": "req",
  "requests": "reqs",
  "exception": "exc",
  "exceptions": "excs",
  "message": "msg",
  "messages": "msgs",
  "connection": "conn",
  "connections": "conns",
  "transaction": "txn",
  "transactions": "txns",
  "command": "cmd",
  "commands": "cmds",
  "execution": "exec",
  "processor": "proc",
  "process": "proc",
  "processes": "procs",
  "service": "svc",
  "services": "svcs",
  "module": "mod",
  "modules": "mods",
  "network": "net",
  "database": "db",
  "databases": "dbs",
  "object": "obj",
  "objects": "objs",
  "string": "str",
  "strings": "strs",
  "number": "num",
  "numbers": "nums",
  "integer": "int",
  "integers": "ints",
  "boolean": "bool",
  "character": "char",
  "characters": "chars",
  "value": "val",
  "values": "vals",
  "element": "elem",
  "elements": "elems",
  "index": "idx",
  "indices": "idxs",
  "position": "pos",
  "positions": "pos",
  "result": "res",
  "results": "res",
  "source": "src",
  "sources": "srcs",
  "target": "tgt",
  "targets": "tgts",
  "destination": "dst",
  "output": "out",
  "input": "in",
  "resource": "res",
  "resources": "res",
  "extension": "ext",
  "error": "err",
  "errors": "errs",
  "warning": "warn",
  "warnings": "warns",
  "failure": "fail",
  "failures": "fails",
  "buffer": "buf",
  "buffers": "bufs",
  "context": "ctx",
  "contexts": "ctxs",
  "handler": "hdlr",
  "handlers": "hdlrs",
  "listener": "lstnr",
  "listeners": "lstnrs",
  "provider": "prov",
  "providers": "provs",
  "receiver": "rcvr",
  "receivers": "rcvrs",
  "sender": "sndr",
  "senders": "sndrs",
  "transformer": "xform",
  "transformers": "xforms",
  "middleware": "mw",
  "success": "ok",
  "register": "reg",
  "registers": "regs",
};

function compressUltra(text: string): string {
  let t = compressFull(text);
  for (const [full, abbr] of Object.entries(ULTRA_ABBREVS)) {
    const re = new RegExp(`\\b${full}\\b`, "gi");
    t = t.replace(re, abbr);
  }
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

export function compress(text: string, tier: CompressionTier): string {
  if (tier === "none") return text;

  const { protected: regions, stripped } = extractProtected(text);

  let compressed: string;
  switch (tier) {
    case "lite":
      compressed = compressLite(stripped);
      break;
    case "full":
      compressed = compressFull(stripped);
      break;
    case "ultra":
      compressed = compressUltra(stripped);
      break;
    default:
      compressed = stripped;
  }

  return restoreProtected(compressed, regions);
}

export function decompress(text: string): string {
  // Rule-based compression is lossy; cavemem-native decompress would go here
  return text;
}

export function getCompressionRatio(original: string, compressed: string): number {
  if (original.length === 0) return 1;
  return compressed.length / original.length;
}

export function estimateTokens(text: string): number {
  const codeBlockMatches = text.match(/```[\s\S]*?```/g);
  const codeChars = codeBlockMatches ? codeBlockMatches.join("").length : 0;
  const textChars = text.length - codeChars;
  return Math.ceil((textChars / 4) + (codeChars / 2.5));
}