# CLAUDE.md

Read this entire file before writing any code.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js w/ TypeScript |
| Relational DB | PostgreSQL (kysely) |
| Messaging | RabbitMQ (amqplib) |
| Validation | zod |
| Logger | pino |
| Tests | vitest |
| Observability | OpenTelemetry · Prometheus · Loki · Tempo · Grafana |

---

## Structure and Architecture

This application should implement Hexagonal Architectural Pattern, so every domain must have zero knowledge of infrastructure. Also, any unnecessary folder or configuration from the Skeleton to this application in specific should be ignored.
The folder structure and base configuration should use the application Skeleton (which is in the same root folder as this project) as the base example. It should include TypeScript as a tool that needs to be configured.

### Inbound Communications

The inbound coomunications are:
> Updated Profile Queue: Events of the Profile domain notifying that a profile was updated.
> Profiles Matched Queue: Events of the Match domain notifying that a match occured successfully beetwen two profiles.
> Discovery Triggered Queue: Events from this application itself requesting a discovery to be proccessed for a specific profile. Discovery is the proccess of defining the suggestions of profiles to be matched (or not) by the user.

---

### Outbound Communications

The outbound coomunications are:
> DataProfileDB: A DiscoveryEngine specific database where the needed information from the matches and profile updates are storaged.
> Suggestions Listed Queue: Events with a new suggestions listed for a specific profile. This will be consumed by the Match Domain.
> Discovery Triggered Queue: Events requesting a discovery to be proccessed for a specific profile. This event will be proccessed by this own application.

### SQL Database

The configuration and manipulation of the database should be done through migrations.

### RabbitMQ — asynchronous events

Used for all side effects that do not require an immediate response.
A service publishes an event and moves on — it never waits for downstream reactions.

Routing key pattern: `[service].[entity].[action]`

Examples:
- `profile.user.created`
- `match.match.created`
- `party.member.joined`
- `chat.message.sent`

Always publish through `IEventPublisher` — never import the RabbitMQ client directly in a use case.
Failed messages go to dead letter queue automatically.

### TLS strategy

| Layer | Protocol |
|---|---|
| Client → NGINX | HTTPS (TLS termination) |
| NGINX → services | HTTP (private network) |
| Service → service (events) | RabbitMQ over private network |

mTLS between internal services is deferred — not part of the current scope.

---

## Patterns

### Repository pattern
Every database operation lives in a repository class inside `adapters/outbound/db/`.
Repositories implement an outbound port interface defined in `domain/ports/outbound/`.
No query outside a repository. No business logic inside a repository.

### Event-driven architecture
Services communicate exclusively through RabbitMQ events for async operations.
Each service owns its events and is the only publisher of them.
Other services react by subscribing — they never call the origin service directly.

### Clean Code
- Functions do one thing
- Names are self-explanatory — no abbreviations (`usr`, `cfg`, `msg`)
- No magic numbers or strings — use named constants
- Max function length: ~20 lines. Extract if it grows beyond that
- No nested callbacks — async/await throughout
- No commented-out code in commits

---

## Language

All code in English: variable names, function names, class names, comments, commit messages, branch names, error codes, routing keys, column names.

---

Error classes in `src/shared/errors.ts`:
- `AppError(message, statusCode, code)`
- `NotFoundError(resource)`
- `ValidationError(message)`
- `UnauthorizedError()`
- `ConflictError(message)`

---

## Environment variables (required in every service)

The list below is just an example and should be adjusted by the context of the application.

```
PORT
DATABASE_URL
RABBITMQ_URL
JWT_SECRET
NODE_ENV
LOG_LEVEL                      # default: info
OTEL_EXPORTER_OTLP_ENDPOINT    # OTel Collector URL
SENTRY_DSN                     # optional
```

Validated with zod at boot. Missing required var = process exits with a clear message.
Never use `process.env` outside `src/config/env.ts`.

---

## Health check

Every service exposes `GET /health` — no auth required.

```json
{
  "status": "ok",
  "dependencies": {
    "postgres": "ok",
    "rabbitmq": "ok"
  }
}
```

---

## Boot sequence (`main.ts`)

1. Initialize OpenTelemetry SDK (must be first — patches modules at startup)
2. Validate env vars
3. Connect database
4. Connect RabbitMQ
5. Register queue subscribers
6. Handle `SIGTERM` and `SIGINT` — graceful shutdown

---

## Observability

Every service is instrumented with **OpenTelemetry** from day one.
The OTel SDK is the only instrumentation layer — it exports to all backends without code changes.

| Concern | Tool |
|---|---|
| Logs | Loki (collected via pino + pino-loki transport) |
| Metrics | Prometheus (each service exposes `GET /metrics`) |
| Tracing | Tempo (distributed traces via OTel exporter) |
| Dashboards | Grafana (unified view of logs, metrics, traces) |

### Instrumentation rules

- Initialize the OTel SDK in `main.ts` before anything else — it must patch modules at startup
- Every service exports traces to the OTel Collector; never export directly to Tempo or Jaeger
- Span names follow the pattern: `[service].[operation]` (e.g. `profile.createUser`)
- Never log sensitive data — no passwords, tokens, or PII in logs or spans
- Sentry DSN is an env var (`SENTRY_DSN`) — optional, service starts normally if absent

### Required env vars for observability

The list below is just an example and should be adjusted by the context of the application.

```
OTEL_EXPORTER_OTLP_ENDPOINT   # OTel Collector URL
SENTRY_DSN                     # optional
```

### Health check includes observability status

```json
{
  "status": "ok",
  "dependencies": {
    "postgres": "ok",
    "rabbitmq": "ok",
    "otel": "ok"
  }
}
```

---

## GitFlow

| Branch | Purpose |
|---|---|
| `main` | Production — protected, merge via PR only |
| `develop` | Integration — base for all feature branches |
| `feature/[name]` | New feature — branched from `develop` |
| `fix/[name]` | Bug fix — branched from `develop` |
| `hotfix/[name]` | Critical production fix — branched from `main` |
| `release/[version]` | Release prep — branched from `develop` |

Commit message format: `type: short description`
Types: `feat` · `fix` · `refactor` · `test` · `docs` · `chore`

Examples:
- `feat: add character availability field`
- `fix: correct compatibility score calculation`
- `refactor: extract message mapper to separate class`
