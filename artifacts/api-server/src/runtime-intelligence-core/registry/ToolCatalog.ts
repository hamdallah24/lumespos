import type { ToolDescriptor, ToolRequest } from '../types';

const FALLBACK_TOOL_MAP: Record<string, string[]> = {
  sales: ['sales_inquiry', 'sales_report', 'order_management'],
  inventory: ['inventory_check', 'stock_update', 'warehouse_lookup'],
  finance: ['payment_processing', 'invoice_generation', 'financial_report'],
  hr: ['employee_lookup', 'payroll_processing', 'onboarding'],
  marketing: ['campaign_management', 'promotion_management', 'customer_analytics'],
  operations: ['production_tracking', 'quality_check', 'scheduling'],
  executive: ['dashboard_view', 'report_generation', 'analytics'],
  customer: ['customer_lookup', 'membership_management', 'feedback'],
  product: ['menu_management', 'recipe_management', 'pricing'],
  general: ['general_inquiry', 'search', 'help'],
};

export class ToolCatalog {
  private tools: Map<string, ToolDescriptor> = new Map();

  register(tool: ToolDescriptor): void {
    this.tools.set(tool.id, tool);
  }

  registerMany(tools: ToolDescriptor[]): void {
    for (const tool of tools) {
      this.tools.set(tool.id, tool);
    }
  }

  get(id: string): ToolDescriptor | undefined {
    return this.tools.get(id);
  }

  getAll(): ToolDescriptor[] {
    return Array.from(this.tools.values());
  }

  getEnabled(): ToolDescriptor[] {
    return this.getAll().filter(t => t.enabled);
  }

  searchByCapability(capability: string): ToolDescriptor[] {
    return this.getAll().filter(t =>
      t.capabilities.some(c => c.toLowerCase().includes(capability.toLowerCase())),
    );
  }

  searchByDomain(domain: string): ToolDescriptor[] {
    return this.getAll().filter(t =>
      t.capabilities.some(c => {
        const domainTools = FALLBACK_TOOL_MAP[domain] || [];
        return domainTools.some(dt => c.toLowerCase().includes(dt.toLowerCase()));
      }),
    );
  }

  searchByDescription(query: string): ToolDescriptor[] {
    const q = query.toLowerCase();
    return this.getAll().filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.capabilities.some(c => c.toLowerCase().includes(q)),
    );
  }

  getFallbackTools(domain: string): ToolDescriptor[] {
    const fallbackIds = FALLBACK_TOOL_MAP[domain] || FALLBACK_TOOL_MAP['general'];
    const results: ToolDescriptor[] = [];

    for (const id of fallbackIds) {
      const tool = this.tools.get(id);
      if (tool && tool.enabled) {
        results.push(tool);
      }
    }

    if (results.length === 0) {
      results.push({
        id: 'general_inquiry',
        name: 'General Inquiry',
        description: 'Fallback tool for unhandled requests',
        capabilities: ['inquiry', 'search'],
        inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { response: { type: 'string' } } },
        cost: 'low',
        latency: 'low',
        permissions: [],
        enabled: true,
      });
    }

    return results;
  }

  getToolIds(needs: ToolRequest[]): string[] {
    const ids: string[] = [];
    for (const need of needs) {
      const matches = this.searchByCapability(need.capability);
      if (matches.length > 0) {
        ids.push(matches[0].id);
      }
    }
    return ids;
  }

  clear(): void {
    this.tools.clear();
  }

  count(): number {
    return this.tools.size;
  }
}
