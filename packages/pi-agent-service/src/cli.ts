#!/usr/bin/env node
/**
 * CLI entry point for tekton-pi-agent
 * Delegates to the main module's CLI function
 */
import { main } from "./tekton-pi-agent/server.js";
main();