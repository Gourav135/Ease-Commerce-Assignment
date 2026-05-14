-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE "CourierInteractionType" AS ENUM ('create', 'track', 'cancel');


-- ============================================================================
-- Tables
-- ============================================================================

CREATE TABLE "couriers" (
    "id"   SERIAL NOT NULL,
    "name" TEXT   NOT NULL,

    CONSTRAINT "couriers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
    "id"                          SERIAL        NOT NULL,
    "order_id"                    TEXT          NOT NULL,
    "courier_id"                  INTEGER       NOT NULL,
    "courier_order_id"            TEXT,
    "awb_number"                  TEXT,
    "current_status"              TEXT          NOT NULL,
    "request_payload_raw"         JSONB         NOT NULL,
    "response_payload_raw"        JSONB,
    "latest_tracking_payload_raw" JSONB,
    "created_at"                  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                  TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courier_interactions" (
    "id"               SERIAL                   NOT NULL,
    "order_ref_id"     INTEGER                  NOT NULL,
    "interaction_type" "CourierInteractionType" NOT NULL,
    "http_status"      INTEGER,
    "request_raw"      JSONB                    NOT NULL,
    "response_raw"     JSONB,
    "error_payload"    JSONB,
    "attempt"          INTEGER                  NOT NULL DEFAULT 1,
    "created_at"       TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_interactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tracking_history" (
    "id"               SERIAL       NOT NULL,
    "order_ref_id"     INTEGER      NOT NULL,
    "status"           TEXT         NOT NULL,
    "status_timestamp" TIMESTAMP(3) NOT NULL,
    "payload_raw"      JSONB        NOT NULL,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bulk_batches" (
    "id"            SERIAL       NOT NULL,
    "batch_id"      TEXT         NOT NULL,
    "status"        TEXT         NOT NULL,
    "total_count"   INTEGER      NOT NULL,
    "success_count" INTEGER      NOT NULL DEFAULT 0,
    "failure_count" INTEGER      NOT NULL DEFAULT 0,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bulk_batch_items" (
    "id"              SERIAL       NOT NULL,
    "batch_ref_id"    INTEGER      NOT NULL,
    "order_id"        TEXT         NOT NULL,
    "courier_partner" TEXT         NOT NULL,
    "status"          TEXT         NOT NULL,
    "result_payload"  JSONB,
    "error_payload"   JSONB,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_batch_items_pkey" PRIMARY KEY ("id")
);


-- ============================================================================
-- Unique constraints
-- ============================================================================

ALTER TABLE "couriers"         ADD CONSTRAINT "couriers_name_key"                       UNIQUE ("name");
ALTER TABLE "orders"           ADD CONSTRAINT "orders_order_id_courier_id_key"          UNIQUE ("order_id", "courier_id");
ALTER TABLE "bulk_batches"     ADD CONSTRAINT "bulk_batches_batch_id_key"               UNIQUE ("batch_id");
ALTER TABLE "bulk_batch_items" ADD CONSTRAINT "bulk_batch_items_batch_ref_id_order_id_key" UNIQUE ("batch_ref_id", "order_id");


-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX "orders_order_id_idx"
    ON "orders"("order_id");

CREATE INDEX "orders_courier_id_idx"
    ON "orders"("courier_id");

CREATE INDEX "courier_interactions_order_ref_id_created_at_idx"
    ON "courier_interactions"("order_ref_id", "created_at" DESC);

CREATE INDEX "courier_interactions_interaction_type_http_status_idx"
    ON "courier_interactions"("interaction_type", "http_status");

CREATE INDEX "courier_interactions_created_at_idx"
    ON "courier_interactions"("created_at");

CREATE INDEX "tracking_history_order_ref_id_idx"
    ON "tracking_history"("order_ref_id");


-- ============================================================================
-- Foreign keys
-- ============================================================================

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_courier_id_fkey"
    FOREIGN KEY ("courier_id") REFERENCES "couriers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "courier_interactions"
    ADD CONSTRAINT "courier_interactions_order_ref_id_fkey"
    FOREIGN KEY ("order_ref_id") REFERENCES "orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tracking_history"
    ADD CONSTRAINT "tracking_history_order_ref_id_fkey"
    FOREIGN KEY ("order_ref_id") REFERENCES "orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bulk_batch_items"
    ADD CONSTRAINT "bulk_batch_items_batch_ref_id_fkey"
    FOREIGN KEY ("batch_ref_id") REFERENCES "bulk_batches"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================================
-- Seed: registered couriers (ids must match courierId in each adapter config)
-- ============================================================================

INSERT INTO "couriers" ("id", "name") VALUES
    (1, 'urbanebolt'),
    (2, 'test');

SELECT setval('couriers_id_seq', (SELECT MAX(id) FROM "couriers"));
