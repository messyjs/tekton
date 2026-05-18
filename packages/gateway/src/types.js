/**
 * Gateway Types — Platform adapters, message events, delivery targets, session routing.
 */
export const DEFAULT_GATEWAY_CONFIG = {
    platforms: {
        telegram: { enabled: false },
        discord: { enabled: false },
        slack: { enabled: false },
        whatsapp: { enabled: false },
        signal: { enabled: false },
        matrix: { enabled: false },
        email: { enabled: false },
        sms: { enabled: false },
        webhook: { enabled: true, port: 7701 },
        "api-server": { enabled: true, port: 7700 },
    },
    dataDir: undefined,
    maxMessageLength: 4096,
    rateLimitPerMinute: 30,
};
//# sourceMappingURL=types.js.map