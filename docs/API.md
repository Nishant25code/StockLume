# REST API

Base URL: `http://localhost:4000/api` locally, `https://<api-project>.vercel.app/api` in production.
All request and response bodies are JSON. Field names in JSON are **camelCase**; database columns are **snake_case** — convert in the service layer.

## Standard response format

**Success**

```json
{
  "success": true,
  "data": { "id": "…", "name": "Basmati Rice 5kg" },
  "meta": { "total": 42 }
}
```

`meta` is optional (use it for pagination/counts). Always send success responses with `sendSuccess(res, data, status?, meta?)` from `src/utils/response.js`.

**Error**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "quantity must be a positive integer",
    "details": { "field": "quantity" }
  }
}
```

Throw errors with `ApiError` from `src/utils/ApiError.js` — the central error handler formats them. Never send error responses by hand.

```js
throw ApiError.badRequest('quantity must be a positive integer', { field: 'quantity' });
throw new ApiError(409, 'INSUFFICIENT_STOCK', 'Only 4 units in stock');
```

### Error codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad/missing input, or a database CHECK/FK violation |
| 400 | `INVALID_JSON` | Body is not valid JSON |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired token |
| 403 | `FORBIDDEN` | Wrong role, or resource belongs to another business |
| 404 | `NOT_FOUND` | Resource does not exist (or is not visible to you) |
| 404 | `ROUTE_NOT_FOUND` | Unknown URL |
| 409 | `CONFLICT` | Duplicate (unique constraint) |
| 409 | `INVALID_STATUS_TRANSITION` | Order action not allowed in current status |
| 409 | `INSUFFICIENT_STOCK` | Sale/dispatch exceeds available stock |
| 409 | `NOT_CONNECTED` | Retailer and wholesaler have no active connection |
| 500 | `INTERNAL_ERROR` | Unexpected server error (logged) |
| 503 | `SERVICE_NOT_CONFIGURED` | Database / Supabase env variables missing |

Add new codes to this table when you introduce them.

## Conventions

- **Auth:** every endpoint except `/health` requires `Authorization: Bearer <supabase-access-token>`. See [ARCHITECTURE.md](ARCHITECTURE.md#authentication--role-authorization-flow).
- **Scoping:** never trust a `businessId` from the request body or query — always use `req.user.businessId`.
- **Not yours = 404:** if a record exists but belongs to another business, respond `404 NOT_FOUND` (don't reveal it exists).
- **IDs** are UUIDs in the URL: `/products/:id`.
- **Lists** support `?limit=` (default 50, max 200) and `?offset=`; return `meta: { total, limit, offset }`.
- **Dates** are ISO-8601 strings (`2026-11-16T09:30:00.000Z`).
- **Money** is a number with 2 decimals (`520.5`), currency INR.
- **Actions** that change order status are `POST /orders/:id/<action>` — easier to read than a generic `PATCH status`.

## Endpoint plan

Legend: **R** = retailer, **W** = wholesaler. Status: ✅ done · 🔜 planned.

### Health — team lead

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/health` | public | API status + database check | ✅ |

### Auth — Member 1

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/auth/register` | signed-in, no profile yet | Create business + profile. Body: `{ fullName, businessName, businessType, phone?, city? }` | 🔜 |
| GET | `/auth/me` | any | Current user, business and role | 🔜 |

### Connections — Member 1

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/connections` | R, W | R: my wholesalers · W: my retailers | 🔜 |
| GET | `/connections/discover` | R | Wholesalers I'm not connected to yet | 🔜 |
| POST | `/connections` | R | Connect to a wholesaler. Body: `{ wholesalerId }` | 🔜 |
| PATCH | `/connections/:id` | W | Change status. Body: `{ status }` | 🔜 |

### Products — Member 1

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/products` | R, W | W: own catalogue · R: active products of connected wholesalers (`?wholesalerId=`, `?search=`) | 🔜 |
| GET | `/products/:id` | R, W | One product | 🔜 |
| POST | `/products` | W | Body: `{ name, sku, category?, unit?, price, availableQuantity }` | 🔜 |
| PATCH | `/products/:id` | W | Update price, quantity, details, `isActive` | 🔜 |
| DELETE | `/products/:id` | W | Soft delete (`is_active = false`) | 🔜 |

### Inventory — Member 2

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/inventory` | R | Stock list joined with product + wholesaler + risk | 🔜 |
| POST | `/inventory` | R | Add product to inventory. Body: `{ productId, quantity }` | 🔜 |
| PATCH | `/inventory/:id/adjust` | R | Body: `{ change, note }` (± quantity) | 🔜 |
| GET | `/inventory/movements` | R | Stock movement history (`?productId=`) | 🔜 |
| GET | `/inventory/reorder-rules` | R | All rules | 🔜 |
| PUT | `/inventory/reorder-rules/:productId` | R | Upsert. Body: `{ minStock, reorderQuantity, leadTimeDays }` | 🔜 |

### Sales — Member 2

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/sales` | R | History (`?productId=&from=&to=`) | 🔜 |
| POST | `/sales` | R | Record sale. Body: `{ productId, quantity, unitPrice? }` → reduces inventory | 🔜 |
| POST | `/sales/simulate` | R | Generate demo sales. Body: `{ days: 7 }` | 🔜 |

### Predictions — Member 2

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/predictions/stockout` | R | Probability + risk per product ([model](STOCKOUT_MODEL.md)) | 🔜 |
| GET | `/predictions/low-stock` | R | Only `MEDIUM`/`HIGH` items | 🔜 |

### Orders — Member 3

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/orders/suggestions` | R | Build/refresh suggested `DRAFT` orders, one per wholesaler | 🔜 |
| GET | `/orders` | R, W | List (`?status=`). **W never sees `DRAFT`** | 🔜 |
| GET | `/orders/:id` | R, W | Order with items | 🔜 |
| POST | `/orders` | R | Empty draft. Body: `{ wholesalerId, notes? }` | 🔜 |
| PUT | `/orders/:id/items` | R | Replace items of a `DRAFT`. Body: `{ items: [{ productId, quantity }] }` | 🔜 |
| POST | `/orders/:id/submit` | R | `DRAFT → SUBMITTED` ⭐ notifies wholesaler | 🔜 |
| POST | `/orders/:id/cancel` | R | `DRAFT/SUBMITTED → CANCELLED` | 🔜 |
| POST | `/orders/:id/accept` | W | `SUBMITTED → ACCEPTED` | 🔜 |
| POST | `/orders/:id/reject` | W | `SUBMITTED → REJECTED`. Body: `{ reason }` | 🔜 |
| POST | `/orders/:id/dispatch` | W | `ACCEPTED → DISPATCHED`, reduces wholesaler stock | 🔜 |
| POST | `/orders/:id/deliver` | R | `DISPATCHED → DELIVERED`, increases retailer inventory | 🔜 |

### Notifications — Member 4

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/notifications` | R, W | My business's notifications (`?unread=true`) | 🔜 |
| GET | `/notifications/unread-count` | R, W | `{ count }` for the header bell | 🔜 |
| PATCH | `/notifications/:id/read` | R, W | Mark one read | 🔜 |
| PATCH | `/notifications/read-all` | R, W | Mark all read | 🔜 |

### Dashboard & analytics — Member 4

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/dashboard/retailer` | R | KPIs: stock value, low-stock count, open orders, sales (7d) | 🔜 |
| GET | `/dashboard/wholesaler` | W | KPIs: pending orders, revenue, connected retailers, top products | 🔜 |
| GET | `/analytics/sales-trend` | R, W | Daily totals (`?days=30`) | 🔜 |
| GET | `/analytics/top-products` | R, W | Best sellers (R: by sales · W: by ordered quantity) | 🔜 |
| GET | `/analytics/orders-summary` | R, W | Count of orders per status | 🔜 |

When you finish an endpoint, change 🔜 to ✅ in your PR.

## Testing an endpoint by hand

```bash
# health (no auth)
curl http://localhost:4000/api/health

# authenticated: copy access_token from the browser (Supabase session) once login works
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/products
```
