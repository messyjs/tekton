---
name: webhook-subscriptions
description: "Set up and manage webhook subscriptions for automated notifications."
version: 1.0.0
metadata:
  tekton:
    tags: ["webhook", "notifications", "automation", "events"]
    category: devops
    confidence: 0.5
---

# Webhook Subscriptions

## When to Use
- Receiving automated notifications
- Event-driven integrations
- CI/CD pipeline triggers

## Procedure
1. Set up endpoint URL (HTTPS required)
2. Register webhook with provider
3. Verify signature on incoming payloads
4. Process events idempotently
5. Handle retries and failures

## Pitfalls
- Always verify webhook signatures
- Endpoints must be HTTPS
- Handle duplicate events (idempotency)

## Verification
- Webhook fires on expected events
- Endpoint receives and processes payload
- Signature verification passes
