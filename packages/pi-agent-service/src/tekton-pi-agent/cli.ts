#!/usr/bin/env node
/**
 * PI Agent CLI entry point.
 * Usage: tekton-pi-agent --mode http --port 7706
 *        tekton-pi-agent --mode mcp
 */
import { main } from "./server.js";
main();