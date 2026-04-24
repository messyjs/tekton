/**
 * AgentPilot — Multi-Agent System Types
 * Real estate AI companion for Washington State / NWMLS
 */
import { Type, type Static } from "@sinclair/typebox";

// ── Agent Definitions ──────────────────────────────────────────────────────

export type AgentId =
  | "orchestrator"
  | "email-media"
  | "mls-listing"
  | "market-intelligence"
  | "forms-documents"
  | "transaction"
  | "crm-leads"
  | "calculator"
  | "marketing-content"
  | "scheduling-logistics";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  domain: string;
  description: string;
  systemPrompt: string;
  tools: ToolDefinition[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Static<typeof ToolParamsSchema>;
  handler?: ToolHandler;
}

export type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;

export const ToolParamsSchema = Type.Object({
  type: Type.Literal("object"),
  properties: Type.Record(Type.String(), Type.Any()),
  required: Type.Optional(Type.Array(Type.String())),
});

// ── Routing ────────────────────────────────────────────────────────────────

export type RoutePriority = "high" | "normal" | "low";

export interface AgentRoute {
  /** Regex or keyword patterns that trigger this agent */
  patterns: string[];
  /** Which agent to route to */
  agentId: AgentId;
  /** Priority when multiple agents match */
  priority: number;
}

export interface DelegationRequest {
  /** Original user message */
  message: string;
  /** Which agent(s) to delegate to */
  agentIds: AgentId[];
  /** Context from prior agent results (for chaining) */
  context?: Record<string, unknown>;
  /** Whether to run agents in parallel or sequence */
  mode: "parallel" | "sequential";
  /** Conversation history summary */
  conversationSummary?: string;
}

export interface DelegationResult {
  agentId: AgentId;
  success: boolean;
  result?: unknown;
  error?: string;
  toolCalls?: ToolCallResult[];
}

export interface ToolCallResult {
  tool: string;
  params: Record<string, unknown>;
  result: unknown;
}

// ── Orchestrator ───────────────────────────────────────────────────────────

export interface OrchestratorConfig {
  /** LLM call function for orchestrator reasoning */
  callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>;
  /** Which agents are enabled */
  enabledAgents?: AgentId[];
  /** Whether to require user confirmation before high-stakes actions */
  requireConfirmationForDestructive?: boolean;
  /** Max parallel delegations */
  maxParallel?: number;
}

// ── Domain Types ───────────────────────────────────────────────────────────

// -- Property & Listings --
export interface PropertyData {
  address: string;
  city: string;
  state: string;
  zip: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType?: string;
  mlsNumber?: string;
  status?: "active" | "pending" | "sold" | "expired" | "withdrawn";
  lat?: number;
  lng?: number;
  photos?: string[];
  description?: string;
  features?: string[];
  hoa?: { monthly: number; includes: string[] };
  taxAssessed?: number;
  taxAnnual?: number;
}

// -- Contacts & CRM --
export interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  preferredContact?: "email" | "phone" | "text";
  role: "buyer" | "seller" | "investor" | "renter" | "vendor";
  leadSource?: string;
  pipelineStage?: PipelineStage;
  lastContactDate?: string;
  notes?: string;
  tags?: string[];
  buyerProfile?: BuyerProfile;
  sellerProfile?: SellerProfile;
}

export type PipelineStage =
  | "new-lead"
  | "contacted"
  | "qualified"
  | "active-search"
  | "under-contract"
  | "closed"
  | "past-client";

export interface BuyerProfile {
  preApprovalAmount?: number;
  preferredAreas: string[];
  propertyType?: string;
  bedsMin?: number;
  bedsMax?: number;
  bathsMin?: number;
  budgetMin?: number;
  budgetMax?: number;
  timeline?: string;
}

export interface SellerProfile {
  propertyAddress?: string;
  desiredPrice?: number;
  motivationLevel?: "high" | "medium" | "low";
  timeline?: string;
}

// -- Transactions --
export interface TransactionData {
  id: string;
  propertyAddress: string;
  mlsNumber?: string;
  listingSide: "listing" | "buy" | "dual";
  status: TransactionStatus;
  parties: TransactionParties;
  dates: TransactionDates;
  checklist: ChecklistItem[];
  documents: TransactionDocument[];
  createdAt: string;
  updatedAt: string;
}

export type TransactionStatus =
  | "under-contract"
  | "inspection"
  | "appraisal"
  | "financing"
  | "pre-closing"
  | "closing"
  | "post-closing";

export interface TransactionParties {
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  listingAgentName?: string;
  listingAgentEmail?: string;
  buyerAgentName?: string;
  buyerAgentEmail?: string;
  lenderName?: string;
  lenderEmail?: string;
  titleCompany?: string;
  escrowCompany?: string;
}

export interface TransactionDates {
  mutualAcceptance?: string;
  earnestMoneyDue?: string;
  inspectionDeadline?: string;
  appraisalDeadline?: string;
  financingDeadline?: string;
  closingDate?: string;
  possessionDate?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  status: "pending" | "complete" | "overdue" | "waived";
  dueDate?: string;
  completedDate?: string;
  notes?: string;
  required: boolean;
}

export interface TransactionDocument {
  id: string;
  type: string;
  name: string;
  status: "pending" | "received" | "signed" | "rejected";
  uploadedAt?: string;
  signedAt?: string;
  filePath?: string;
}

// -- Calculator --
export interface CommissionInput {
  salePrice: number;
  commissionRate: number;
  listingAgentSplit?: number;
  buyerAgentSplit?: number;
  brokerageSplit?: number;
}

export interface NetSheetInput {
  salePrice: number;
  listingCommission: number;
  buyerCommission?: number;
  mortgagePayoff?: number;
  localReetRate?: number;
  titleInsuranceEstimate?: number;
  escrowFee?: number;
  recordingFee?: number;
  proratedTax?: number;
  hoaTransferFee?: number;
  sellerCredits?: number;
  repairCosts?: number;
}

export interface MortgageInput {
  loanAmount: number;
  annualRate: number;
  termYears: number;
}

export interface PITIInput extends MortgageInput {
  annualPropertyTax: number;
  annualInsurance: number;
  annualPMI?: number;
}

export interface AffordabilityInput {
  grossMonthlyIncome: number;
  monthlyDebtPayments: number;
  downPayment: number;
  annualRate: number;
  termYears: number;
  annualPropertyTax: number;
  annualInsurance: number;
}

export interface REETInput {
  salePrice: number;
  localRate: number;
}

export interface AmortizationInput extends MortgageInput {
  maxMonths?: number;
}

// -- CMA --
export interface CMAData {
  subject: PropertyData;
  comparables: ComparableProperty[];
  adjustments: Adjustment[];
  adjustedPriceRange: { low: number; high: number };
  recommendedPrice: number;
  marketTrends?: MarketTrends;
}

export interface ComparableProperty extends PropertyData {
  salePrice?: number;
  saleDate?: string;
  daysOnMarket?: number;
  distanceFromSubject?: number;
  adjustments?: Adjustment[];
  adjustedPrice?: number;
}

export interface Adjustment {
  feature: string;
  amount: number;
  direction: "+" | "-";
  reason: string;
}

export interface MarketTrends {
  medianPrice?: number;
  averageDOM?: number;
  listToSaleRatio?: number;
  inventoryCount?: number;
  absorptionRate?: number;
  monthsOfSupply?: number;
}

// -- Forms --
export interface NWMLSForm {
  id: string;
  code: string;
  name: string;
  description: string;
  fields: FormField[];
}

export interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "boolean" | "select" | "currency";
  required: boolean;
  options?: string[];
  defaultValue?: unknown;
  prefillable?: boolean;
}

export interface FormData {
  formId: string;
  fieldData: Record<string, unknown>;
  generatedAt: string;
  pdfPath?: string;
  signatureStatus?: "pending" | "sent" | "signed";
}

// -- Marketing --
export interface MarketingContent {
  type: "listing-description" | "social-post" | "flyer" | "just-listed" | "just-sold" | "open-house" | "daily-digest";
  platform?: "mls" | "craigslist" | "zillow" | "instagram" | "facebook" | "email" | "print";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface OpenHouseData {
  id: string;
  property: PropertyData;
  date: string;
  startTime: string;
  endTime: string;
  agentName: string;
  attendees: OpenHouseAttendee[];
}

export interface OpenHouseAttendee {
  name: string;
  email?: string;
  phone?: string;
  workingWithAgent: boolean;
  preApproved: boolean;
  feedback?: string;
}

// -- Scheduling --
export interface ShowingData {
  id: string;
  property: PropertyData;
  requestedDateTime: string;
  confirmedDateTime?: string;
  status: "requested" | "confirmed" | "denied" | "rescheduled";
  showingInstructions?: string;
  lockboxCode?: string;
  durationMinutes?: number;
}

export interface ItineraryData {
  showings: ShowingData[];
  route: RouteStop[];
  totalTimeMinutes: number;
  totalDistanceMiles: number;
  buyerName?: string;
  date: string;
  mapUrl?: string;
}

export interface RouteStop {
  property: PropertyData;
  arrivalTime: string;
  departureTime: string;
  driveMinutesFromPrevious: number;
  driveMilesFromPrevious: number;
  showingOrderNumber: number;
}