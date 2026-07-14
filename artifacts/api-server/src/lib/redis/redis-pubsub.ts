import type Redis from "ioredis";

type PubSubHandler = (event: { type: string; payload: unknown }) => void;

export class RedisPubSub {
  private subscriber: Redis | null = null;
  private handlers = new Map<string, PubSubHandler[]>();

  constructor(private getClient: () => Redis | null) {}

  private isAvailable(): boolean {
    const client = this.getClient();
    return client !== null && client.status === "ready";
  }

  async initSubscriber(): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      this.subscriber = this.getClient()!.duplicate({ lazyConnect: true });
      await this.subscriber.connect();

      this.subscriber.on("message", (channel: string, raw: string) => {
        try {
          const event = JSON.parse(raw) as { type: string; payload: unknown };
          const handlers = this.handlers.get(channel) || [];
          for (const handler of handlers) {
            try { handler(event); } catch { /* skip failed handler */ }
          }
        } catch { /* skip malformed message */ }
      });
    } catch (err) {
      console.error("[RedisPubSub] initSubscriber error:", (err as Error).message);
    }
  }

  async publish(channel: string, event: { type: string; payload: unknown }): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const raw = JSON.stringify(event);
      await this.getClient()!.publish(channel, raw);
    } catch (err) {
      console.error(`[RedisPubSub] publish error (${channel}):`, (err as Error).message);
    }
  }

  async subscribe(channel: string, handler: PubSubHandler): Promise<void> {
    if (!this.subscriber) await this.initSubscriber();
    if (!this.subscriber) return;

    const existing = this.handlers.get(channel) || [];
    if (existing.length === 0) {
      try {
        await this.subscriber.subscribe(channel);
      } catch (err) {
        console.error(`[RedisPubSub] subscribe error (${channel}):`, (err as Error).message);
        return;
      }
    }
    existing.push(handler);
    this.handlers.set(channel, existing);
  }

  async unsubscribe(channel: string, handler?: PubSubHandler): Promise<void> {
    if (!this.subscriber) return;
    if (handler) {
      const existing = this.handlers.get(channel) || [];
      const filtered = existing.filter(h => h !== handler);
      if (filtered.length === 0) {
        this.handlers.delete(channel);
        try { await this.subscriber.unsubscribe(channel); } catch { /* ignore */ }
      } else {
        this.handlers.set(channel, filtered);
      }
    } else {
      this.handlers.delete(channel);
      try { await this.subscriber.unsubscribe(channel); } catch { /* ignore */ }
    }
  }

  async disconnect(): Promise<void> {
    if (this.subscriber) {
      try { await this.subscriber.quit(); } catch { this.subscriber.disconnect(); }
      this.subscriber = null;
    }
    this.handlers.clear();
  }
}
