# High-Level Design (HLD)

This document contains a high-level architecture diagram for the Aurora-Atlan Event Booking backend. The diagram is provided as a Mermaid graph so it can be rendered in tools that support Mermaid, and as a static SVG (see `docs/hld_diagram.svg` if your viewer doesn't render Mermaid).

## Mermaid diagram

```mermaid
graph LR
  Client[Client\n(browser/mobile)] -->|HTTP REST| API[API Server\n(Express + Node.js)]
  API -->|Enqueue job| Redis[Redis Queue\n(Bull/Queue)]
  API -->|Read cache| RedisCache[(Redis Cache)]
  API -->|DB reads/writes| DB[(Postgres + Prisma)]
  Redis -->|job pulled| Worker[Worker Process\n(bookingWorker.js)]
  Worker -->|DB transaction| DB
  Worker -->|Update job status| Redis
  Admin[Admin Console] -->|HTTP| API
  Metrics[Metrics & Logs] -->|scrape/logs| Observability[Observability/Alerts]
  API --> Observability
  Worker --> Observability
  subgraph Infra
    Redis
    DB
    Observability
  end

  style API fill:#f9f,stroke:#333,stroke-width:1px
  style Worker fill:#bbf,stroke:#333,stroke-width:1px
  style Redis fill:#f66,stroke:#333,stroke-width:1px
  style DB fill:#6f6,stroke:#333,stroke-width:1px
  style Observability fill:#eee,stroke:#333,stroke-width:1px

```

## Diagram explanation

- Client: browser or mobile app making authenticated requests.
- API Server: validates requests, enqueues booking jobs, serves reads (with optional Redis cache).
- Redis Queue: holds booking jobs and job metadata. Ensures FIFO ordering and quick queue operations.
- Worker: background process that processes jobs, performs DB transactions, and marks job completion/failure.
- Database: Postgres with Prisma ORM storing Users, Events, Bookings. Transactions and row locking are used to avoid oversell.
- Observability: metrics, logs, and alerts collected from API and worker; recommended exporters/agents: Prometheus + Grafana + centralized log store.

## Static SVG

If your environment cannot render Mermaid, an SVG version exists at `docs/hld_diagram.svg` (generated from the Mermaid source). The mermaid source is the canonical version — edit it if you want to change the diagram.

---

Files added:
- `docs/HLD.md` — this file (Mermaid + explanation)
- `docs/hld_diagram.mmd` — Mermaid source (identical content)
- `docs/hld_diagram.svg` — optional static SVG placeholder
