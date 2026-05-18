import { SoulManager } from "./soul.js";
export declare const PERSONALITY_PRESETS: Record<string, string>;
export declare class PersonalityManager {
    private soulManager;
    private overlay;
    constructor(soulManager: SoulManager);
    setOverlay(personality: string): void;
    clearOverlay(): void;
    getEffectivePersonality(): string;
    hasOverlay(): boolean;
}
//# sourceMappingURL=personality.d.ts.map