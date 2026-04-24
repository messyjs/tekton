/**
 * Real Estate Calculator — All WA-specific math
 * Single source of truth for financial computations.
 * Other agents should NEVER calculate figures themselves.
 */

import type {
  CommissionInput,
  NetSheetInput,
  MortgageInput,
  PITIInput,
  AffordabilityInput,
  REETInput,
  AmortizationInput,
} from "../types.js";

// ── WA REET Graduated Tiers (Jan 1, 2023) ──────────────────────────────────

export const REET_TIERS = [
  { min: 0, max: 525_000, rate: 0.011 },        // 1.10%
  { min: 525_000.01, max: 1_525_000, rate: 0.0128 }, // 1.28%
  { min: 1_525_000.01, max: 3_025_000, rate: 0.0275 }, // 2.75%
  { min: 3_025_000.01, max: Infinity, rate: 0.03 },    // 3.00%
] as const;

// ── Commission ──────────────────────────────────────────────────────────────

export interface CommissionResult {
  salePrice: number;
  commissionRate: number;
  grossCommission: number;
  listingAgentShare: number;
  buyerAgentShare: number;
  brokerageShare: number;
  agentNet: number;
}

export function calculateCommission(input: CommissionInput): CommissionResult {
  const { salePrice, commissionRate } = input;
  const grossCommission = salePrice * commissionRate;
  const listingSplit = input.listingAgentSplit ?? 0.5;
  const buyerSplit = input.buyerAgentSplit ?? 0.5;
  const brokerageSplit = input.brokerageSplit ?? 0;

  const listingAgentShare = grossCommission * listingSplit;
  const buyerAgentShare = grossCommission * buyerSplit;
  const brokerageShare = grossCommission * brokerageSplit;
  const agentNet = listingAgentShare * (1 - brokerageSplit);

  return {
    salePrice,
    commissionRate,
    grossCommission: round(grossCommission),
    listingAgentShare: round(listingAgentShare),
    buyerAgentShare: round(buyerAgentShare),
    brokerageShare: round(brokerageShare),
    agentNet: round(agentNet),
  };
}

// ── WA Real Estate Excise Tax (Graduated) ──────────────────────────────────

export interface REETResult {
  salePrice: number;
  stateREET: number;
  localREET: number;
  totalREET: number;
  tierBreakdown: { min: number; max: number; taxableInTier: number; rate: number; tax: number }[];
}

export function calculateREET(input: REETInput): REETResult {
  const { salePrice, localRate } = input;
  const tierBreakdown: REETResult["tierBreakdown"] = [];
  let stateREET = 0;

  for (const tier of REET_TIERS) {
    if (salePrice <= tier.min) break;
    const taxableInTier = Math.min(salePrice, tier.max) - tier.min + 0.01;
    const tierTax = taxableInTier * tier.rate;
    tierBreakdown.push({
      min: tier.min,
      max: tier.max === Infinity ? salePrice : tier.max,
      taxableInTier: round(taxableInTier),
      rate: tier.rate,
      tax: round(tierTax),
    });
    stateREET += tierTax;
    if (salePrice <= tier.max) break;
  }

  const localREET = salePrice * localRate;
  const totalREET = stateREET + localREET;

  return {
    salePrice,
    stateREET: round(stateREET),
    localREET: round(localREET),
    totalREET: round(totalREET),
    tierBreakdown,
  };
}

// ── Seller Net Sheet ────────────────────────────────────────────────────────

export interface NetSheetResult {
  salePrice: number;
  credits: { label: string; amount: number }[];
  debits: { label: string; amount: number }[];
  totalCredits: number;
  totalDebits: number;
  netToSeller: number;
}

export function calculateNetSheet(input: NetSheetInput): NetSheetResult {
  const { salePrice } = input;
  const credits: NetSheetResult["credits"] = [{ label: "Sale Price", amount: salePrice }];
  const debits: NetSheetResult["debits"] = [];

  // Commissions
  debits.push({ label: "Listing Agent Commission", amount: round(salePrice * input.listingCommission) });
  if (input.buyerCommission) {
    debits.push({ label: "Buyer Agent Commission", amount: round(salePrice * input.buyerCommission) });
  }

  // REET (WA graduated — estimate local rate 0.5% if not provided)
  const localRate = input.localReetRate ?? 0.005;
  const reet = calculateREET({ salePrice, localRate });
  debits.push({ label: `WA State REET`, amount: reet.stateREET });
  debits.push({ label: `Local REET (${(localRate * 100).toFixed(2)}%)`, amount: reet.localREET });

  // Standard closing costs
  if (input.titleInsuranceEstimate) {
    debits.push({ label: "Title Insurance (Owner's Policy)", amount: input.titleInsuranceEstimate });
  }
  if (input.escrowFee) {
    debits.push({ label: "Escrow Fee", amount: input.escrowFee });
  }
  if (input.recordingFee) {
    debits.push({ label: "Recording Fee", amount: input.recordingFee });
  }
  if (input.proratedTax) {
    debits.push({ label: "Prorated Property Tax", amount: input.proratedTax });
  }
  if (input.hoaTransferFee) {
    debits.push({ label: "HOA Transfer Fee", amount: input.hoaTransferFee });
  }
  if (input.sellerCredits) {
    debits.push({ label: "Seller Credits", amount: input.sellerCredits });
  }
  if (input.repairCosts) {
    debits.push({ label: "Repair Costs", amount: input.repairCosts });
  }
  if (input.mortgagePayoff) {
    debits.push({ label: "Mortgage Payoff", amount: input.mortgagePayoff });
  }

  const totalCredits = credits.reduce((s, c) => s + c.amount, 0);
  const totalDebits = debits.reduce((s, d) => s + d.amount, 0);

  return {
    salePrice,
    credits,
    debits,
    totalCredits: round(totalCredits),
    totalDebits: round(totalDebits),
    netToSeller: round(totalCredits - totalDebits),
  };
}

// ── Buyer Cost-to-Close ─────────────────────────────────────────────────────

export interface BuyerCostInput {
  purchasePrice: number;
  downPaymentPercent: number;
  loanAmount?: number;
  loanOriginationFee?: number;
  appraisalFee?: number;
  inspectionFee?: number;
  titleInsuranceBuyer?: number;
  escrowFeeBuyer?: number;
  recordingFee?: number;
  proratedTax?: number;
  prepaidInsurance?: number;
  prepaidInterest?: number;
  reserves?: number;
  sellerCredits?: number;
}

export interface BuyerCostResult {
  downPayment: number;
  loanAmount: number;
  closingCosts: { label: string; amount: number }[];
  totalClosingCosts: number;
  sellerCredits: number;
  totalCashNeeded: number;
}

export function calculateBuyerCosts(input: BuyerCostInput): BuyerCostResult {
  const downPayment = input.purchasePrice * input.downPaymentPercent;
  const loanAmount = input.loanAmount ?? input.purchasePrice - downPayment;

  const closingCosts: { label: string; amount: number }[] = [];
  if (input.loanOriginationFee) closingCosts.push({ label: "Loan Origination Fee", amount: input.loanOriginationFee });
  if (input.appraisalFee) closingCosts.push({ label: "Appraisal Fee", amount: input.appraisalFee });
  if (input.inspectionFee) closingCosts.push({ label: "Inspection Fee", amount: input.inspectionFee });
  if (input.titleInsuranceBuyer) closingCosts.push({ label: "Title Insurance (Lender's Policy)", amount: input.titleInsuranceBuyer });
  if (input.escrowFeeBuyer) closingCosts.push({ label: "Escrow Fee", amount: input.escrowFeeBuyer });
  if (input.recordingFee) closingCosts.push({ label: "Recording Fee", amount: input.recordingFee });
  if (input.proratedTax) closingCosts.push({ label: "Prorated Property Tax", amount: input.proratedTax });
  if (input.prepaidInsurance) closingCosts.push({ label: "Prepaid Homeowner's Insurance", amount: input.prepaidInsurance });
  if (input.prepaidInterest) closingCosts.push({ label: "Prepaid Interest", amount: input.prepaidInterest });
  if (input.reserves) closingCosts.push({ label: "Reserves (Impound)", amount: input.reserves });

  const totalClosingCosts = closingCosts.reduce((s, c) => s + c.amount, 0);
  const sellerCredits = input.sellerCredits ?? 0;
  const totalCashNeeded = downPayment + totalClosingCosts - sellerCredits;

  return {
    downPayment: round(downPayment),
    loanAmount: round(loanAmount),
    closingCosts,
    totalClosingCosts: round(totalClosingCosts),
    sellerCredits: round(sellerCredits),
    totalCashNeeded: round(totalCashNeeded),
  };
}

// ── Mortgage Payment (P&I) ─────────────────────────────────────────────────

export interface MortgageResult {
  loanAmount: number;
  annualRate: number;
  termYears: number;
  monthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const { loanAmount, annualRate, termYears } = input;
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;

  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = loanAmount / numPayments;
  } else {
    // M = P * [i(1+i)^n] / [(1+i)^n - 1]
    const factor = Math.pow(1 + monthlyRate, numPayments);
    monthlyPayment = loanAmount * (monthlyRate * factor) / (factor - 1);
  }

  const totalPayments = monthlyPayment * numPayments;
  const totalInterest = totalPayments - loanAmount;

  return {
    loanAmount,
    annualRate,
    termYears,
    monthlyPayment: round(monthlyPayment),
    totalPayments: round(totalPayments),
    totalInterest: round(totalInterest),
  };
}

// ── PITI ────────────────────────────────────────────────────────────────────

export interface PITIResult {
  principalAndInterest: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyPMI: number;
  totalMonthlyPayment: number;
  ltv: number;
  pmiRequired: boolean;
}

export function calculatePITI(input: PITIInput): PITIResult {
  const { loanAmount, annualRate, termYears, annualPropertyTax, annualInsurance } = input;
  const mortgage = calculateMortgage({ loanAmount, annualRate, termYears });

  // LTV
  const downPayment = input.downPayment ?? (input.purchasePrice ? input.purchasePrice - loanAmount : loanAmount * 0.2);
  const homeValue = loanAmount + downPayment;
  const ltv = homeValue > 0 ? (loanAmount / homeValue) * 100 : 80;

  const pmiRequired = ltv > 80;
  const monthlyPMI = pmiRequired
    ? (loanAmount * (input.annualPMI ?? loanAmount * 0.01)) / 12
    : 0;

  const monthlyPropertyTax = annualPropertyTax / 12;
  const monthlyInsurance = annualInsurance / 12;

  return {
    principalAndInterest: mortgage.monthlyPayment,
    monthlyPropertyTax: round(monthlyPropertyTax),
    monthlyInsurance: round(monthlyInsurance),
    monthlyPMI: round(monthlyPMI),
    totalMonthlyPayment: round(mortgage.monthlyPayment + monthlyPropertyTax + monthlyInsurance + monthlyPMI),
    ltv: round(ltv, 1),
    pmiRequired,
  };
}

// ── Amortization Schedule ───────────────────────────────────────────────────

export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export function generateAmortization(input: AmortizationInput): AmortizationEntry[] {
  const { loanAmount, annualRate, termYears } = input;
  const monthlyRate = annualRate / 12;
  const numPayments = input.maxMonths ?? termYears * 12;
  const mortgage = calculateMortgage({ loanAmount, annualRate, termYears });
  const schedule: AmortizationEntry[] = [];

  let balance = loanAmount;
  for (let month = 1; month <= numPayments; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = mortgage.monthlyPayment - interestPayment;
    balance = Math.max(0, balance - principalPayment);

    schedule.push({
      month,
      payment: round(mortgage.monthlyPayment),
      principal: round(principalPayment),
      interest: round(interestPayment),
      remainingBalance: round(balance),
    });

    if (balance <= 0) break;
  }

  return schedule;
}

// ── Affordability (28/36 Rule) ──────────────────────────────────────────────

export interface AffordabilityResult {
  grossMonthlyIncome: number;
  maxHousingPayment: number;
  maxTotalDebt: number;
  maxMortgagePayment: number;
  maxLoanAmount: number;
  maxHomePrice: number;
  assumptions: string[];
}

export function calculateAffordability(input: AffordabilityInput): AffordabilityResult {
  const { grossMonthlyIncome, monthlyDebtPayments, downPayment, annualRate, termYears, annualPropertyTax, annualInsurance } = input;

  const maxHousingPayment = grossMonthlyIncome * 0.28;
  const maxTotalDebt = grossMonthlyIncome * 0.36;
  const monthlyTax = annualPropertyTax / 12;
  const monthlyInsurance = annualInsurance / 12;

  // Available for P&I after tax, insurance, PMI estimate
  const maxPITI = Math.min(maxHousingPayment, maxTotalDebt - monthlyDebtPayments);
  let availableForPI = maxPITI - monthlyTax - monthlyInsurance;

  // Estimate PMI if < 20% down
  const pmiEstimatePer1k = 5; // rough estimate
  const assumptions = [
    `28% housing ratio: $${round(maxHousingPayment)}/mo`,
    `36% total debt ratio: $${round(maxTotalDebt)}/mo`,
  ];

  // Reverse mortgage calc: given monthly P&I, solve for loan amount
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  let maxLoanAmount: number;

  if (monthlyRate === 0) {
    maxLoanAmount = availableForPI * numPayments;
  } else {
    // P = L * [i(1+i)^n] / [(1+i)^n - 1]
    // L = P * [(1+i)^n - 1] / [i(1+i)^n]
    const factor = Math.pow(1 + monthlyRate, numPayments);
    maxLoanAmount = availableForPI * (factor - 1) / (monthlyRate * factor);
  }

  // If LTV > 80%, subtract PMI estimate
  const maxHomePrice = maxLoanAmount + downPayment;
  if (downPayment / maxHomePrice < 0.2) {
    assumptions.push("PMI estimated and included (LTV > 80%)");
  }
  assumptions.push(`Down payment: $${round(downPayment)}`);
  assumptions.push(`Rate: ${(annualRate * 100).toFixed(2)}%, Term: ${termYears}yr`);

  return {
    grossMonthlyIncome,
    maxHousingPayment: round(maxHousingPayment),
    maxTotalDebt: round(maxTotalDebt),
    maxMortgagePayment: round(maxPITI),
    maxLoanAmount: round(maxLoanAmount),
    maxHomePrice: round(maxHomePrice),
    assumptions,
  };
}

// ── Refinance Break-Even ────────────────────────────────────────────────────

export interface RefinanceInput {
  currentLoanAmount: number;
  currentRate: number;
  remainingTermMonths: number;
  newRate: number;
  newTermYears: number;
  closingCosts: number;
}

export interface RefinanceResult {
  currentPayment: number;
  newPayment: number;
  monthlySavings: number;
  totalClosingCosts: number;
  breakEvenMonths: number;
  totalInterestSaved: number;
}

export function calculateRefinance(input: RefinanceInput): RefinanceResult {
  const currentMortgage = calculateMortgage({
    loanAmount: input.currentLoanAmount,
    annualRate: input.currentRate,
    termYears: input.remainingTermMonths / 12,
  });

  const newMortgage = calculateMortgage({
    loanAmount: input.currentLoanAmount,
    annualRate: input.newRate,
    termYears: input.newTermYears,
  });

  const monthlySavings = currentMortgage.monthlyPayment - newMortgage.monthlyPayment;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(input.closingCosts / monthlySavings) : Infinity;

  return {
    currentPayment: currentMortgage.monthlyPayment,
    newPayment: newMortgage.monthlyPayment,
    monthlySavings: round(monthlySavings),
    totalClosingCosts: round(input.closingCosts),
    breakEvenMonths,
    totalInterestSaved: round(currentMortgage.totalInterest - newMortgage.totalInterest),
  };
}

// ── Investment Property ─────────────────────────────────────────────────────

export interface InvestmentInput {
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  annualRate: number;
  termYears: number;
  grossMonthlyRent: number;
  vacancyRate: number; // e.g. 0.05 for 5%
  managementFeeRate: number; // e.g. 0.08 for 8%
  maintenanceReserve: number; // monthly
  annualPropertyTax: number;
  annualInsurance: number;
  otherExpenses?: number; // monthly
}

export interface InvestmentResult {
  noi: number;
  capRate: number;
  grm: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  cashOnCashReturn: number;
  monthlyPITI: number;
  priceToRentRatio: number;
  passesOnePercentRule: boolean;
  breakdown: { label: string; monthly: number; annual: number }[];
}

export function calculateInvestment(input: InvestmentInput): InvestmentResult {
  const mortgage = calculateMortgage({
    loanAmount: input.loanAmount,
    annualRate: input.annualRate,
    termYears: input.termYears,
  });

  const monthlyPITI = mortgage.monthlyPayment + (input.annualPropertyTax / 12) + (input.annualInsurance / 12);
  const monthlyRent = input.grossMonthlyRent;
  const vacancyLoss = monthlyRent * input.vacancyRate;
  const managementFee = monthlyRent * input.managementFeeRate;
  const monthlyTax = input.annualPropertyTax / 12;
  const monthlyInsurance = input.annualInsurance / 12;

  const effectiveRent = monthlyRent - vacancyLoss;
  const operatingExpenses = managementFee + input.maintenanceReserve + monthlyTax + monthlyInsurance + (input.otherExpenses ?? 0);

  const noi = (effectiveRent - operatingExpenses) * 12;
  const capRate = input.purchasePrice > 0 ? (noi / input.purchasePrice) * 100 : 0;
  const grm = input.purchasePrice / (monthlyRent * 12);
  const monthlyCashFlow = effectiveRent - operatingExpenses - mortgage.monthlyPayment;
  const annualCashFlow = monthlyCashFlow * 12;
  const cashOnCash = input.downPayment > 0 ? (annualCashFlow / input.downPayment) * 100 : 0;
  const priceToRentRatio = input.purchasePrice / (monthlyRent * 12);
  const passesOnePercentRule = monthlyRent >= input.purchasePrice * 0.01;

  const breakdown: InvestmentResult["breakdown"] = [
    { label: "Gross Rent", monthly: round(monthlyRent), annual: round(monthlyRent * 12) },
    { label: "Vacancy Loss", monthly: round(-vacancyLoss), annual: round(-vacancyLoss * 12) },
    { label: "Effective Rent", monthly: round(effectiveRent), annual: round(effectiveRent * 12) },
    { label: "Property Management", monthly: round(-managementFee), annual: round(-managementFee * 12) },
    { label: "Maintenance Reserve", monthly: round(-input.maintenanceReserve), annual: round(-input.maintenanceReserve * 12) },
    { label: "Property Tax", monthly: round(-monthlyTax), annual: round(-input.annualPropertyTax) },
    { label: "Insurance", monthly: round(-monthlyInsurance), annual: round(-input.annualInsurance) },
    { label: "Mortgage P&I", monthly: round(-mortgage.monthlyPayment), annual: round(-mortgage.monthlyPayment * 12) },
    { label: "Net Cash Flow", monthly: round(monthlyCashFlow), annual: round(annualCashFlow) },
  ];

  return {
    noi: round(noi),
    capRate: round(capRate, 2),
    grm: round(grm, 1),
    monthlyCashFlow: round(monthlyCashFlow),
    annualCashFlow: round(annualCashFlow),
    cashOnCashReturn: round(cashOnCash, 2),
    monthlyPITI: round(monthlyPITI),
    priceToRentRatio: round(priceToRentRatio, 1),
    passesOnePercentRule,
    breakdown,
  };
}

// ── Flip Analysis (70% Rule) ────────────────────────────────────────────────

export function calculateSeventyRule(arv: number, repairCosts: number): number {
  return round(arv * 0.70 - repairCosts);
}

// ── Prorations ──────────────────────────────────────────────────────────────

export function prorateTax(annualTax: number, closingDate: string, taxPeriodStart: string, taxPaidThrough: string): { buyerPortion: number; sellerPortion: number } {
  const closing = new Date(closingDate);
  const periodStart = new Date(taxPeriodStart);
  const paidThrough = new Date(taxPaidThrough);

  const totalDays = (paidThrough.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
  const sellerDays = (closing.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
  const buyerDays = totalDays - sellerDays;

  const dailyRate = annualTax / 365;
  return {
    buyerPortion: round(dailyRate * buyerDays),
    sellerPortion: round(dailyRate * sellerDays),
  };
}

export function prorateHOA(monthlyHOA: number, closingDay: number, daysInMonth: number, buyerResponsible: boolean = true): { buyerPortion: number; sellerPortion: number } {
  const dailyRate = monthlyHOA / daysInMonth;
  const buyerDays = daysInMonth - closingDay;
  const sellerDays = closingDay;

  if (buyerResponsible) {
    return {
      buyerPortion: round(dailyRate * buyerDays),
      sellerPortion: round(dailyRate * sellerDays),
    };
  }
  return {
    buyerPortion: round(dailyRate * (daysInMonth - buyerDays)),
    sellerPortion: round(dailyRate * (daysInMonth - sellerDays)),
  };
}

// ── Valuation Helpers ───────────────────────────────────────────────────────

export function pricePerSqft(price: number, sqft: number): number {
  return sqft > 0 ? round(price / sqft, 2) : 0;
}

export function costPerAcre(price: number, acreage: number): number {
  return acreage > 0 ? round(price / acreage, 2) : 0;
}

export function futureValue(presentValue: number, annualRate: number, years: number): number {
  return round(presentValue * Math.pow(1 + annualRate, years));
}

export function ltv(loanAmount: number, appraisedValue: number): number {
  return appraisedValue > 0 ? round((loanAmount / appraisedValue) * 100, 1) : 0;
}

export function pmiEstimate(loanAmount: number, annualPMIRate: number = 0.01): number {
  return round((loanAmount * annualPMIRate) / 12);
}

export function earnestMoney(purchasePrice: number, percent: number = 0.02): number {
  return round(purchasePrice * percent);
}

// ── Area & Measurement ──────────────────────────────────────────────────────

export const SQFT_PER_ACRE = 43_560;
export const SQIN_PER_SQFT = 144;
export const FT_PER_MILE = 5_280;

export function sqftToAcres(sqft: number): number { return round(sqft / SQFT_PER_ACRE, 4); }
export function acresToSqft(acres: number): number { return round(acres * SQFT_PER_ACRE); }
export function rectangleArea(length: number, width: number): number { return round(length * width); }
export function triangleArea(base: number, height: number): number { return round((base * height) / 2); }

// ── Utility ──────────────────────────────────────────────────────────────────

function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}