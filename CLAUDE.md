# Shopify-ShipBob n8n Automation

> 3PL-Hybrid fulfillment automation for Firewalla Gold Plus

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your domain, passwords, and encryption key

# 2. Start the stack
docker compose up -d

# 3. Access n8n
# https://your-domain.com (via Caddy reverse proxy)
# or http://localhost:5678 (direct, dev only)
```

## Docker Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs (all services)
docker compose logs -f

# View logs (specific service)
docker compose logs -f n8n
docker compose logs -f postgres
docker compose logs -f qdrant

# Restart n8n only (after config changes)
docker compose restart n8n

# Rebuild and restart (after docker-compose.yml changes)
docker compose up -d --force-recreate

# Check service health
docker compose ps

# Access n8n shell (for debugging)
docker compose exec n8n sh

# Backup PostgreSQL database
docker compose exec postgres pg_dump -U n8n n8n > backup_$(date +%Y%m%d).sql

# Restore PostgreSQL database
docker compose exec -T postgres psql -U n8n n8n < backup_YYYYMMDD.sql

# Backup Qdrant data (stop qdrant first)
docker compose stop qdrant
docker cp $(docker compose ps -q qdrant):/qdrant/storage ./qdrant-backup
docker compose start qdrant

# Update n8n to latest version
docker compose pull n8n
docker compose up -d n8n

# Nuclear option: full reset (destroys all data)
# docker compose down -v
```

## Workflows

| File | n8n Import Name | Trigger |
|------|----------------|---------|
| `workflows/wf1-order-fulfillment.json` | WF1: Shopify Order → ShipBob Fulfillment | Shopify `orders/paid` webhook |
| `workflows/wf2-tracking-sync.json` | WF2: ShipBob Tracking → Shopify Fulfillment Sync | Cron (15 min) + optional ShipBob webhook |
| `workflows/wf3-ai-support-agent.json` | WF3: AI Technical Support Agent | POST webhook `/support-agent` |

### Importing Workflows

1. Open n8n dashboard
2. Go to **Workflows** > **Import from File**
3. Select the JSON file
4. Update credential references (they will show as red/missing)
5. Activate the workflow

## API Endpoints Reference

### Shopify Admin API (v2024-01)

| Endpoint | Method | Used By |
|----------|--------|---------|
| `/admin/api/2024-01/orders.json` | GET | WF1 (velocity check), WF3 (order lookup) |
| `/admin/api/2024-01/orders/{id}.json` | PUT | WF1 (tagging) |
| `/admin/api/2024-01/orders/{id}/fulfillments.json` | POST | WF2 (tracking sync) |

**Base URL**: `https://{store}.myshopify.com`
**Auth**: `X-Shopify-Access-Token: {access_token}`
**Scopes needed**: `read_orders`, `write_orders`, `read_fulfillments`, `write_fulfillments`, `read_products`, `read_customers`

### ShipBob API (v1.0)

| Endpoint | Method | Used By |
|----------|--------|---------|
| `/1.0/order` | POST | WF1 (create order) |
| `/1.0/order` | GET | WF2 (fetch orders with tracking) |
| `/1.0/order/{id}` | GET | WF3 (order status) |
| `/1.0/channel` | GET | Setup (get channel ID) |
| `/1.0/product` | GET | Setup (verify SKU mapping) |

**Base URL**: `https://api.shipbob.com`
**Auth**: `Authorization: Bearer {pat_token}`
**Header**: `shipbob_channel_id: {channel_id}` (required on most endpoints)

### Lob Address Verification API

| Endpoint | Method | Used By |
|----------|--------|---------|
| `/v1/us_verifications` | POST | WF1 (address validation) |

**Base URL**: `https://api.lob.com`
**Auth**: HTTP Basic Auth (API key as username, empty password)

### Anthropic API

| Endpoint | Method | Used By |
|----------|--------|---------|
| `/v1/messages` | POST | WF3 (AI agent, via n8n node) |

**Model**: `claude-sonnet-4-5-20250929`
**Auth**: `x-api-key: {api_key}`

## n8n Credentials to Configure

After importing workflows, create these credentials in **Settings > Credentials**:

1. **Shopify Admin API** (`shopifyApi` type)
   - Store URL: `your-store.myshopify.com`
   - Access Token: from Shopify custom app

2. **ShipBob PAT** (`httpHeaderAuth` type)
   - Header Name: `Authorization`
   - Header Value: `Bearer {your_pat_token}`

3. **Lob API Key** (`httpBasicAuth` type)
   - Username: `{your_lob_live_api_key}`
   - Password: (leave empty)

4. **Anthropic API Key** (`anthropicApi` type)
   - API Key: from console.anthropic.com

5. **SMTP / Gmail** (`smtp` type)
   - Host: `smtp.gmail.com`
   - Port: `465` (SSL) or `587` (TLS)
   - User: your Gmail address
   - Password: Gmail App Password (not your regular password)

## Environment Variables

Set these in n8n **Settings > Variables** (or as Docker env vars):

| Variable | Example | Used By |
|----------|---------|---------|
| `SHOPIFY_STORE` | `my-store` | WF1, WF2, WF3 |
| `SHOPIFY_WEBHOOK_SECRET` | `whsec_...` | WF1 (HMAC verify) |
| `SHOPIFY_LOCATION_ID` | `12345678` | WF2 (fulfillment creation) |
| `SHIPBOB_CHANNEL_ID` | `98765` | WF1, WF2 |
| `SMTP_FROM_EMAIL` | `alerts@yourdomain.com` | All error handlers |

## Qdrant Vector Store Setup

To populate the Firewalla Gold Plus manual into Qdrant for the AI agent:

```bash
# Verify Qdrant is running
curl http://localhost:6333/health

# Create collection (if not auto-created by n8n)
curl -X PUT http://localhost:6333/collections/firewalla-manual \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    }
  }'
```

Then use n8n's **Document Loader** + **Vector Store** nodes to ingest the PDF:
1. Create a one-off workflow: File Read → PDF Loader → Text Splitter → Qdrant Vector Store (Insert)
2. Upload the Firewalla Gold Plus manual PDF
3. Run once to populate the collection

## Fraud Check Configuration

- Disposable email domains: `config/disposable-email-domains.json`
- Freight forwarder patterns: `config/freight-forwarders.json`
- To update: edit the JSON files and restart the workflow (or update n8n static data)

## Error Alerts

All errors are emailed to: `talaizenbsc@gmail.com`

| Subject Prefix | Severity | Action |
|---------------|----------|--------|
| `[n8n FRAUD ALERT]` | Order halted | Review in Shopify, clear or cancel |
| `[n8n INFO]` | Order continues | Informational, no action needed |
| `[n8n ERROR]` | API failure | Check logs, retry manually |
| `[n8n CRITICAL]` | Unhandled exception | Check n8n execution logs immediately |

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full technical design, data mappings, and decision rationale.
