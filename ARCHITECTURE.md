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
        |  ShipBob   |   |   Email    |   |    Anthropic    |
        |    API     |   |   (SMTP)   |   |   Claude API    |
        |            |   | Alert to:  |   |  (LLM for AI    |
        |            |   | talaizen.. |   |   Agent node)   |
        +------------+   +------------+   +-----------------+
```

---

## 2. Workflows Breakdown

### WF1: Order Fulfillment Pipeline

| Step | n8n Node Type | Purpose |
|------|--------------|---------|
| 1 | **Shopify Trigger** | Fires on `orders/paid` webhook topic |
| 2 | **IF Node** (High-Ticket Gate) | Check `order.total_price >= threshold` (e.g., $250). Tag order as `high-ticket` in Shopify if true |
| 3 | **Function Node** (Fraud Check) | Flag if: billing country != shipping country, OR email is disposable domain, OR velocity threshold exceeded (3+ orders/24hr from same email or address), OR suspicious order notes. If flagged -> branch to manual review + email alert |
| 4 | **HTTP Request** (Address Validation via Lob) | Call Lob Address Verification API (`POST /v1/us_verifications`) for CASS-certified USPS validation. Checks deliverability, corrects formatting, flags undeliverable addresses. Fallback: regex + field completeness if Lob is unreachable |
| 5 | **HTTP Request** (ShipBob Create Order) | POST `/1.0/order` with mapped payload |
| 6 | **IF Node** (Response Check) | Branch on HTTP status: 2xx -> success, else -> error handler |
| 7 | **Error Handler** (Email via SMTP) | Send failure details to `talaizenbsc@gmail.com` via n8n Send Email node (SMTP) |

### WF2: Tracking Number Sync

| Step | n8n Node Type | Purpose |
|------|--------------|---------|
| 1 | **Cron Trigger** | Poll every 15 minutes (ShipBob webhooks are limited; polling is more reliable) |
| 2 | **HTTP Request** | GET `/1.0/shipment` with `HasTracking=true&Status=Completed` filter |
| 3 | **Function Node** | Match ShipBob shipments to Shopify order IDs via reference_id |
| 4 | **HTTP Request** (Shopify) | POST `/admin/api/2024-01/orders/{id}/fulfillments.json` with tracking number and carrier |
| 5 | **Error Handler** (Email) | Send failure details to `talaizenbsc@gmail.com` via SMTP |

**Dual-mode tracking strategy** (since ShipBob webhook availability is unknown):
- **Primary**: Cron polling every 15 minutes (always works, no plan dependency)
- **Optional upgrade**: The workflow includes a separate Webhook Trigger node. If ShipBob webhooks (`shipment_shipped` / `shipment_delivered`) are available on your plan, enable them in ShipBob dashboard pointing to this n8n webhook URL. The workflow detects the source and processes either path identically. This gives you near-real-time sync when available, with polling as a reliable fallback.

### WF3: AI Technical Support Agent

| Step | n8n Node Type | Purpose |
|------|--------------|---------|
| 1 | **Webhook Trigger** | Receives customer question via POST (from chat widget, email parser, etc.) |
| 2 | **AI Agent Node** (LangChain) | Configured with a system prompt scoped to Firewalla Gold Plus support |
| 3 | **Vector Store Tool** | Retrieves relevant chunks from the uploaded PDF manual (stored in Qdrant with persistent disk storage) |
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

### Lob Address Verification API

Sign up at **lob.com** and generate a Live API key.

| Endpoint | Method | Purpose | Used In |
|----------|--------|---------|---------|
| `/v1/us_verifications` | POST | CASS-certified USPS address verification | WF1 |

**Why Lob (best practice for address validation):**
- CASS-certified (USPS standard) - catches invalid/undeliverable addresses before they reach ShipBob
- Returns `deliverability` score: `deliverable`, `deliverable_unnecessary_unit`, `deliverable_incorrect_unit`, `deliverable_missing_unit`, `undeliverable`
- Auto-corrects minor formatting issues (apartment vs. apt, state abbreviation, ZIP+4)
- Prevents costly ShipBob re-ships due to bad addresses (~$15-30 per re-ship on high-ticket items)
- Free tier: 300 verifications/month (sufficient for low-volume high-ticket)
- Fallback: If Lob is unreachable, the workflow falls back to regex validation (US ZIP, required fields) and flags the order for manual address review

### Anthropic API (Claude)

Generate an API key at **console.anthropic.com**.

| Detail | Value |
|--------|-------|
| Model | `claude-sonnet-4-5-20250929` (best balance of cost, speed, and quality for support) |
| Used In | WF3 (AI Support Agent) |
| n8n Integration | Via the built-in **Anthropic Chat Model** node in n8n's AI/LangChain nodes |

### Email (SMTP) for Error Alerts

| Detail | Value |
|--------|-------|
| **Recipient** | `talaizenbsc@gmail.com` |
| **Method** | n8n **Send Email** node via SMTP |
| **Provider options** | Gmail App Password, SendGrid, or any SMTP relay |
| **Used In** | WF1 (error handler, fraud alerts), WF2 (error handler) |

**Why email over Slack/Discord:**
- Direct to your inbox, no extra app to monitor
- Gmail filters can be used to auto-label by severity (e.g., "fraud-alert" vs "api-error")
- Works offline (you'll see it when you check email)

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

| # | Check | Implementation | Severity |
|---|-------|---------------|----------|
| 1 | **Geo mismatch** | `billing_address.country_code != shipping_address.country_code` | HIGH - halt pipeline |
| 2 | **Disposable email** | Check email domain against bundled disposable-domain list (~3,000 domains as static JSON array in workflow). Updated quarterly. | HIGH - halt pipeline |
| 3 | **Velocity check** | Query Shopify Orders API: `GET /orders.json?email={email}&created_at_min={24h_ago}&status=any`. Flag if count >= 3. Also checks by shipping address hash. | HIGH - halt pipeline |
| 4 | **High-risk shipping** | Regex match for PO Box (`/p\.?\s*o\.?\s*box/i`), known freight forwarders (list of ~50 addresses: Shipito, MyUS, Planet Express, etc.) | MEDIUM - flag + allow with tag |
| 5 | **Address undeliverable** | Lob API returns `deliverability: "undeliverable"` | HIGH - halt pipeline |

**When flagged (HIGH severity):**
- Add tag `fraud-review` to Shopify order
- Send email alert to `talaizenbsc@gmail.com` with order details, flag reason, and a direct link to the Shopify order admin page
- Do NOT forward to ShipBob (halt pipeline)
- Human reviews and either:
  - **Clears**: Remove `fraud-review` tag, add `fraud-cleared` tag -> triggers a separate n8n workflow (manual re-run webhook) that picks up the order and sends it to ShipBob
  - **Cancels**: Cancel order in Shopify, refund issued

**When flagged (MEDIUM severity):**
- Add tag `fraud-watch` to Shopify order
- Send informational email to `talaizenbsc@gmail.com`
- Pipeline CONTINUES (order still sent to ShipBob)
- Provides awareness without blocking legitimate orders to forwarding services

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
  Email    Continue
  Alert    Pipeline
   |
  To: talaizenbsc@gmail.com
  Subject: "[n8n] Order #{orderId} FAILED at {step}"
  Body:
    Order ID: {orderId}
    Step: {step}
    HTTP Status: {statusCode}
    Response: {responseBody}
    Shopify Admin Link: https://{shop}.myshopify.com/admin/orders/{orderId}
    Timestamp: {ISO8601}
```

Each workflow also has a global **Error Trigger** node that catches unhandled exceptions and sends them to the same email address with subject prefix `[n8n CRITICAL]`.

---

## 7. Infrastructure

| Component | Detail |
|-----------|--------|
| **n8n** | Self-hosted Docker container (`n8nio/n8n:latest`) |
| **Database** | PostgreSQL (recommended for production - better concurrency, backup support, and n8n execution history retention) |
| **Vector Store** (WF3) | **Qdrant** (Docker container, persistent disk volume) |
| **LLM Provider** (WF3) | **Anthropic Claude** (`claude-sonnet-4-5-20250929`) via n8n's built-in Anthropic Chat Model node |
| **Webhook Ingress** | n8n's built-in webhook URLs, fronted by Caddy (automatic HTTPS via Let's Encrypt) |
| **Email Alerts** | n8n Send Email node via SMTP to `talaizenbsc@gmail.com` |

**Why Qdrant over in-memory (best practice for vector store):**
- Persistent storage: survives n8n container restarts (in-memory loses all embeddings on restart)
- Handles PDF manuals up to hundreds of pages without memory pressure
- Supports metadata filtering (e.g., filter by manual section/chapter)
- Production-grade: used in real RAG deployments, not a toy
- Lightweight: ~50MB Docker image, minimal resource usage
- Still simple: single Docker container, no cluster needed at this scale

### Docker Compose (planned)

```
services:
  n8n:        # port 5678, connected to postgres
  postgres:   # port 5432, persistent volume
  qdrant:     # port 6333, persistent volume for vector embeddings
  caddy:      # port 443, automatic HTTPS reverse proxy
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
| `workflows/wf2-tracking-sync.json` | n8n importable workflow for tracking sync (dual-mode: poll + webhook) |
| `workflows/wf3-ai-support-agent.json` | n8n importable workflow for AI agent with Claude + Qdrant |
| `docker-compose.yml` | Full stack: n8n + PostgreSQL + Qdrant + Caddy |
| `config/disposable-email-domains.json` | Static list of ~3,000 disposable email domains for fraud check |
| `config/freight-forwarders.json` | Known freight forwarder addresses for fraud check |
| `CLAUDE.md` | Project documentation with bash commands and API reference |

---

## 10. Resolved Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Error alerts** | Email to `talaizenbsc@gmail.com` via SMTP | Direct inbox delivery, Gmail filter support |
| **Address validation** | **Lob API** (CASS-certified USPS) with regex fallback | Best practice: prevents costly re-ships on $500+ product. Free tier covers low-volume high-ticket |
| **LLM provider** | **Anthropic Claude** (`claude-sonnet-4-5-20250929`) | User choice. Excellent reasoning for technical support, native n8n node support |
| **Vector store** | **Qdrant** (Docker, persistent disk) | Best practice: survives restarts, scales to large manuals, metadata filtering |
| **Tracking sync** | **Dual-mode**: Cron polling (primary) + ShipBob webhook (optional) | Covers unknown webhook availability. Polling always works; webhook upgrades to near-real-time if supported |
| **Fraud velocity check** | **Included** (3+ orders/24hr from same email or address) | Extra Shopify API call per order is acceptable for high-ticket margin protection |

---

## 11. Credentials You Will Need to Provide

Before the workflows can go live, configure these as **n8n Credentials** (Settings > Credentials):

| Credential | Type | Where to Get It |
|------------|------|-----------------|
| Shopify Admin API access token | Shopify API | Settings > Apps > Develop apps > Create app > API credentials |
| ShipBob PAT | HTTP Header Auth | ShipBob Dashboard > Settings > API > Personal Access Token |
| Lob API key (live) | HTTP Header Auth | lob.com > Dashboard > API Keys |
| Anthropic API key | Anthropic credential | console.anthropic.com > API Keys |
| SMTP credentials | SMTP (Email) | Gmail App Password, SendGrid API key, or any SMTP relay |

---

## 12. Cost Estimates (Monthly, Low Volume)

| Service | Free Tier | Estimated Cost at ~50 orders/mo |
|---------|-----------|-------------------------------|
| Lob address verification | 300/mo free | $0 (well within free tier) |
| Anthropic Claude API | Pay-per-use | ~$2-5/mo (support queries, sonnet pricing) |
| ShipBob | Per-order fulfillment | Varies by contract (not an API cost) |
| Shopify | Plan-dependent | Already covered by existing plan |
| n8n (self-hosted) | Free | $0 (self-hosted Docker) |
| Qdrant (self-hosted) | Free | $0 (self-hosted Docker) |
| **Total incremental API costs** | | **~$2-5/mo** |
