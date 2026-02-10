# Technical Architecture: Shopify-ShipBob n8n Automation

## Product: Firewalla Gold Plus | Model: 3PL-Hybrid

---

## 1. System Overview

```
                        +-----------+
                        |  Shopify  |
                        | Storefront|
                        +-----+-----+
                              |
                      Order Paid Webhook
                              |
                  +-----------v-----------+
                  |        n8n (Docker)        |
                  |                            |
                  |  +----------------------+  |
                  |  | WF1: Order Fulfillment|  |
                  |  |   Trigger -> Validate |  |
                  |  |   -> Fraud Check      |  |
                  |  |   -> ShipBob POST     |  |
                  |  |   -> Error Handler    |  |
                  |  +----------------------+  |
                  |                            |
                  |  +----------------------+  |
                  |  | WF2: Tracking Sync   |  |
                  |  |   ShipBob Poll/Hook  |  |
                  |  |   -> Shopify Update  |  |
                  |  +----------------------+  |
                  |                            |
                  |  +----------------------+  |
                  |  | WF3: AI Support Agent|  |
                  |  |   Webhook Trigger    |  |
                  |  |   -> LangChain RAG   |  |
                  |  |   -> Response        |  |
                  |  +----------------------+  |
                  +----------+-+--+-----------+
                             | |  |
              +--------------+ |  +----------------+
              |                |                   |
        +-----v-----+   +-----v------+   +--------v--------+
        |  ShipBob   |   |   Slack/   |   | OpenAI / Claude |
        |    API     |   |  Discord   |   |   (LLM for AI   |
        |            |   |  Webhook   |   |    Agent node)   |
        +------------+   +------------+   +-----------------+
```

---

## 2. Workflows Breakdown

### WF1: Order Fulfillment Pipeline

| Step | n8n Node Type | Purpose |
|------|--------------|---------|
| 1 | **Shopify Trigger** | Fires on `orders/paid` webhook topic |
| 2 | **IF Node** (High-Ticket Gate) | Check `order.total_price >= threshold` (e.g., $250). Tag order as `high-ticket` in Shopify if true |
| 3 | **Function Node** (Fraud Check) | Flag if: billing country != shipping country, OR email is disposable domain, OR order note contains suspicious patterns. If flagged -> branch to manual review + Slack alert |
| 4 | **Function Node** (Address Validation) | Regex validation for US ZIP (^\d{5}(-\d{4})?$), basic field completeness check. Optionally call USPS/Lob API for production |
| 5 | **HTTP Request** (ShipBob Create Order) | POST `/1.0/order` with mapped payload |
| 6 | **IF Node** (Response Check) | Branch on HTTP status: 2xx -> success, else -> error handler |
| 7 | **Error Handler** (Slack/Discord) | POST failure details to webhook URL |

### WF2: Tracking Number Sync

| Step | n8n Node Type | Purpose |
|------|--------------|---------|
| 1 | **Cron Trigger** | Poll every 15 minutes (ShipBob webhooks are limited; polling is more reliable) |
| 2 | **HTTP Request** | GET `/1.0/shipment` with `HasTracking=true&Status=Completed` filter |
| 3 | **Function Node** | Match ShipBob shipments to Shopify order IDs via reference_id |
| 4 | **HTTP Request** (Shopify) | POST `/admin/api/2024-01/orders/{id}/fulfillments.json` with tracking number and carrier |
| 5 | **Error Handler** | Slack/Discord alert on failure |

**Alternative**: If ShipBob webhook support is enabled on your plan, replace the Cron trigger with a ShipBob webhook trigger on `shipment_delivered` / `shipment_shipped` events.

### WF3: AI Technical Support Agent

| Step | n8n Node Type | Purpose |
|------|--------------|---------|
| 1 | **Webhook Trigger** | Receives customer question via POST (from chat widget, email parser, etc.) |
| 2 | **AI Agent Node** (LangChain) | Configured with a system prompt scoped to Firewalla Gold Plus support |
| 3 | **Vector Store Tool** | Retrieves relevant chunks from the uploaded PDF manual (stored in Qdrant/Pinecone/in-memory) |
| 4 | **Order Lookup Tool** | Sub-workflow that calls Shopify API to check order/tracking status |
| 5 | **Respond to Webhook** | Returns the AI-generated answer |

---

## 3. Required API Scopes

### Shopify (Custom App via Admin API)

Create a custom app in **Settings > Apps and sales channels > Develop apps**.

| Scope | Purpose | Used In |
|-------|---------|---------|
| `read_orders` | Read order data from webhook payloads and for lookups | WF1, WF2, WF3 |
| `write_orders` | Tag orders (e.g., `high-ticket`, `fraud-review`) | WF1 |
| `read_fulfillments` | Check existing fulfillment status before creating new ones | WF2 |
| `write_fulfillments` | Create fulfillments with tracking numbers from ShipBob | WF2 |
| `read_products` | Product info for AI agent context | WF3 |
| `read_customers` | Customer lookup for support agent | WF3 |

**Webhook topics to register:**
- `orders/paid` (primary trigger for WF1)

**API version:** `2024-01` (stable)

### ShipBob (REST API v1.0)

Generate a PAT (Personal Access Token) in **ShipBob Dashboard > Settings > API**.

| Endpoint | Method | Purpose | Used In |
|----------|--------|---------|---------|
| `/1.0/order` | POST | Create fulfillment order in ShipBob | WF1 |
| `/1.0/order/{id}` | GET | Check order status | WF3 |
| `/1.0/shipment?orderId={id}` | GET | Get shipment/tracking for an order | WF2 |
| `/1.0/product` | GET | Verify product/inventory mapping | Setup |
| `/1.0/channel` | GET | Get your channel ID (required for order creation) | Setup |

**Required ShipBob scopes/permissions:**
- Orders: Read + Write
- Shipments: Read
- Products: Read
- Channels: Read

---

## 4. Data Mapping: Shopify Order -> ShipBob Order

```
Shopify Field                    ->  ShipBob Field
─────────────────────────────────────────────────────
order.id                         ->  reference_id (string)
order.shipping_address.name      ->  recipient.name
order.shipping_address.address1  ->  recipient.address.address1
order.shipping_address.address2  ->  recipient.address.address2
order.shipping_address.city      ->  recipient.address.city
order.shipping_address.province  ->  recipient.address.state
order.shipping_address.zip       ->  recipient.address.zip_code
order.shipping_address.country   ->  recipient.address.country
order.email                      ->  recipient.email
order.shipping_address.phone     ->  recipient.phone_number
order.line_items[].sku           ->  products[].reference_id
order.line_items[].quantity      ->  products[].quantity
```

---

## 5. High-Ticket Handling Logic

Since Firewalla Gold Plus retails at ~$500+, every order is potentially high-ticket. The fraud check layer is critical for margin protection.

**Automated fraud flags (any match -> manual review queue):**

1. **Geo mismatch**: `billing_address.country_code != shipping_address.country_code`
2. **Disposable email**: Check email domain against a known disposable-email list (maintained as a static JSON array or via API like `open.kickbox.com`)
3. **Velocity check**: Same email or shipping address placed 3+ orders in 24 hours (query Shopify orders API with date filter)
4. **High-risk shipping**: PO Box or freight forwarder addresses (regex pattern match)

**When flagged:**
- Add tag `fraud-review` to Shopify order
- Send Slack/Discord alert with order details
- Do NOT forward to ShipBob (halt pipeline)
- Human reviews and either clears (triggers manual re-run) or cancels

---

## 6. Error Handling Strategy

```
Any HTTP Request Node
        |
    [On Error: Continue]
        |
    IF: $json.statusCode >= 400
        |
   +----+----+
   |         |
  Yes        No
   |         |
  Slack    Continue
  Alert    Pipeline
   |
  Payload:
  {
    "text": "Order #{orderId} failed at {step}.
             Status: {statusCode}.
             Body: {responseBody}"
  }
```

Each workflow also has a global **Error Trigger** node that catches unhandled exceptions and sends them to the same Slack/Discord webhook.

---

## 7. Infrastructure

| Component | Detail |
|-----------|--------|
| **n8n** | Self-hosted Docker container (`n8nio/n8n:latest`) |
| **Database** | SQLite (default) or PostgreSQL for production scale |
| **Vector Store** (WF3) | Qdrant (Docker) or n8n's built-in in-memory store for small docs |
| **LLM Provider** (WF3) | OpenAI `gpt-4o-mini` or Anthropic `claude-sonnet` via n8n AI nodes |
| **Webhook Ingress** | n8n's built-in webhook URLs, fronted by a reverse proxy (Caddy/Nginx) with HTTPS |

### Docker Compose (planned)

```
services:
  n8n:        # port 5678
  qdrant:     # port 6333 (if using vector store)
  caddy:      # port 443 (reverse proxy)
```

---

## 8. Security Considerations

- All API keys stored as **n8n credentials** (encrypted at rest), never in workflow JSON
- Shopify webhook verification via HMAC signature check (first node in WF1)
- ShipBob PAT rotated quarterly
- n8n instance behind reverse proxy with basic auth or SSO
- Webhook endpoints use randomly generated paths (not guessable)

---

## 9. File Deliverables (After Approval)

| File | Description |
|------|-------------|
| `workflows/wf1-order-fulfillment.json` | n8n importable workflow for order pipeline |
| `workflows/wf2-tracking-sync.json` | n8n importable workflow for tracking sync |
| `workflows/wf3-ai-support-agent.json` | n8n importable workflow for AI agent |
| `docker-compose.yml` | Full stack: n8n + qdrant + caddy |
| `CLAUDE.md` | Project documentation with bash commands and API reference |

---

## 10. Open Questions for You

1. **Slack or Discord?** Which webhook integration do you want for error alerts?
2. **Address validation**: Simple regex only, or do you want USPS/Lob API integration for production-grade validation?
3. **AI Agent LLM**: OpenAI (gpt-4o-mini) or Anthropic (Claude) for the support agent node?
4. **Vector store**: Qdrant (separate container) or n8n's built-in in-memory vector store (simpler, limited to ~50 pages)?
5. **ShipBob webhooks**: Does your ShipBob plan support outbound webhooks, or should we stick with the polling approach for tracking sync?
6. **Fraud velocity check**: Do you want the 3+ orders/24hr check implemented (requires an extra Shopify API call per order), or is geo + email + address pattern sufficient?
