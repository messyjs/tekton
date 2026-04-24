import { describe, it, expect } from "vitest";
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
  REET_TIERS,
} from "../src/tools/calculator.js";

describe("Calculator Agent", () => {
  // ── Commission ─────────────────────────────────────────────────────────
  describe("calculateCommission", () => {
    it("calculates standard 6% commission with 50/50 split", () => {
      const result = calculateCommission({ salePrice: 800_000, commissionRate: 0.06 });
      expect(result.grossCommission).toBe(48_000);
      expect(result.listingAgentShare).toBe(24_000);
      expect(result.buyerAgentShare).toBe(24_000);
    });

    it("handles custom splits and brokerage take", () => {
      const result = calculateCommission({
        salePrice: 500_000,
        commissionRate: 0.05,
        listingAgentSplit: 0.6,
        buyerAgentSplit: 0.4,
        brokerageSplit: 0.2,
      });
      expect(result.grossCommission).toBe(25_000);
      expect(result.listingAgentShare).toBe(15_000);
      expect(result.buyerAgentShare).toBe(10_000);
    });
  });

  // ── WA REET (Graduated) ────────────────────────────────────────────────
  describe("calculateREET", () => {
    it("calculates REET for $800,000 sale (two tiers)", () => {
      const result = calculateREET({ salePrice: 800_000, localRate: 0.005 });
      // State: $525,000 × 1.10% + ($800,000 - $525,000) × 1.28% = $5,775 + $3,520 = $9,295
      expect(result.stateREET).toBe(9295);
      // Local: $800,000 × 0.50% = $4,000
      expect(result.localREET).toBe(4000);
      expect(result.totalREET).toBe(13295);
      expect(result.tierBreakdown).toHaveLength(2);
    });

    it("calculates REET for $2,000,000 (three tiers)", () => {
      const result = calculateREET({ salePrice: 2_000_000, localRate: 0.005 });
      expect(result.tierBreakdown).toHaveLength(3);
      expect(result.stateREET).toBeGreaterThan(0);
      expect(result.totalREET).toBeGreaterThan(result.stateREET);
    });

    it("calculates REET for $400,000 (single tier)", () => {
      const result = calculateREET({ salePrice: 400_000, localRate: 0.005 });
      expect(result.tierBreakdown).toHaveLength(1);
      expect(result.stateREET).toBe(4400); // $400,000 × 1.10%
      expect(result.localREET).toBe(2000); // $400,000 × 0.50%
    });

    it("calculates REET for $5,000,000 (all four tiers)", () => {
      const result = calculateREET({ salePrice: 5_000_000, localRate: 0.005 });
      expect(result.tierBreakdown).toHaveLength(4);
    });
  });

  // ── Mortgage ────────────────────────────────────────────────────────────
  describe("calculateMortgage", () => {
    it("calculates 30-year mortgage at 6.5%", () => {
      const result = calculateMortgage({ loanAmount: 400_000, annualRate: 0.065, termYears: 30 });
      expect(result.monthlyPayment).toBeCloseTo(2528.27, 1);
      expect(result.totalPayments).toBeGreaterThan(result.loanAmount);
      expect(result.totalInterest).toBeGreaterThan(0);
    });

    it("handles 0% interest (edge case)", () => {
      const result = calculateMortgage({ loanAmount: 120_000, annualRate: 0, termYears: 10 });
      expect(result.monthlyPayment).toBe(1000);
      expect(result.totalInterest).toBe(0);
    });
  });

  // ── PITI ────────────────────────────────────────────────────────────────
  describe("calculatePITI", () => {
    it("calculates PITI with PMI when LTV > 80%", () => {
      const result = calculatePITI({
        loanAmount: 380_000,
        annualRate: 0.065,
        termYears: 30,
        annualPropertyTax: 6000,
        annualInsurance: 1800,
        downPayment: 20_000,
        purchasePrice: 400_000,
      });
      expect(result.ltv).toBe(95); // 380K / 400K
      expect(result.pmiRequired).toBe(true);
      expect(result.totalMonthlyPayment).toBeGreaterThan(result.principalAndInterest);
    });

    it("no PMI when LTV <= 80%", () => {
      const result = calculatePITI({
        loanAmount: 300_000,
        annualRate: 0.065,
        termYears: 30,
        annualPropertyTax: 4800,
        annualInsurance: 1500,
        downPayment: 100_000,
        purchasePrice: 400_000,
      });
      expect(result.ltv).toBe(75);
      expect(result.pmiRequired).toBe(false);
      expect(result.monthlyPMI).toBe(0);
    });
  });

  // ── Affordability ───────────────────────────────────────────────────────
  describe("calculateAffordability", () => {
    it("calculates max home price from income", () => {
      const result = calculateAffordability({
        grossMonthlyIncome: 10_000,
        monthlyDebtPayments: 500,
        downPayment: 80_000,
        annualRate: 0.065,
        termYears: 30,
        annualPropertyTax: 6000,
        annualInsurance: 1800,
      });
      expect(result.maxHousingPayment).toBe(2800);
      expect(result.maxTotalDebt).toBe(3600);
      expect(result.maxHomePrice).toBeGreaterThan(0);
    });
  });

  // ── Amortization ────────────────────────────────────────────────────────
  describe("generateAmortization", () => {
    it("generates correct amortization schedule", () => {
      const schedule = generateAmortization({ loanAmount: 100_000, annualRate: 0.05, termYears: 30 });
      expect(schedule[0].month).toBe(1);
      expect(schedule[0].interest).toBeGreaterThan(schedule[0].principal); // Early payments are interest-heavy
      expect(schedule[schedule.length - 1].remainingBalance).toBeLessThanOrEqual(2);
    });

    it("respects maxMonths limit", () => {
      const schedule = generateAmortization({ loanAmount: 100_000, annualRate: 0.05, termYears: 30, maxMonths: 12 });
      expect(schedule).toHaveLength(12);
    });
  });

  // ── Net Sheet ───────────────────────────────────────────────────────────
  describe("calculateNetSheet", () => {
    it("calculates seller net sheet with REET", () => {
      const result = calculateNetSheet({
        salePrice: 800_000,
        listingCommission: 0.03,
        buyerCommission: 0.03,
        localReetRate: 0.005,
      });
      expect(result.debits.length).toBeGreaterThan(0);
      expect(result.netToSeller).toBeLessThan(result.salePrice);
      expect(result.totalDebits).toBeGreaterThan(0);
    });
  });

  // ── Buyer Costs ─────────────────────────────────────────────────────────
  describe("calculateBuyerCosts", () => {
    it("calculates total cash needed at closing", () => {
      const result = calculateBuyerCosts({
        purchasePrice: 500_000,
        downPaymentPercent: 0.20,
        appraisalFee: 500,
        inspectionFee: 600,
      });
      expect(result.downPayment).toBe(100_000);
      expect(result.loanAmount).toBe(400_000);
      expect(result.totalCashNeeded).toBeGreaterThan(result.downPayment);
    });
  });

  // ── Investment ──────────────────────────────────────────────────────────
  describe("calculateInvestment", () => {
    it("calculates cap rate, GRM, and cash-on-cash return", () => {
      const result = calculateInvestment({
        purchasePrice: 500_000,
        downPayment: 100_000,
        loanAmount: 400_000,
        annualRate: 0.07,
        termYears: 30,
        grossMonthlyRent: 3000,
        vacancyRate: 0.05,
        managementFeeRate: 0.08,
        maintenanceReserve: 200,
        annualPropertyTax: 5000,
        annualInsurance: 1500,
      });
      expect(result.capRate).toBeGreaterThan(0);
      expect(result.grm).toBeCloseTo(13.9, 0);
      expect(result.monthlyCashFlow).toBeLessThan(3000); // After expenses, less than gross rent
      expect(result.passesOnePercentRule).toBe(false); // 3000 < 5000 (1% of purchase price)
    });
  });

  // ── 70% Rule ────────────────────────────────────────────────────────────
  describe("calculateSeventyRule", () => {
    it("calculates max purchase price for flips", () => {
      expect(calculateSeventyRule(300_000, 50_000)).toBe(160_000); // (300K × 0.70) - 50K
    });
  });

  // ── Prorations ──────────────────────────────────────────────────────────
  describe("prorateTax", () => {
    it("prorates annual tax between buyer and seller", () => {
      const result = prorateTax(6000, "2024-07-15", "2024-01-01", "2024-12-31");
      expect(result.buyerPortion).toBeGreaterThan(0);
      expect(result.sellerPortion).toBeGreaterThan(0);
      expect(result.buyerPortion + result.sellerPortion).toBeCloseTo(6000, 0);
    });
  });

  describe("prorateHOA", () => {
    it("prorates HOA dues", () => {
      const result = prorateHOA(400, 15, 30, true);
      expect(result.buyerPortion).toBeGreaterThan(0);
      expect(result.sellerPortion).toBeGreaterThan(0);
      expect(result.buyerPortion + result.sellerPortion).toBeCloseTo(400, 0);
    });
  });

  // ── Valuation Helpers ──────────────────────────────────────────────────
  describe("valuation helpers", () => {
    it("calculates price per sqft", () => {
      expect(pricePerSqft(800_000, 2000)).toBe(400);
    });

    it("calculates cost per acre", () => {
      expect(costPerAcre(1_000_000, 5)).toBe(200_000);
    });

    it("calculates future value with appreciation", () => {
      expect(futureValue(500_000, 0.04, 5)).toBeCloseTo(608326.45, 0);
    });

    it("calculates LTV", () => {
      expect(ltv(380_000, 400_000)).toBe(95);
    });

    it("calculates PMI estimate", () => {
      expect(pmiEstimate(380_000)).toBeCloseTo(316.67, 0);
    });

    it("calculates earnest money at default 2%", () => {
      expect(earnestMoney(500_000)).toBe(10_000);
    });

    it("calculates earnest money at custom rate", () => {
      expect(earnestMoney(500_000, 0.03)).toBe(15_000);
    });
  });

  // ── Area Conversions ────────────────────────────────────────────────────
  describe("area conversions", () => {
    it("converts sqft to acres", () => {
      expect(sqftToAcres(43_560)).toBe(1);
      expect(sqftToAcres(87_120)).toBe(2);
    });

    it("converts acres to sqft", () => {
      expect(acresToSqft(1)).toBe(43_560);
    });

    it("calculates rectangle area", () => {
      expect(rectangleArea(50, 100)).toBe(5000);
    });

    it("calculates triangle area", () => {
      expect(triangleArea(40, 30)).toBe(600);
    });
  });

  // ── Refinance ───────────────────────────────────────────────────────────
  describe("calculateRefinance", () => {
    it("calculates break-even months", () => {
      const result = calculateRefinance({
        currentLoanAmount: 350_000,
        currentRate: 0.07,
        remainingTermMonths: 324,
        newRate: 0.055,
        newTermYears: 30,
        closingCosts: 5000,
      });
      expect(result.monthlySavings).toBeGreaterThan(0);
      expect(result.breakEvenMonths).toBeGreaterThan(0);
      expect(result.breakEvenMonths).toBeLessThan(120); // Reasonable range
    });
  });

  // ── REET Tiers ──────────────────────────────────────────────────────────
  describe("REET_TIERS constants", () => {
    it("has 4 graduated tiers", () => {
      expect(REET_TIERS).toHaveLength(4);
      expect(REET_TIERS[0].rate).toBe(0.011);
      expect(REET_TIERS[1].rate).toBe(0.0128);
      expect(REET_TIERS[2].rate).toBe(0.0275);
      expect(REET_TIERS[3].rate).toBe(0.03);
    });
  });
});