// ECP-015 Phase 4: Execution Replay Engine
// Replaces fakeStream with timeline-driven replay of actual Runtime Events.
// Shows REAL pipeline progress, not cosmetic 4-char chunks.

import type { RuntimeEvent } from "./runtime-event";
import { RuntimeEventType } from "./runtime-event";

interface ReplayOptions {
  events: RuntimeEvent[];
  responseText: string;
  chunkSize?: number;
  delayMs?: number;
  res: any;
}

/** Replay the execution timeline as SSE events to the frontend */
export async function replayExecution(options: ReplayOptions): Promise<void> {
  const { events, responseText, chunkSize = 5, delayMs = 20, res } = options;

  // Step 1: Replay pipeline events with timing
  for (const ev of events) {
    // Emit as structured SSE
    res.write(`data: ${JSON.stringify({
      type: ev.category,
      runtime: ev.runtime,
      component: ev.component,
      event: ev.event,
      importance: ev.importance,
      id: ev.id,
              timestampMs: ev.timestamp,
              durationMs: ev.durationMs,
      payload: ev.payload,
    })}\n\n`);
    await sleep(delayMs);
  }

  // Step 2: Stream response text as tokens
  for (let i = 0; i < responseText.length; i += chunkSize) {
    const chunk = responseText.slice(i, i + chunkSize);
    res.write(`data: ${JSON.stringify({ type: "token", token: chunk })}\n\n`);
    await sleep(delayMs / 2); // Faster for tokens
  }

  // Step 3: Done
  res.write(`data: ${JSON.stringify({ type: "done", finalText: responseText })}\n\n`);
  res.end();
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
