/**
 * Role Definitions Registry — Maps role IDs to RoleDefinitions.
 */
import type { RoleDefinition } from "../../types.js";
import { validateRole } from "./base-role.js";

// Audio roles
import { dspEngineer } from "./audio/dsp-engineer.js";
import { audioUIDesigner } from "./audio/audio-ui-designer.js";
import { presetArchitect } from "./audio/preset-architect.js";
import { audioBuildEngineer } from "./audio/audio-build-engineer.js";

// Web roles
import { frontendDeveloper } from "./web/frontend-developer.js";
import { backendDeveloper } from "./web/backend-developer.js";
import { devopsAgent } from "./web/devops-agent.js";

// Desktop roles
import { systemsArchitect } from "./desktop/systems-architect.js";
import { coreDeveloper } from "./desktop/core-developer.js";
import { uiBuilder } from "./desktop/ui-builder.js";
import { installerEngineer } from "./desktop/installer-engineer.js";

// Unreal roles
import { gameplayProgrammer } from "./unreal/gameplay-programmer.js";
import { blueprintDesigner } from "./unreal/blueprint-designer.js";
import { levelBuilder } from "./unreal/level-builder.js";
import { shaderAuthor } from "./unreal/shader-author.js";

// Mobile roles
import { mobileArchitect } from "./mobile/mobile-architect.js";
import { platformIntegrator } from "./mobile/platform-integrator.js";

// CAD roles
import { parametricDesigner } from "./cad/parametric-designer.js";
import { mechanicalEngineer } from "./cad/mechanical-engineer.js";
import { renderAgent } from "./cad/render-agent.js";
import { dfmReviewer } from "./cad/dfm-reviewer.js";

// Shared roles
import { documentationWriter } from "./shared/documentation-writer.js";
import { configManager } from "./shared/config-manager.js";

export { validateRole, buildSystemPrompt } from "./base-role.js";

export const roleRegistry: Record<string, RoleDefinition> = {
  // Audio
  "dsp-engineer": dspEngineer,
  "audio-ui-designer": audioUIDesigner,
  "preset-architect": presetArchitect,
  "audio-build-engineer": audioBuildEngineer,
  // Web
  "frontend-developer": frontendDeveloper,
  "backend-developer": backendDeveloper,
  "devops-agent": devopsAgent,
  // Desktop
  "systems-architect": systemsArchitect,
  "core-developer": coreDeveloper,
  "ui-builder": uiBuilder,
  "installer-engineer": installerEngineer,
  // Unreal
  "gameplay-programmer": gameplayProgrammer,
  "blueprint-designer": blueprintDesigner,
  "level-builder": levelBuilder,
  "shader-author": shaderAuthor,
  // Mobile
  "mobile-architect": mobileArchitect,
  "platform-integrator": platformIntegrator,
  // CAD
  "parametric-designer": parametricDesigner,
  "mechanical-engineer": mechanicalEngineer,
  "render-agent": renderAgent,
  "dfm-reviewer": dfmReviewer,
  // Shared
  "documentation-writer": documentationWriter,
  "config-manager": configManager,
};

/**
 * Get a role definition by ID.
 */
export function getRoleDefinition(roleId: string): RoleDefinition | undefined {
  return roleRegistry[roleId];
}

/**
 * Get all role IDs.
 */
export function listRoleIds(): string[] {
  return Object.keys(roleRegistry);
}