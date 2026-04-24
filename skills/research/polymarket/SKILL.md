---
name: polymarket
description: "Prediction market data from Polymarket — analyze odds, trends, and market sentiment."
version: 1.0.0
metadata:
  tekton:
    tags: ["prediction-market", "polymarket", "odds", "sentiment"]
    category: research
    confidence: 0.3
---

# Polymarket

## When to Use
- Gauging market sentiment on events
- Analyzing prediction accuracy
- Understanding probability estimates

## Procedure
1. Access Polymarket API
2. Extract market prices (implied probabilities)
3. Analyze volume and liquidity
4. Track price movements over time
5. Compare with expert predictions

## Pitfalls
- Low-liquidity markets are unreliable
- Prices reflect betting, not true probability
- Market manipulation is possible

## Verification
- Market has sufficient liquidity
- Price movement is not anomalous
- Data timestamp is recent
