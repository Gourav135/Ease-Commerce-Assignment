# Ease Commerce Assignment


I have commented in some palces so please just global search by "//"


Multi-courier integration platform. UrbaneBolt is the first concrete adapter; the design is pluggable so new couriers (Delhivery, Bluedart, etc.) drop in with one file.

Node 18+, TypeScript, Express, PostgreSQL (Prisma), Redis + BullMQ.

## Setup

1. Install
   ```bash
   npm install
   ```

2. Make sure Postgres and Redis are running locally. Defaults: `127.0.0.1:5432` and `127.0.0.1:6379`. Edit `config/qa.json` if different.

3. Create `.env`
   ```
   DATABASE_URL="postgresql://<user>@127.0.0.1:5432/postgres?schema=public"
   ```

4. Run migrations
   ```bash
   npm run migrate:dev
   ```

5. Start the API (the bulk worker starts in-process)
   ```bash
   npm run dev
   ```

## Local URLs

Once `npm run dev` is up, the server is running on **`http://localhost:3000`**.

| URL | What it is |
|---|---|
| `http://localhost:3000/` | Health check — returns `{ status: true, message: "..." }` to confirm the API is up |
| `http://localhost:3000/api/v1/...` | REST API base (see endpoint table below) |
| `http://localhost:3000/jobs` | **Bull Board UI** — live view of the bulk-order queue: waiting / active / completed / failed jobs, retry counts, payloads |

Open `/jobs` in a browser after submitting a bulk batch to watch the worker drain it in real time.

## Configuration

The repo ships `config/qa.json` and `secret/qa.json` so you can drop in credentials and run immediately — no need to copy from a template.

- **Non-secret settings:** `config/qa.json` (DB host, Redis, UrbaneBolt base URL, retries, queue concurrency, `courierId` per adapter).
- **Secrets:** `secret/qa.json` — replace `REPLACE_WITH_URBANEBOLT_USERNAME` / `REPLACE_WITH_URBANEBOLT_PASSWORD` with your own UrbaneBolt UAT credentials before running.
- `NODE_ENV=qa` (set by `npm run dev`) picks both up via the `config` package.

Key knobs:
- `urbanebolt.retries.maxAttempts` / `retryDelayMs` — retry policy for 5xx / network failures.
- `queues.bulkOrders.concurrency` — how many bulk items the worker processes in parallel.

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/orders` | Create a single order |
| `GET /api/v1/orders/:orderId/track` | Current status + timeline |
| `POST /api/v1/orders/:orderId/cancel` | Cancel an order |
| `POST /api/v1/orders/bulk` | Submit up to 100 orders, processed async via queue |
| `GET /api/v1/batches/:batchId` | Poll a bulk batch's status |

Every body takes a `courier_partner` field. Today only `"urbanebolt"` is supported.

## Testing

Import `Ease-Commerce-Assignment.postman_collection.json` — `{{baseUrl}}` is preset to `http://localhost:3000`.

Serviceable UrbaneBolt UAT pincodes I've tested with: `122001`, `122017` (both Gurgaon). Other pincodes get rejected by UrbaneBolt with a business error — that's expected, and the failure is persisted to `courier_interactions` for later reconciliation.

To inspect what was sent/received:
```sql
SELECT order_id, interaction_type, http_status, error_payload IS NOT NULL AS failed, created_at
FROM courier_interactions ORDER BY created_at DESC;
```

## How to add a new courier

1. Create `src/modules/couriers/<name>/<name>CourierAdapter.ts`. Extend `BaseCourierAdapter` and implement `CourierAdapter` (`createOrder` / `trackOrder` / `cancelOrder`). The base class handles 5xx retry with backoff and 401-then-reauth-then-retry-once for you.

2. Register it in `CourierRegistry`'s constructor:
   ```ts
   const adapter = new MyCourierAdapter();
   this.adapters.set(adapter.partnerCode, adapter);
   ```
3. **Insert a row into the `couriers` table.** The `id` you pick here is what every `orders.courier_id` will reference and must match the `"courierId"` in your config block (step 4).

   **Option A — proper migration (recommended).** Generates a new migration file that gets tracked in `prisma/migrations/` and applied on every fresh DB.

   ```bash
   # 1. Create an empty migration directory
   npx prisma migrate dev --create-only --name add_courier_delhivery
   ```

   Prisma writes an empty `prisma/migrations/<timestamp>_add_courier_delhivery/migration.sql`. Open it and paste:

   ```sql
   -- Register a new courier
   INSERT INTO "couriers" ("id", "name") VALUES (3, 'delhivery');

   -- Keep the auto-increment sequence in sync with the explicit id we just used,
   -- otherwise the next un-id'd INSERT will try id=3 again and hit a unique violation.
   SELECT setval('couriers_id_seq', (SELECT MAX(id) FROM "couriers"));
   ```

   Then apply:

   ```bash
   npx prisma migrate dev
   ```

   **OR — quick one-off via psql.** Faster, but skips Prisma's migration tracking, so anyone who later runs `prisma migrate reset` will lose this row.

   ```sql
   INSERT INTO couriers (id, name) VALUES (3, 'delhivery');
   SELECT setval('couriers_id_seq', (SELECT MAX(id) FROM "couriers"));
   ```
4. Add the courier's settings in `config/qa.json` (including `"courierId": 3` — must match the id from step 3) and credentials in `secret/qa.json`.
5. Wire those into `src/config/courierPartner.js` (add a new block alongside `urbanebolt`) and re-export it from `src/config/index.js` so the adapter can read `config.<courier>.baseUrl` etc.
6. No worker change needed — the bulk worker uses the same `OrderService` / `CourierRegistry`, so the new courier is picked up automatically. Just restart the process.

No controllers, services, DTOs, or shared business logic change.

## Notes

- The worker runs in-process. For real prod I'd split it into its own deployment so an OOMing worker can't take down the API.
- Response parsers in the UrbaneBolt adapter are defensive about missing keys — UAT sometimes omits fields the docs imply.
- Status normalization is per-adapter; there's no global enum yet. Listed as an open item in `lld.txt`.
