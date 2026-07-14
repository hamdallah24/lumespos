# T.0 — Phase 4: Redis Audit

## Redis Infrastructure

**Files**: 8 files in `src/lib/redis/`

| File | Lines | Description |
|------|-------|-------------|
| `redis-config.ts` | 29 | Config interface + defaults. `isRedisEnabled()` checks `REDIS_HOST` env var. |
| `redis-connection.ts` | 113 | ioredis client lifecycle. Exponential backoff retry (max 10). |
| `redis-cache.ts` | 68 | GET/SET/DEL/SCAN with TTL. Cache-aside `remember()` pattern. |
| `redis-queue.ts` | 89 | LPUSH/BRPOP/LLEN. Polling consumer with dedup. |
| `redis-pubsub.ts` | 87 | PUBLISH/SUBSCRIBE with duplicate subscriber protection. |
| `redis-lock.ts` | 40 | SET NX EX acquire/release/withLock. |
| `redis-health.ts` | 55 | PING, uptime, queue length monitoring. |
| `index.ts` | 62 | `RedisService` singleton facade. |

**Dependency**: `ioredis@^5.11.1` (root workspace, not direct api-server dependency)

---

## Server Boot Integration

- **Phase 0** of boot sequence (`index.ts:81`): `await redisService.init()`
- **Graceful shutdown** (`index.ts:35`): `redisService.shutdown()`
- **Health check** (`health-monitor.ts:184-193`): PING + connection status
- **Component registry** (`registry.ts:211`): Registered as runtime component

---

## All Redis Consumers

| Consumer | File | Operations | Key Prefix |
|----------|------|-----------|------------|
| **AI Memory Service** | `services/ai-memory-service.ts` | `cache.get()`, `cache.set()`, `cache.del()` | `memory:history:{userId}:{mode}` |
| **Rate Limiter** | `routes/ai-helpers.ts` | Raw `INCR`, `PEXPIRE`, `PTTL` via `connection.getClient()` | `ratelimit:{userId}_{mode}:{window}` |
| **Knowledge Queue** | `ai/runtime/knowledge/knowledge-queue.ts` | `queue.push()`, `queue.pop()`, `queue.subscribe()`, `queue.length()` | `knowledge` |
| **Foundation Cache** | `ai/runtime/foundation/foundation-cache.ts` | `cache.set()` with 3600s TTL | `foundation:cache:{fingerprint}` |
| **Health Monitor** | `ai/runtime/health-monitor.ts` | `connection.ping()`, `connection.isConnected()` | — |

---

## Is Redis Used by Executive Runtime?

**TIDAK LANGSUNG.** Executives (CEO, CTO, COO, etc.) never import `redisService`. Redis serves their **supporting infrastructure**:

- Conversation history caching → AI chat modes
- Knowledge queue → Mission event processing
- Foundation cache → Directive asset caching
- Rate limiting → API protection

---

## Is Redis Used at Runtime?

| Question | Answer | Evidence |
|----------|--------|----------|
| Redis client initialized? | **YES** — Phase 0 of boot | `index.ts:81` |
| Redis used for sessions? | **NO** — sessions use PostgreSQL via connect-pg-simple | — |
| Redis used as primary DB? | **NO** — PostgreSQL is source of truth | — |
| Redis used for caching? | **YES** — conversation history, foundation cache | `ai-memory-service.ts`, `foundation-cache.ts` |
| Redis used for queuing? | **YES** — knowledge queue | `knowledge-queue.ts` |
| Redis used for pub/sub? | **NO** — module exists but has no subscribers | `redis-pubsub.ts` |
| Redis used for locking? | **YES** — available, but rarely exercised | `redis-lock.ts` |
| Redis currently enabled? | **NO** — `REDIS_HOST` not set in `.env` | `redis-config.ts:27` |
| Does app run without Redis? | **YES** — graceful degradation to in-memory | Every consumer checks `initialized` |

---

## Environment Status

| Environment | REDIS_HOST | Redis Status |
|-------------|:----------:|:------------:|
| Local (`artifacts/api-server/.env`) | Not set | **DISABLED** — falls back to in-memory |
| Production (VPS) | `localhost` | **ENABLED** — set via `deploy-redis.mjs` |

---

## Key Findings

1. **Redis is OPTIONAL but well-integrated.** Every consumer checks `redisService.initialized` and falls back gracefully.

2. **Redis Pub/Sub is dead code.** The `RedisPubSub` class is fully implemented but has zero subscribers in production code.

3. **Redis is infrastructure, not runtime memory.** It is used for caching and queuing, NOT as a memory store that executives read from.

4. **Documentation mismatch:** `EIOS_OPERATIONS_GUIDE.md` mentions `REDIS_URL` but the code uses `REDIS_HOST`/`REDIS_PORT`.

5. **Security concern:** `deploy-redis.mjs:4` contains a plaintext SSH password.
