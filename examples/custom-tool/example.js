// Tool handler
async function getWeather(params) {
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
export {};
//# sourceMappingURL=example.js.map