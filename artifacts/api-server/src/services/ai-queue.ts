// ECP-047: Background Mission Queue — in-memory, single-threaded worker
import { remember } from "./ai-memory-service";
import { aiMissionService } from "./ai-mission-service";
import { ctoProgram } from "../ai/programs/cto-runtime";

type QueueTask = {
  missionId: number;
  userId: number;
  message: string;
  mode: string;
};

function trimResult(text: string, max = 500): string {
  if (!text) return "";
  const cleaned = text
    .replace(/<｜｜DSML｜｜[\s\S]*?>/g, "")
    .replace(/<\/｜｜DSML｜｜[\s\S]*?>/g, "")
    .trim();
  return cleaned.length > max ? cleaned.slice(0, max) + "..." : cleaned;
}

class AiQueue {
  private queue: QueueTask[] = [];
  private processing = false;
  private activeMissionId: number | null = null;

  get isProcessing(): boolean { return this.processing; }
  get currentMissionId(): number | null { return this.activeMissionId; }

  enqueue(task: QueueTask): void {
    this.queue.push(task);
    if (!this.processing) this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) { this.processing = false; return; }
    this.processing = true;
    const task = this.queue.shift()!;
    this.activeMissionId = task.missionId;

    try {
      await aiMissionService.transition(task.missionId, "RUNNING");

      const result = await ctoProgram.execute({
        message: task.message,
        userId: task.userId,
        missionId: task.missionId,
        onProgress: (msg) => {
          aiMissionService.saveSnapshot(task.missionId, 0, { stage: msg });
        },
        onTool: (ev) => {
          aiMissionService.saveSnapshot(task.missionId, 0, {
            toolCalls: [{ name: ev.name, status: ev.status, durationMs: ev.durationMs }],
          });
        },
        onExecutionEvent: async (snapshot: any) => {
          if (snapshot?.progress?.overall !== undefined) {
            await aiMissionService.transition(task.missionId, "RUNNING", {
              progress: snapshot.progress.overall,
              strategy: snapshot.strategy,
              currentGoal: snapshot.currentGoal?.label,
              evidenceQuality: Math.round((snapshot.metrics?.evidenceQuality || 0) * 100),
              confidence: snapshot.metrics?.confidence || 0,
              cyclesExecuted: snapshot.metrics?.cyclesExecuted || 0,
            });
            await aiMissionService.saveSnapshot(task.missionId, snapshot.metrics?.cyclesExecuted || 0, {
              strategy: snapshot.strategy,
              stage: snapshot.stage,
              progress: snapshot.progress.overall,
              currentGoal: snapshot.currentGoal?.label,
              evidenceQuality: Math.round((snapshot.metrics?.evidenceQuality || 0) * 100),
              confidence: snapshot.metrics?.confidence || 0,
              metrics: snapshot.metrics,
            });
          }
        },
      });

      if (result.success && result.text) {
        await aiMissionService.transition(task.missionId, "COMPLETED", { result: result.text, progress: 100 });
        const summary = trimResult(result.text, 400);
        await remember(task.userId, "ceo", task.message,
          `✅ **Misi #${task.missionId} Selesai**\n\n${summary}\n\n📊 Detail lengkap bisa dilihat di dashboard Executive.`);
        aiMissionService.notifyCompleted(task.missionId, result.text, summary);
      } else {
        await aiMissionService.transition(task.missionId, "COMPLETED", { result: result.text || "(no output)", progress: 100 });
        await remember(task.userId, "ceo", task.message,
          `✅ **Misi #${task.missionId} Selesai** (tanpa output spesifik). Cek dashboard untuk detail.`);
      }
    } catch (e: any) {
      await aiMissionService.transition(task.missionId, "FAILED", { error: e.message || "Unknown error" });
      await remember(task.userId, "ceo", task.message,
        `❌ **Misi #${task.missionId} Gagal**: ${e.message || "Unknown error"}`);
      aiMissionService.notifyCompleted(task.missionId, "", `❌ Gagal: ${e.message || "Unknown error"}`);
    } finally {
      this.activeMissionId = null;
      this.processNext();
    }
  }
}

export const aiQueue = new AiQueue();
