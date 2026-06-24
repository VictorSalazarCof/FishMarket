-- ============================================================
-- G10 – Reportería / Batch / Streaming
-- Modelo de Datos — Supabase / PostgreSQL
-- FishMarket Cloud
-- ============================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Ventas diarias consolidadas ───────────────────────────
CREATE TABLE IF NOT EXISTS report_sales_daily (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date       DATE        NOT NULL,
  total_revenue     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders      INTEGER     NOT NULL DEFAULT 0,
  avg_order_value   NUMERIC(10,2),
  total_items_sold  INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (report_date)
);

-- ── 2. Métricas por producto ──────────────────────────────────
CREATE TABLE IF NOT EXISTS report_product_metrics (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date  DATE         NOT NULL,
  product_id   VARCHAR(50)  NOT NULL,
  product_name VARCHAR(255),
  category     VARCHAR(100),
  units_sold   INTEGER      DEFAULT 0,
  revenue      NUMERIC(10,2) DEFAULT 0,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (report_date, product_id)
);

-- ── 3. Conteo de órdenes por estado ──────────────────────────
CREATE TABLE IF NOT EXISTS report_order_status (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date              DATE        NOT NULL,
  status                   VARCHAR(50) NOT NULL,
  order_count              INTEGER     DEFAULT 0,
  percentage               NUMERIC(5,2),
  avg_processing_time_days NUMERIC(8,2),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (report_date, status)
);

-- ── 4. Snapshots de inventario ────────────────────────────────
CREATE TABLE IF NOT EXISTS report_inventory_snapshots (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE        NOT NULL,
  product_id    VARCHAR(50) NOT NULL,
  product_name  VARCHAR(255),
  category      VARCHAR(100),
  current_stock INTEGER     NOT NULL,
  reorder_point INTEGER,
  is_low_stock  BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (snapshot_date, product_id)
);

-- ── 5. Métricas de fulfillment ────────────────────────────────
CREATE TABLE IF NOT EXISTS report_fulfillment_metrics (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date           DATE        NOT NULL,
  fulfillment_rate      NUMERIC(5,4),
  avg_delivery_time_days NUMERIC(6,2),
  on_time_delivery_rate NUMERIC(5,4),
  total_shipments       INTEGER     DEFAULT 0,
  delivered_count       INTEGER     DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (report_date)
);

-- ── 6. Resumen de pagos ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_payment_summaries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date       DATE        NOT NULL,
  payment_method    VARCHAR(50) NOT NULL,
  transaction_count INTEGER     DEFAULT 0,
  total_amount      NUMERIC(12,2) DEFAULT 0,
  success_count     INTEGER     DEFAULT 0,
  success_rate      NUMERIC(5,4),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (report_date, payment_method)
);

-- ── 7. Tracking de jobs de batch ──────────────────────────────
CREATE TABLE IF NOT EXISTS batch_jobs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         VARCHAR(100) UNIQUE NOT NULL,
  status         VARCHAR(20)  DEFAULT 'queued',  -- queued | running | completed | failed
  target_date    DATE,
  scope          VARCHAR(20)  DEFAULT 'daily',   -- daily | weekly | monthly
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  error_message  TEXT,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT chk_status CHECK (status IN ('queued','running','completed','failed')),
  CONSTRAINT chk_scope  CHECK (scope  IN ('daily','weekly','monthly'))
);

-- ── 8. Log de eventos consumidos (RabbitMQ → G10) ────────────
CREATE TABLE IF NOT EXISTS streaming_events_log (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         VARCHAR(100) UNIQUE,
  event_type       VARCHAR(100) NOT NULL,
  source_group     VARCHAR(10),  -- G5, G6, etc.
  payload          JSONB,
  consumed_at      TIMESTAMPTZ  DEFAULT NOW(),
  processed        BOOLEAN      DEFAULT FALSE,
  processing_error TEXT
);

-- ── Índices ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_daily_date
  ON report_sales_daily (report_date DESC);

CREATE INDEX IF NOT EXISTS idx_product_metrics_date
  ON report_product_metrics (report_date DESC);

CREATE INDEX IF NOT EXISTS idx_product_metrics_product
  ON report_product_metrics (product_id);

CREATE INDEX IF NOT EXISTS idx_order_status_date
  ON report_order_status (report_date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_low_stock
  ON report_inventory_snapshots (is_low_stock)
  WHERE is_low_stock = TRUE;

CREATE INDEX IF NOT EXISTS idx_batch_jobs_status
  ON batch_jobs (status)
  WHERE status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS idx_streaming_events_unprocessed
  ON streaming_events_log (processed, consumed_at)
  WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_streaming_events_source
  ON streaming_events_log (source_group, event_type);
