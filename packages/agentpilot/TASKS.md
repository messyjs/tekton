# AgentPilot — Feature Gap & Task List

## Current State
- Hono server on port 7799 serving inline SPA (React + Leaflet)
- 30 mock listings hardcoded in `server.ts`
- Only source: NWMLS (tool definitions exist, no actual data connection)
- Dark theme already on SPA (body background `#0f172a`) but **map tiles are light**
- Emojis throughout UI (nav icons, panel headers, sidebar logo)
- No local AI / model download

## WA Real Estate Sources (to scrape/integrate)

### Primary (APIs / Structured Data)
| Source | URL | Type | Access |
|--------|-----|------|--------|
| Zillow | zillow.com | API (blocked, needs scraping) | Scraping |
| Redfin | redfin.com | API (public listing pages) | Scraping |
| Realtor.com | realtor.com | Listing pages with structured data | Scraping |
| NWMLS | nwmls.com | RESO API (requires agent login) | API (existing tools) |
| Craigslist | seattle.craigslist.org/search/reo | Free listings, HTML scraping | Scraping |

### Brokerage / Franchise Sites
| Source | URL | Notes |
|--------|-----|-------|
| Coldwell Banker | coldwellbanker.com | WA listings |
| RE/MAX | remax.com | WA listings |
| Century 21 | century21.com | WA listings |
| Keller Williams | kw.com | WA listings |
| Windermere | windermere.com | PNW-focused, WA-heavy |
| John L Scott | johnlscott.com | WA-based brokerage |
| RE/City | recity.com | Seattle-focused |

### Aggregators / Niche
| Source | URL | Notes |
|--------|-----|-------|
| Estately | estately.com | Clean listing pages |
| Homes.com | homes.com | Nationwide, WA section |
| HomeFinder | homefinder.com | WA listings |
| ForSaleByOwner | fsbo.com | Owner-sold, no agent |
| LandWatch | landwatch.com | WA land & rural |
| LoopNet | loopnet.com | Commercial WA real estate |

### Government / Public
| Source | URL | Notes |
|--------|-----|-------|
| WA County Assessor APIs | Various | Tax data, ownership, valuations |
| HUD Homes | hudhomestore.com | FHA foreclosures |
| Fannie Mae HomePath | homepath.fanniemae.com | REO properties |
| Freddie Mac HomeSteps | homesteps.com | REO properties |

### Auction / Distressed
| Source | URL | Notes |
|--------|-----|-------|
| Auction.com | auction.com | Foreclosure auctions |
| Hubzu | hubzu.com | Bank-owned |
| RealtyTrac | realtytrac.com | Pre-foreclosures |

## Task List

### Critical

- [ ] **1. Dark map tiles** — Switch Leaflet tile layer to dark theme (CartoDB Dark Matter or similar). File: `spa.ts` MapView tileLayer URL
- [ ] **2. Remove all emojis** — Replace sidebar icons, panel headers, title with text or SVG icons. Files: `spa.ts` (sidebarItems, panel headers), `server.ts` (console log)
- [ ] **3. Multi-source listing data model** — Add `sources: string[]` field to listings. When same address appears from multiple sources, merge into single pin with source list. File: `server.ts` listing type, `spa.ts` popup rendering
- [ ] **4. Source display in pin popup** — Show source badges (e.g., "Zillow · Redfin · NWMLS") in the Leaflet popup when clicking a pin. File: `spa.ts` marker popup HTML
- [ ] **5. Scraper architecture** — Build a scraping service that pulls from all WA sources above, deduplicates by address, and stores in a listings database. New: `src/scrapers/` directory with per-source scrapers

### Important

- [ ] **6. Local AI model download** — Add local LLM support (same as Tekton mobile): GGUF model catalog, llama.cpp engine download, on-device inference. New: `src/ai/` directory
- [ ] **7. AI chat with local model** — Replace the current OpenAI-routed `/api/chat` with option to use local model. File: `server.ts` chat endpoint, new `src/ai/chat.ts`
- [ ] **8. Per-model system prompt** — Each model gets a configurable system prompt (default: WA real estate expert). File: `src/ai/model-config.ts`
- [ ] **9. Custom model import** — Users can add GGUF URLs or point to a local/server model. File: model catalog UI in SPA

### Nice to Have

- [ ] **10. Listing detail panel** — Full property details with photo carousel, source links, price history. File: `spa.ts` new panel component
- [ ] **11. Saved searches / alerts** — Persist filter configurations, notify on new matches. New: `src/services/alerts.ts`
- [ ] **12. Real NWMLS integration** — Wire up the existing tool definitions to actual NWMLS API (requires agent credentials). File: `src/agents/tools/mls-listing-tools.ts`
- [ ] **13. Investment analysis overlay** — Cap rate, cash-on-cash, rent estimate overlays on map pins. File: `spa.ts`, calculator endpoints