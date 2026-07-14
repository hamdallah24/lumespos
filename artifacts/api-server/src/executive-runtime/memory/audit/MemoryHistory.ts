import type { MemoryRecord, MemoryTraceEvent } from "../models/MemoryRecord";
import { MemoryTrace } from "./MemoryTrace";

export class MemoryHistory {
  private trace = new MemoryTrace();

  getTrace(record: MemoryRecord): MemoryTraceEvent[] {
    return record.trace;
  }

  getCreationEvent(record: MemoryRecord): MemoryTraceEvent | undefined {
    return record.trace.find(e => e.event === "created");
  }

  getLastTransition(record: MemoryRecord): MemoryTraceEvent | undefined {
    const transitions = record.trace.filter(e => e.previousState && e.newState);
    return transitions.length > 0 ? transitions[transitions.length - 1] : undefined;
  }

  timeInState(record: MemoryRecord, state: string): number | null {
    let enteredStateAt: string | null = null;

    for (const event of record.trace) {
      if (event.newState === state) {
        enteredStateAt = event.timestamp;
      } else if (event.previousState === state && event.newState !== state) {
        if (enteredStateAt) {
          return new Date(event.timestamp).getTime() - new Date(enteredStateAt).getTime();
        }
      }
    }

    if (enteredStateAt) {
      return Date.now() - new Date(enteredStateAt).getTime();
    }

    return null;
  }

  getStateHistory(record: MemoryRecord): { state: string; enteredAt: string; duration: number | null }[] {
    const history: { state: string; enteredAt: string; duration: number | null }[] = [];
    let currentState: string | null = null;
    let enteredAt: string | null = null;

    for (const event of record.trace) {
      if (event.newState && event.timestamp) {
        if (currentState && enteredAt) {
          history.push({
            state: currentState,
            enteredAt,
            duration: new Date(event.timestamp).getTime() - new Date(enteredAt).getTime(),
          });
        }
        currentState = event.newState;
        enteredAt = event.timestamp;
      }
    }

    if (currentState && enteredAt) {
      history.push({
        state: currentState,
        enteredAt,
        duration: null,
      });
    }

    return history;
  }

  getAccessHistory(record: MemoryRecord): { accessedAt: string; times: number }[] {
    const accessEvents = record.trace.filter(e => e.event === "modified" || e.event === "promoted");
    if (accessEvents.length === 0) return [];

    return accessEvents.map(e => ({
      accessedAt: e.timestamp,
      times: record.accessCount,
    }));
  }
}
