# EIOS Operations Guide

## Startup Sequence

The system boots in a specific order to ensure all dependencies are available:

1. **Foundation Load** — Load directives, identity, and base configuration
2. **Kernel Boot** — Register all components and validate dependencies
3. **Layer Initialization** — Initialize each EIOS layer in dependency order:
   - Business Intelligence
   - Operational Decision Engine
   - Strategy Engine
   - Execution Planner
   - Knowledge & Learning Platform
   - Executive Runtime
   - Communication Runtime
   - Governance
   - Executive Council
   - North Star
4. **Server Listen** — Start Express HTTP server on configured port

## Health Checks

Each component exposes a `health()` method returning:
```typescript
{ status: "healthy" | "degraded" | "unhealthy"; uptime: number; version: string; custom: Record<string, unknown> }
```

Monitor endpoint: `GET /api/readiness`

## Logging

Uses Pino logger. Log levels:
- `info` — Normal operations, boot events
- `warn` — Non-critical failures, fallbacks
- `error` — Critical failures, unhandled rejections

## Configuration

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | — | HTTP server port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | No | — | Redis connection string |
| `FOUNDATION_PATH` | No | `./foundation/` | Foundation directive files path |

### Foundation Directives
Loaded from `foundation/` directory. Each executive role has a directive file:
- `CEO.json`, `CTO.json`, `COO.json`, `CFO.json`, `CMO.json`, `CAIO.json`, `CKO.json`

## Monitoring

### Mission Engine
- Polls active missions every 5 seconds
- Max 3 concurrent missions per tick
- Manual trigger available via `missionEngine.triggerTick()`

### Learning Cycle
- Runs daily at boot time + 24h
- Processes outcomes, adjusts confidence, promotes/deprecates patterns

### Council Sessions
- Created on-demand via `CouncilProvider.createSession()`
- Escalates to Founder if no consensus reached

## Troubleshooting

### Component Not Initializing
1. Check boot log for layer initialization errors
2. Verify all dependencies are registered
3. Run `npm run typecheck` to check for type errors

### Event Bus Issues
1. Verify event is published with correct type string
2. Check subscriber registration
3. Verify EventStore persistence layer

### Knowledge Platform Empty
1. Events may not be reaching BI layer
2. Learning cycle may not have run yet
3. Manually ingest using `KnowledgeProvider.ingestEpisode()`

### Executive Not Responding
1. Check identity exists in foundation directives
2. Verify directive file is properly formatted
3. Check governance permissions for the requested action

## Performance Tuning

| Component | Bottleneck | Solution |
|-----------|------------|----------|
| Event Bus | High throughput | Partition by domain |
| BI Layer | Too many facts | Adjust threshold parameters |
| Decision Engine | Slow rules | Optimize rule conditions |
| Knowledge Query | Large memory | Tune TTL and archiving |
| Brief Generation | Large context | Enable summarization |
