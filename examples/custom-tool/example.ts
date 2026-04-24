// Custom Tool — Add a custom tool to Tekton
import { ModelRouter, compress, detectTier, loadConfig } from "@tekton/core";

/**
 * Example: Creating a custom tool
 *
 * In Tekton, tools are defined as toolset modules that export
 * tool definitions and handlers. Here's how to create a simple
 * custom tool.
 */

// Tool definition
interface WeatherToolParams {
  location: string;
  units?: "metric" | "imperial";
}

interface WeatherToolResult {
  location: string;
  temperature: number;
  conditions: string;
  humidity: number;
}

// Tool handler
async function getWeather(params: WeatherToolParams): Promise<WeatherToolResult> {
  // In production, this would call a real weather API
  // For demo, return mock data
  return {
    location: params.location,
    temperature: params.units === "metric" ? 22 : 72,
    conditions: "Partly cloudy",
    humidity: 65,
  };
}

// Tool metadata (following Tekton's tool schema)
const weatherTool = {
  name: "weather",
  description: "Get current weather conditions for a location",
  parameters: {
    type: "object",
    properties: {
      location: { type: "string", description: "City name or coordinates" },
      units: { type: "string", enum: ["metric", "imperial"], description: "Temperature units" },
    },
    required: ["location"],
  },
  handler: getWeather,
};

async function main() {
  console.log("⚡ Tekton Custom Tool Example\n");

  // Use the custom tool
  const result = await getWeather({ location: "San Francisco", units: "metric" });
  console.log("Weather result:");
  console.log(JSON.stringify(result, null, 2));

  // The tool would be registered in the tool registry like:
  // registry.registerToolset("weather", { weather: weatherTool });
  console.log("\nCustom tool ready for registration in Tekton's tool system.");
  console.log("Tool name:", weatherTool.name);
  console.log("Tool description:", weatherTool.description);
}

main().catch(console.error);