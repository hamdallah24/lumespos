# CKO Playbook

**Version:** 1.0.0  
**Status:** Architecture v4.1

---

## Thinking Process

1. **Classify** — Is this a council request, advisory request, or knowledge query?
2. **Council mode** — If council/meeting/minutes request, retrieve councilSessionManager logs
3. **Advisory mode** — If advisory, delegate to consultantRuntime
4. **Direct mode** — Fallback: use KnowledgePlatform + direct LLM
5. **Record** — Always record CKO actions as knowledge episodes
6. **Audit** — Log CKO execution

## Decision Tree

```
Knowledge query received
  → Is council request?
    ├── YES → councilSessionManager.getAll()
    │         → Format recent sessions → Return
    └── NO → Is advisory request?
        ├── YES → consultantRuntime.analyze()
        │       ├── Success → Record episode → Return
        │       └── Fail → Fallback to Direct LLM
        └── NO → Direct LLM mode
                → KnowledgeProvider.searchAll()
                → KnowledgeProvider.getStats()
                → BriefGenerator.generate()
                → Assemble prompt → callDeepSeek()
                → Record episode → Return
```

## Workflow

```
1. Identity          → CKO identity (implicit)
2. Council Check     → Check for council keywords
3. Council Mode OR Advisory Mode OR Direct LLM Mode
4. Record Episode    → ingestEpisode() with "cko_advisory" or "cko_direct_llm"
5. Audit Log         → auditEngine.log()
```

## Council Secretary Mode
```
Message contains: council, rapat, minutes, notulen
  → councilSessionManager.getAll()
  → Format last 5 sessions
  → sessionId, status, decisions count
  → Return summary
```

## Advisory Mode
```
  → consultantRuntime.analyze("founder_advisory", message)
  → If success: return advisory text
  → If fail: fallback to Direct LLM mode
```

## Direct LLM Mode
```
  → KnowledgeProvider.searchAll(message) — get relevant knowledge
  → KnowledgeProvider.getStats() — platform stats
  → BriefGenerator.generate() — create context brief
  → Assemble CKO prompt with identity, stats, knowledge, brief
  → callDeepSeek() — generate response
  → Return response
```

## Best Practice
- Use council mode keywords: council, rapat, minutes, notulen
- Delegate to consultantRuntime for advisory (it has richer context)
- Always include knowledge platform stats in direct LLM mode
- Tag episodes properly: `["cko", "advisory"]` or `["cko", "direct"]`
- CKO consultation is async — return results when available

## Anti Pattern
- ❌ Making business decisions disguised as knowledge advice
- ❌ Ignoring council session logs when requested
- ❌ Fabricating knowledge or best practices
- ❌ Not recording CKO actions as knowledge episodes
- ❌ Importing from `eios-runtime/internal/*`

## Common Mistakes
- Not recognizing council keywords
- consultantRuntime failure causing ungraceful fallback
- Forgetting to include platform stats in prompt
- Not filtering recent sessions (showing all instead of last 5)
- Tagging episodes incorrectly

## Recovery Strategy
- **consultantRuntime unavailable**: Fallback to Direct LLM mode gracefully
- **CouncilSessionManager unavailable**: Return partial data with note
- **KnowledgePlatform unavailable**: Use generic LLM response
- **LLM error**: Return fallback message
