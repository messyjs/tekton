---
name: native-mcp
description: "Built-in MCP client for connecting to MCP servers and using their tools."
version: 1.0.0
metadata:
  tekton:
    tags: ["mcp", "protocol", "client", "tools"]
    category: mcp
    confidence: 0.6
---

# Native MCP Client

## When to Use
- Connecting to Model Context Protocol servers
- Extending agent capabilities with external tools
- Using MCP-provided resources

## Procedure
1. Configure MCP servers in tekton config
2. Discover: tekton mcp discover
3. List tools: tekton mcp list-servers
4. Call tool: tekton mcp call <server> <tool> <args>
5. Use resources for context

## Pitfalls
- MCP servers must be running and accessible
- Tool schemas must match expected format
- Handle connection timeouts gracefully

## Verification
- MCP servers respond to discovery
- Tools execute and return results
- Resources are accessible
