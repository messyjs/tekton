# ── Trading Endpoints ─────────────────────────────────────────────────

@app.get("/api/trading/tiers")
async def get_tier_comparison():
    """Compare Lightweight vs Full tier features and costs."""
    return {
        "tiers": TIER_COMPARISON,
        "current_model": "deepseek-v4-flash:cloud",
        "cost_estimate": {
            "lightweight": "0 tokens per analysis (Pine Script + Chart overlays only)",
            "full": "200-500 tokens per analysis (~$0.001 per signal with deepseek-v4-flash)",
        },
    }

@app.get("/api/trading/exchanges")
async def get_exchanges():
    """List supported exchanges and their capabilities."""
    return {"exchanges": {k: {kk: vv for kk, vv in v.items() if kk != "api_base"} for k, v in SUPPORTED_EXCHANGES.items()}}

@app.get("/api/trading/prop-firms")
async def get_prop_firms():
    """List supported prop firms with their rules and account sizes."""
    result = {}
    for fid, fdata in PROP_FIRMS.items():
        result[fid] = {
            "name": fdata["name"],
            "platform": fdata["platform"],
            "exchange": PROP_FIRM_EXCHANGE.get(fid, "paper"),
            "account_sizes": fdata["account_sizes"],
            "max_daily_loss_pct": fdata["max_daily_loss_pct"],
            "max_drawdown_pct": fdata["max_drawdown_pct"],
            "profit_target_pct": fdata["profit_target_pct"],
            "trailing_drawdown": fdata["trailing_drawdown"],
            "can_trade_news": fdata["can_trade_news"],
            "min_trading_days": fdata["min_trading_days"],
            "reset_cost": fdata["reset_cost"],
        }
    return {"prop_firms": result}

@app.get("/api/trading/accounts")
async def get_trading_accounts():
    """List all paper trading accounts with their prop firm configs."""
    result = {}
    for aid, acct in paper_accounts.items():
        stats = acct.get_stats()
        result[aid] = {
            "name": acct.account_name,
            "exchange": acct.exchange,
            "prop_firm": acct.prop_firm,
            "initial_balance": acct.initial_balance,
            "balance": stats["balance"],
            "equity": stats["equity"],
            "return_pct": stats["return_pct"],
            "total_trades": stats["total_trades"],
            "win_rate": stats["win_rate"],
            "profit_factor": stats["profit_factor"],
            "open_positions": stats["open_positions"],
            "max_drawdown": stats["max_drawdown"],
            "prop_firm_rules": PROP_FIRMS.get(acct.prop_firm, {}) if acct.prop_firm else None,
        }
    return {"accounts": result}

@app.post("/api/trading/signal")
async def create_signal(request: Request):
    """Generate a trading signal from engine analysis."""
    body = await request.json()
    ticker = body.get("ticker", "BTC-USD")
    engine_id = body.get("engine", "gann")
    account_id = body.get("account", "paper_default")
    
    market = get_market_data(ticker)
    result = analyze_market(market, ticker, engine_id)
    
    acct = paper_accounts.get(account_id)
    if not acct:
        return {"error": f"Account {account_id} not found", "available": list(paper_accounts.keys())}
    
    signal = generate_signal(result, acct.equity, ENGINE_RISK_PROFILES.get(engine_id))
    if not signal:
        return {"status": "no_signal", "reason": f"Score {result.get('score', 0)} < {MIN_SIGNAL_SCORE}", "analysis": result}
    
    return {"signal": signal, "account": account_id, "prop_firm": acct.prop_firm}

@app.post("/api/trading/execute")
async def execute_trade(request: Request):
    """Execute a trade signal on a paper account."""
    body = await request.json()
    signal = body.get("signal", {})
    account_id = body.get("account", "paper_default")
    
    acct = paper_accounts.get(account_id)
    if not acct:
        return {"error": f"Account {account_id} not found"}
    
    result = acct.execute(signal)
    
    conn = get_db()
    conn.execute("INSERT INTO trades (symbol, side, type, quantity, entry_price, stop_loss, take_profit, engine_id, signal_score, signal_bias, status, pnl, fees, mode, exchange) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [signal.get("symbol"), signal.get("direction"), "market", signal.get("quantity", 1),
         signal.get("entry_price"), signal.get("stop_loss"), signal.get("take_profit"),
         signal.get("engine_id"), signal.get("score"), signal.get("bias"),
         "open" if result.get("status") == "opened" else "closed", 0, result.get("fee", 0),
         "paper", acct.exchange])
    conn.commit()
    conn.close()
    
    return {"execution": result, "account_stats": acct.get_stats()}

@app.post("/api/trading/close")
async def close_position(request: Request):
    """Close a position on a paper account."""
    body = await request.json()
    symbol = body.get("symbol")
    account_id = body.get("account", "paper_default")
    exit_price = body.get("price")
    
    acct = paper_accounts.get(account_id)
    if not acct:
        return {"error": f"Account {account_id} not found"}
    
    if not exit_price:
        market = get_market_data(symbol)
        exit_price = market.get("currentPrice", 0)
    
    if symbol not in acct.positions:
        return {"error": f"No position in {symbol}", "positions": list(acct.positions.keys())}
    
    close_result = acct._close_position(symbol, exit_price)
    acct.trades.append(close_result)
    
    return {"closed": close_result, "account_stats": acct.get_stats()}

@app.get("/api/trading/stats/{account_id}")
async def get_trading_stats(account_id: str):
    """Get detailed trading statistics for an account."""
    acct = paper_accounts.get(account_id)
    if not acct:
        return {"error": f"Account {account_id} not found"}
    return acct.get_stats()

@app.post("/api/trading/pine-export")
async def export_pine_script(request: Request):
    """Generate Pine Script from engine analysis for TradingView."""
    body = await request.json()
    ticker = body.get("ticker", "BTC-USD")
    engine_id = body.get("engine", "gann")
    
    market = get_market_data(ticker)
    result = analyze_market(market, ticker, engine_id)
    
    pine = TradingViewBridge.export_pine_script(engine_id, result)
    return {"pine_script": pine, "engine": engine_id, "ticker": ticker, "tier": "lightweight", "tokens_used": 0}

@app.post("/api/trading/pine-import")
async def import_pine_script(request: Request):
    """Parse an imported Pine Script to extract indicators and levels."""
    body = await request.json()
    script = body.get("script", "")
    if not script.strip():
        return {"error": "No script provided"}
    
    result = TradingViewBridge.import_pine_script(script)
    return result

@app.get("/api/trading/webhook-info")
async def get_webhook_info():
    """Get TradingView webhook configuration info."""
    return TradingViewBridge.generate_webhook_url()

@app.post("/api/trading/webhook")
async def receive_webhook(request: Request):
    """Receive TradingView webhook alerts."""
    body = await request.json()
    conn = get_db()
    conn.execute("INSERT INTO signals (timestamp, engine_id, symbol, direction, score, bias, tier) VALUES (?,?,?,?,?,?,?)",
        [datetime.now().isoformat(), body.get("engine", "tradingview"), body.get("ticker", ""),
         body.get("direction", ""), 0, "webhook", "external"])
    conn.commit()
    conn.close()
    return {"status": "received", "data": body}

@app.get("/api/trading/risk/{engine_id}")
async def get_engine_risk(engine_id: str):
    """Get risk configuration for a specific engine."""
    risk = ENGINE_RISK_PROFILES.get(engine_id)
    if not risk:
        return {"error": f"Unknown engine: {engine_id}"}
    return {"engine_id": engine_id, "risk_config": risk}

@app.post("/api/trading/reset/{account_id}")
async def reset_account(account_id: str):
    """Reset a paper trading account to its initial balance."""
    acct = paper_accounts.get(account_id)
    if not acct:
        return {"error": f"Account {account_id} not found"}
    
    initial = acct.initial_balance
    acct.balance = initial
    acct.equity = initial
    acct.daily_pnl = 0
    acct.daily_start_equity = initial
    acct.peak_equity = initial
    acct.max_drawdown = 0
    acct.positions = {}
    acct.trades = []
    
    return {"status": "reset", "account": account_id, "balance": initial}
