import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "../../registry.js";
import type { ToolResult } from "../../registry.js";

export const haListEntitiesTool: ToolDefinition = {
  name: "ha_list_entities",
  toolset: "homeassistant",
  description: "List Home Assistant entities. Filter by domain or area.",
  parameters: Type.Object({
    domain: Type.Optional(Type.String({ description: "Filter by domain (light, switch, sensor)" })),
    area: Type.Optional(Type.String({ description: "Filter by area name" })),
  }),
  requiresEnv: ["HOMEASSISTANT_URL", "HOMEASSISTANT_TOKEN"],
  async execute(params, context): Promise<ToolResult> {
    if (!context.env.HOMEASSISTANT_URL) {
      return { content: "Home Assistant not configured. Set HOMEASSISTANT_URL and HOMEASSISTANT_TOKEN.", isError: true };
    }
    try {
      const resp = await fetch(`${context.env.HOMEASSISTANT_URL}/api/states`, {
        headers: { Authorization: `Bearer ${context.env.HOMEASSISTANT_TOKEN}` },
      });
      const states = await resp.json() as Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>;
      let filtered = states;
      if (params.domain) {
        const domain = params.domain as string;
        filtered = filtered.filter(s => s.entity_id.startsWith(`${domain}.`));
      }
      if (params.area) {
        const area = params.area as string;
        filtered = filtered.filter(s => (s.attributes.area as string ?? "") === area);
      }
      return { content: filtered.map(s => `${s.entity_id}: ${s.state}`).slice(0, 50).join("\n") };
    } catch (err) {
      return { content: `Home Assistant error: ${err}`, isError: true };
    }
  },
};

export const haGetStateTool: ToolDefinition = {
  name: "ha_get_state",
  toolset: "homeassistant",
  description: "Get detailed state of a single Home Assistant entity.",
  parameters: Type.Object({ entity_id: Type.String() }),
  requiresEnv: ["HOMEASSISTANT_URL", "HOMEASSISTANT_TOKEN"],
  async execute(params, context): Promise<ToolResult> {
    if (!context.env.HOMEASSISTANT_URL) {
      return { content: "Home Assistant not configured.", isError: true };
    }
    try {
      const resp = await fetch(`${context.env.HOMEASSISTANT_URL}/api/states/${params.entity_id}`, {
        headers: { Authorization: `Bearer ${context.env.HOMEASSISTANT_TOKEN}` },
      });
      const state = await resp.json() as Record<string, unknown>;
      return { content: JSON.stringify(state, null, 2) };
    } catch (err) {
      return { content: `Home Assistant error: ${err}`, isError: true };
    }
  },
};

export const haCallServiceTool: ToolDefinition = {
  name: "ha_call_service",
  toolset: "homeassistant",
  description: "Call a Home Assistant service to control a device.",
  parameters: Type.Object({
    domain: Type.String({ description: "Service domain (e.g. light, switch)" }),
    service: Type.String({ description: "Service name (e.g. turn_on, toggle)" }),
    entity_id: Type.Optional(Type.String()),
    data: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  }),
  requiresEnv: ["HOMEASSISTANT_URL", "HOMEASSISTANT_TOKEN"],
  async execute(params, context): Promise<ToolResult> {
    if (!context.env.HOMEASSISTANT_URL) {
      return { content: "Home Assistant not configured.", isError: true };
    }
    try {
      const body: Record<string, unknown> = {};
      if (params.entity_id) body.entity_id = params.entity_id;
      if (params.data) Object.assign(body, params.data);

      const resp = await fetch(`${context.env.HOMEASSISTANT_URL}/api/services/${params.domain}/${params.service}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${context.env.HOMEASSISTANT_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { content: resp.ok ? `Called ${params.domain}.${params.service}` : `Error: ${resp.status}` };
    } catch (err) {
      return { content: `Home Assistant error: ${err}`, isError: true };
    }
  },
};

export const haListServicesTool: ToolDefinition = {
  name: "ha_list_services",
  toolset: "homeassistant",
  description: "List available Home Assistant services.",
  parameters: Type.Object({
    domain: Type.Optional(Type.String({ description: "Filter by domain" })),
  }),
  requiresEnv: ["HOMEASSISTANT_URL", "HOMEASSISTANT_TOKEN"],
  async execute(params, context): Promise<ToolResult> {
    if (!context.env.HOMEASSISTANT_URL) {
      return { content: "Home Assistant not configured.", isError: true };
    }
    try {
      const resp = await fetch(`${context.env.HOMEASSISTANT_URL}/api/services`, {
        headers: { Authorization: `Bearer ${context.env.HOMEASSISTANT_TOKEN}` },
      });
      const services = await resp.json() as Array<{ domain: string; services: Record<string, unknown> }>;
      let filtered = services;
      if (params.domain) {
        filtered = filtered.filter(s => s.domain === params.domain);
      }
      return { content: filtered.map(d => `${d.domain}: ${Object.keys(d.services).join(", ")}`).join("\n") };
    } catch (err) {
      return { content: `Home Assistant error: ${err}`, isError: true };
    }
  },
};