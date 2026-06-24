import { Router } from "express";
import { requireRole } from "../middlewares/requireAuth";

const router = Router();

const N8N_WEBHOOK_URL = process.env.N8N_AI_AGENT_WEBHOOK_URL || "";

router.post("/ai/chat", requireRole("owner"), async (req, res) => {
  try {
    const { message } = req.body as { message?: string };

    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    if (!N8N_WEBHOOK_URL) {
      res.status(503).json({ error: "AI agent not configured" });
      return;
    }

    const user = req.user!;
    const payload = {
      message: message.trim(),
      branchId: user.branchId,
      userId: user.id,
      role: user.role,
      userName: user.name,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      res.status(502).json({ error: `AI agent error (${response.status})`, detail: text });
      return;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const reply = (data.reply as string) || (data.output as string) || (data.response as string) || JSON.stringify(data);

    res.json({ reply });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      res.status(504).json({ error: "AI agent timeout" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
