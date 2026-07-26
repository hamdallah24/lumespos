import type { ContextBuilder, BuildOptions } from './types';

export class ContextRegistry {
  private builders = new Map<string, ContextBuilder<any, any>>();

  register(builder: ContextBuilder<any, any>): void {
    this.builders.set(builder.domain, builder);
  }

  get<T>(domain: string): ContextBuilder<any, T> | undefined {
    return this.builders.get(domain);
  }

  getAll(): ContextBuilder<any, any>[] {
    return Array.from(this.builders.values());
  }

  getAllDomains(): string[] {
    return Array.from(this.builders.keys());
  }

  async buildAll(rawData: Record<string, any>, options?: BuildOptions): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const tasks: Promise<void>[] = [];

    for (const [domain, builder] of this.builders) {
      const raw = rawData[domain];
      if (!raw) {
        results[domain] = { error: `No raw data for domain ${domain}`, timestamp: Date.now() };
        continue;
      }
      tasks.push(
        builder.build(raw, options)
          .then(ctx => { results[domain] = ctx; })
          .catch(err => {
            results[domain] = { error: `ContextBuilder ${domain} failed: ${err.message}`, timestamp: Date.now() };
          })
      );
    }

    await Promise.all(tasks);
    return results;
  }

  async refreshAll(options?: BuildOptions): Promise<void> {
    await Promise.all(
      this.getAll().map(b => b.refresh(options).catch(() => {}))
    );
  }
}
