export class TokenBudget {
    config;
    spent = 0;
    dailySpent = 0;
    dailyResetDate = new Date().toISOString().split("T")[0];
    constructor(config) {
        this.config = config;
    }
    spend(tokens) {
        this.checkDailyReset();
        this.spent += tokens;
        this.dailySpent += tokens;
    }
    getRemaining() {
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
    isOverBudget() {
        this.checkDailyReset();
        const remaining = this.getRemaining();
        if (remaining.daily !== null && remaining.daily <= 0)
            return true;
        if (remaining.session !== null && remaining.session <= 0)
            return true;
        return false;
    }
    shouldWarn() {
        this.checkDailyReset();
        const warnThreshold = this.config.warnPercent / 100;
        if (this.config.dailyLimit !== null) {
            const dailyPercent = this.dailySpent / this.config.dailyLimit;
            if (dailyPercent >= warnThreshold)
                return true;
        }
        if (this.config.sessionLimit !== null) {
            const sessionPercent = this.spent / this.config.sessionLimit;
            if (sessionPercent >= warnThreshold)
                return true;
        }
        return false;
    }
    reset() {
        this.spent = 0;
        this.dailySpent = 0;
        this.dailyResetDate = new Date().toISOString().split("T")[0];
    }
    checkDailyReset() {
        const today = new Date().toISOString().split("T")[0];
        if (today !== this.dailyResetDate) {
            this.dailySpent = 0;
            this.dailyResetDate = today;
        }
    }
}
//# sourceMappingURL=budget.js.map