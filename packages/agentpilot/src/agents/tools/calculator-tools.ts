/**
 * Calculator Agent Tools — All real estate math calculations.
 * These have real implementations, not just stubs.
 */

import type { ToolDefinition } from "../../types.js";
import {
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
} from "../../tools/calculator.js";

export const calculatorTools: ToolDefinition[] = [
  {
    name: "calculate_commission",
    description: "Calculate real estate commission with splits",
    parameters: {
      type: "object",
      properties: {
        salePrice: { type: "number", description: "Sale price" },
        commissionRate: { type: "number", description: "Total commission rate (e.g. 0.06 for 6%)" },
        listingAgentSplit: { type: "number", description: "Listing agent split (default 0.5)" },
        buyerAgentSplit: { type: "number", description: "Buyer agent split (default 0.5)" },
        brokerageSplit: { type: "number", description: "Brokerage split from agent share (default 0)" },
      },
      required: ["salePrice", "commissionRate"],
    },
    handler: async (params) => calculateCommission(params as any),
  },
  {
    name: "calculate_reet",
    description: "WA graduated Real Estate Excise Tax (REET) with tier breakdown",
    parameters: {
      type: "object",
      properties: {
        salePrice: { type: "number", description: "Sale price" },
        localRate: { type: "number", description: "Local REET rate (e.g. 0.005 for 0.5%). Default Seattle=0.005" },
      },
      required: ["salePrice"],
    },
    handler: async (params) => calculateREET({ salePrice: (params as any).salePrice, localRate: (params as any).localRate ?? 0.005 }),
  },
  {
    name: "calculate_net_sheet",
    description: "Seller net sheet with WA REET, commissions, and closing costs",
    parameters: {
      type: "object",
      properties: {
        salePrice: { type: "number" },
        listingCommission: { type: "number", description: "Rate (e.g. 0.03)" },
        buyerCommission: { type: "number", description: "Rate (e.g. 0.03)" },
        mortgagePayoff: { type: "number" },
        localReetRate: { type: "number", description: "Default 0.005" },
        titleInsuranceEstimate: { type: "number" },
        escrowFee: { type: "number" },
        recordingFee: { type: "number" },
        proratedTax: { type: "number" },
        hoaTransferFee: { type: "number" },
        sellerCredits: { type: "number" },
        repairCosts: { type: "number" },
      },
      required: ["salePrice", "listingCommission"],
    },
    handler: async (params) => calculateNetSheet(params as any),
  },
  {
    name: "calculate_buyer_costs",
    description: "Buyer cost-to-close estimate",
    parameters: {
      type: "object",
      properties: {
        purchasePrice: { type: "number" },
        downPaymentPercent: { type: "number", description: "e.g. 0.20 for 20%" },
        loanAmount: { type: "number" },
        loanOriginationFee: { type: "number" },
        appraisalFee: { type: "number" },
        inspectionFee: { type: "number" },
        titleInsuranceBuyer: { type: "number" },
        escrowFeeBuyer: { type: "number" },
        recordingFee: { type: "number" },
        proratedTax: { type: "number" },
        prepaidInsurance: { type: "number" },
        prepaidInterest: { type: "number" },
        reserves: { type: "number" },
        sellerCredits: { type: "number" },
      },
      required: ["purchasePrice", "downPaymentPercent"],
    },
    handler: async (params) => calculateBuyerCosts(params as any),
  },
  {
    name: "calculate_mortgage",
    description: "Monthly mortgage P&I payment with total cost breakdown",
    parameters: {
      type: "object",
      properties: {
        loanAmount: { type: "number" },
        annualRate: { type: "number", description: "e.g. 0.065 for 6.5%" },
        termYears: { type: "number", description: "15 or 30" },
      },
      required: ["loanAmount", "annualRate", "termYears"],
    },
    handler: async (params) => calculateMortgage(params as any),
  },
  {
    name: "calculate_piti",
    description: "Full PITI (Principal, Interest, Tax, Insurance, PMI)",
    parameters: {
      type: "object",
      properties: {
        loanAmount: { type: "number" },
        annualRate: { type: "number" },
        termYears: { type: "number" },
        annualPropertyTax: { type: "number" },
        annualInsurance: { type: "number" },
        purchasePrice: { type: "number", description: "For LTV calculation" },
        downPayment: { type: "number" },
      },
      required: ["loanAmount", "annualRate", "termYears", "annualPropertyTax", "annualInsurance"],
    },
    handler: async (params) => calculatePITI(params as any),
  },
  {
    name: "calculate_affordability",
    description: "28/36 rule affordability — max home price for given income",
    parameters: {
      type: "object",
      properties: {
        grossMonthlyIncome: { type: "number" },
        monthlyDebtPayments: { type: "number" },
        downPayment: { type: "number" },
        annualRate: { type: "number" },
        termYears: { type: "number" },
        annualPropertyTax: { type: "number" },
        annualInsurance: { type: "number" },
      },
      required: ["grossMonthlyIncome", "monthlyDebtPayments", "downPayment", "annualRate", "termYears", "annualPropertyTax", "annualInsurance"],
    },
    handler: async (params) => calculateAffordability(params as any),
  },
  {
    name: "generate_amortization",
    description: "Month-by-month amortization schedule",
    parameters: {
      type: "object",
      properties: {
        loanAmount: { type: "number" },
        annualRate: { type: "number" },
        termYears: { type: "number" },
        maxMonths: { type: "number", description: "Limit output (default: full term)" },
      },
      required: ["loanAmount", "annualRate", "termYears"],
    },
    handler: async (params) => generateAmortization(params as any),
  },
  {
    name: "calculate_refinance",
    description: "Refinance break-even and savings analysis",
    parameters: {
      type: "object",
      properties: {
        currentLoanAmount: { type: "number" },
        currentRate: { type: "number" },
        remainingTermMonths: { type: "number" },
        newRate: { type: "number" },
        newTermYears: { type: "number" },
        closingCosts: { type: "number" },
      },
      required: ["currentLoanAmount", "currentRate", "remainingTermMonths", "newRate", "newTermYears", "closingCosts"],
    },
    handler: async (params) => calculateRefinance(params as any),
  },
  {
    name: "calculate_investment",
    description: "Investment property analysis: cap rate, GRM, cash flow, cash-on-cash",
    parameters: {
      type: "object",
      properties: {
        purchasePrice: { type: "number" },
        downPayment: { type: "number" },
        loanAmount: { type: "number" },
        annualRate: { type: "number" },
        termYears: { type: "number" },
        grossMonthlyRent: { type: "number" },
        vacancyRate: { type: "number", description: "e.g. 0.05" },
        managementFeeRate: { type: "number", description: "e.g. 0.08" },
        maintenanceReserve: { type: "number" },
        annualPropertyTax: { type: "number" },
        annualInsurance: { type: "number" },
        otherExpenses: { type: "number" },
      },
      required: ["purchasePrice", "downPayment", "loanAmount", "annualRate", "termYears", "grossMonthlyRent", "vacancyRate", "managementFeeRate", "maintenanceReserve", "annualPropertyTax", "annualInsurance"],
    },
    handler: async (params) => calculateInvestment(params as any),
  },
  {
    name: "calculate_seventy_rule",
    description: "70% rule for flippers: max purchase price = (ARV × 0.70) − repairs",
    parameters: {
      type: "object",
      properties: {
        arv: { type: "number", description: "After Repair Value" },
        repairCosts: { type: "number" },
      },
      required: ["arv", "repairCosts"],
    },
    handler: async (params) => ({ maxPurchasePrice: calculateSeventyRule((params as any).arv, (params as any).repairCosts) }),
  },
  {
    name: "prorate_tax",
    description: "Prorate property tax between buyer and seller",
    parameters: {
      type: "object",
      properties: {
        annualTax: { type: "number" },
        closingDate: { type: "string" },
        taxPeriodStart: { type: "string" },
        taxPaidThrough: { type: "string" },
      },
      required: ["annualTax", "closingDate", "taxPeriodStart", "taxPaidThrough"],
    },
    handler: async (params) => prorateTax((params as any).annualTax, (params as any).closingDate, (params as any).taxPeriodStart, (params as any).taxPaidThrough),
  },
  {
    name: "prorate_hoa",
    description: "Prorate HOA dues between buyer and seller",
    parameters: {
      type: "object",
      properties: {
        monthlyHOA: { type: "number" },
        closingDay: { type: "number" },
        daysInMonth: { type: "number" },
      },
      required: ["monthlyHOA", "closingDay", "daysInMonth"],
    },
    handler: async (params) => prorateHOA((params as any).monthlyHOA, (params as any).closingDay, (params as any).daysInMonth),
  },
  {
    name: "price_per_sqft",
    description: "Calculate price per square foot",
    parameters: {
      type: "object",
      properties: { price: { type: "number" }, sqft: { type: "number" } },
      required: ["price", "sqft"],
    },
    handler: async (params) => ({ pricePerSqft: pricePerSqft((params as any).price, (params as any).sqft) }),
  },
  {
    name: "ltv",
    description: "Loan-to-value ratio",
    parameters: {
      type: "object",
      properties: { loanAmount: { type: "number" }, appraisedValue: { type: "number" } },
      required: ["loanAmount", "appraisedValue"],
    },
    handler: async (params) => ({ ltv: ltv((params as any).loanAmount, (params as any).appraisedValue) }),
  },
  {
    name: "earnest_money",
    description: "Calculate earnest money amount",
    parameters: {
      type: "object",
      properties: { purchasePrice: { type: "number" }, percent: { type: "number", description: "Default 2%" } },
      required: ["purchasePrice"],
    },
    handler: async (params) => ({ earnestMoney: earnestMoney((params as any).purchasePrice, (params as any).percent) }),
  },
  {
    name: "future_value",
    description: "Appreciation: future value after N years",
    parameters: {
      type: "object",
      properties: { presentValue: { type: "number" }, annualRate: { type: "number" }, years: { type: "number" } },
      required: ["presentValue", "annualRate", "years"],
    },
    handler: async (params) => ({ futureValue: futureValue((params as any).presentValue, (params as any).annualRate, (params as any).years) }),
  },
  {
    name: "area_conversions",
    description: "Area and measurement conversions (sqft↔acres, rectangle/triangle area)",
    parameters: {
      type: "object",
      properties: {
        convertFrom: { type: "string", description: "sqft|acres" },
        value: { type: "number" },
        shape: { type: "string", description: "rectangle|triangle (optional)" },
        dimension1: { type: "number" },
        dimension2: { type: "number" },
      },
      required: ["convertFrom", "value"],
    },
    handler: async (params) => {
      const p = params as any;
      const results: Record<string, number> = {};
      if (p.convertFrom === "sqft") results.acres = sqftToAcres(p.value);
      if (p.convertFrom === "acres") results.sqft = acresToSqft(p.value);
      if (p.shape === "rectangle" && p.dimension1 && p.dimension2) results.area = rectangleArea(p.dimension1, p.dimension2);
      if (p.shape === "triangle" && p.dimension1 && p.dimension2) results.area = triangleArea(p.dimension1, p.dimension2);
      return results;
    },
  },
];