/**
 * @tekton/agentpilot — Multi-Agent Real Estate AI System
 *
 * Orchestrator + 9 specialized sub-agents for WA State / NWMLS market.
 */

// Orchestrator
export { Orchestrator } from "./orchestrator.js";
export type { OrchestratorResponse, RoutingDecision } from "./orchestrator.js";

// Agent Registry
export { AGENT_REGISTRY, getAgent, listAgents } from "./registry.js";
export type { AgentRuntime } from "./registry.js";

// Types
export type {
  AgentId,
  AgentDefinition,
  ToolDefinition,
  ToolHandler,
  DelegationRequest,
  DelegationResult,
  RoutePriority,
  OrchestratorConfig,
  PropertyData,
  ContactData,
  PipelineStage,
  BuyerProfile,
  SellerProfile,
  TransactionData,
  TransactionStatus,
  TransactionParties,
  TransactionDates,
  ChecklistItem,
  TransactionDocument,
  CMAData,
  ComparableProperty,
  Adjustment,
  MarketTrends,
  NWMLSForm,
  FormField,
  FormData,
  MarketingContent,
  OpenHouseData,
  OpenHouseAttendee,
  ShowingData,
  ItineraryData,
  RouteStop,
  CommissionInput,
  NetSheetInput,
  MortgageInput,
  PITIInput,
  AffordabilityInput,
  REETInput,
  AmortizationInput,
} from "./types.js";

// Calculator (real implementations)
export {
  calculateCommission,
  calculateREET,
  calculateNetSheet,
  calculateBuyerCosts,
  calculateMortgage,
  calculatePITI,
  calculateAffordability,
  generateAmortization,
  calculateRefinance,
  calculateInvestment,
  calculateSeventyRule,
  prorateTax,
  prorateHOA,
  pricePerSqft,
  costPerAcre,
  futureValue,
  ltv,
  pmiEstimate,
  earnestMoney,
  sqftToAcres,
  acresToSqft,
  rectangleArea,
  triangleArea,
  REET_TIERS,
} from "./tools/calculator.js";

// Calculator result types
export type {
  CommissionResult,
  REETResult,
  NetSheetResult,
  BuyerCostResult,
  MortgageResult,
  PITIResult,
  AffordabilityResult,
  AmortizationEntry,
  RefinanceResult,
  InvestmentResult,
  RefinanceInput,
  InvestmentInput,
} from "./tools/calculator.js";

// Prompts
export {
  ORCHESTRATOR_PROMPT,
  EMAIL_MEDIA_PROMPT,
  MLS_LISTING_PROMPT,
  MARKET_INTELLIGENCE_PROMPT,
  FORMS_DOCUMENTS_PROMPT,
  TRANSACTION_PROMPT,
  CRM_LEADS_PROMPT,
  CALCULATOR_PROMPT,
  MARKETING_CONTENT_PROMPT,
  SCHEDULING_LOGISTICS_PROMPT,
} from "./prompts/index.js";