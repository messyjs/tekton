export interface BudgetConfig {
  dailyLimit: number | null;    // null = unlimited
  sessionLimit: number | null;  // null = unlimited
  warnPercent: number;           // warn at this % of limit (default 80)
}

export class TokenBudget {
  private config: BudgetConfig;
  private spent: number = 0;
  private dailySpent: number = 0;
  private dailyResetDate: string = new Date().toISOString().split("T")[0];

  constructor(config: BudgetConfig) {
    this.config = config;
  }

  spend(tokens: number): void {
    this.checkDailyReset();
    this.spent += tokens;
    this.dailySpent += tokens;
  }

  getRemaining(): { daily: number | null; session: number | null } {
    this.checkDailyReset();
    return {
      daily: this.config.dailyLimit !== null
        ? Math.max(0, this.config.dailyLimit - this.dailySpent)
        : null,
      session: this.config.sessionLimit !== null
        ? Math.max(0, this.config.sessionLimit - this.spent)
        : null,
    };
  }

  isOverBudget(): boolean {
    this.checkDailyReset();
    const remaining = this.getRemaining();
    if (remaining.daily !== null && remaining.daily <= 0) return true;
    if (remaining.session !== null && remaining.session <= 0) return true;
    return false;
  }

  shouldWarn(): boolean {
    this.checkDailyReset();
    const warnThreshold = this.config.warnPercent / 100;

    if (this.config.dailyLimit !== null) {
      const dailyPercent = this.dailySpent / this.config.dailyLimit;
      if (dailyPercent >= warnThreshold) return true;
    }

    if (this.config.sessionLimit !== null) {
      const sessionPercent = this.spent / this.config.sessionLimit;
      if (sessionPercent >= warnThreshold) return true;
    }

    return false;
  }

  reset(): void {
    this.spent = 0;
    this.dailySpent = 0;
    this.dailyResetDate = new Date().toISOString().split("T")[0];
  }

  private checkDailyReset(): void {
    const today = new Date().toISOString().split("T")[0];
    if (today !== this.dailyResetDate) {
      this.dailySpent = 0;
      this.dailyResetDate = today;
    }
  }
}