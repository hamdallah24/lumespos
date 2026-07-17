import type { UnderstandingResult } from '../types';

const INTENT_PATTERNS: { regex: RegExp; intent: string; subIntent: string }[] = [
  { regex: /\b(buat|tambah|create|add|new|register|input|insert)\b/i, intent: 'action', subIntent: 'create' },
  { regex: /\b(lihat|show|get|list|display|find|cari|tampilkan)\b/i, intent: 'inquiry', subIntent: 'retrieve' },
  { regex: /\b(hapus|delete|remove|cancel|batalkan)\b/i, intent: 'action', subIntent: 'delete' },
  { regex: /\b(ubah|edit|update|change|modify|perbarui)\b/i, intent: 'action', subIntent: 'update' },
  { regex: /\b(report|laporan|summary|ringkasan|rekap)\b/i, intent: 'report', subIntent: 'generate_report' },
  { regex: /\b(analisis|analyze|analysis|bandingkan|compare|trend)\b/i, intent: 'analysis', subIntent: 'analyze' },
  { regex: /\b(decision|putuskan|approve|setujui|reject|tolak)\b/i, intent: 'decision', subIntent: 'make_decision' },
  { regex: /\b(belajar|learn|how|how to|tutorial|guide|panduan)\b/i, intent: 'learning', subIntent: 'learn' },
];

const DOMAIN_PATTERNS: { regex: RegExp; domain: string }[] = [
  { regex: /\b(sales|jual|penjualan|order|pesanan)\b/i, domain: 'sales' },
  { regex: /\b(inventory|stock|stok|gudang|warehouse|barang)\b/i, domain: 'inventory' },
  { regex: /\b(finance|keuangan|pembayaran|payment|invoice|harga|price|biaya)\b/i, domain: 'finance' },
  { regex: /\b(hr|employee|karyawan|pegawai|gaji|salary|payroll)\b/i, domain: 'hr' },
  { regex: /\b(marketing|promo|diskon|discount|campaign|iklan)\b/i, domain: 'marketing' },
  { regex: /\b(produksi|production|operational|operasi|kitchen|dapur)\b/i, domain: 'operations' },
  { regex: /\b(report|laporan|dashboard|analytics)\b/i, domain: 'executive' },
  { regex: /\b(customer|pelanggan|member|membership)\b/i, domain: 'customer' },
  { regex: /\b(menu|product|produk|recipe|resep)\b/i, domain: 'product' },
  { regex: /\b(strategy|strategi|plan|rencana|target)\b/i, domain: 'strategy' },
  { regex: /\b(legal|contract|kontrak|compliance|patuh)\b/i, domain: 'legal' },
];

export class UnderstandingFallback {
  analyze(message: string): UnderstandingResult {
    const intent = this.classifyIntent(message);
    const domainResult = this.classifyDomain(message);
    const thinkingMode = message.split(/\s+/).length > 20 ? 'balanced' : 'fast';
    const urgency = this.classifyUrgency(message);

    return {
      goal: `Process user request: ${message.slice(0, 100)}`,
      intent: intent.intent,
      subIntent: intent.subIntent,
      domain: {
        primary: domainResult.primary,
        secondary: domainResult.secondary,
      },
      entities: [],
      reasoning: {
        intentRationale: 'Fallback mode — regex-based classification',
        domainRationale: 'Fallback mode — regex-based classification',
        entityRationale: 'Fallback mode — entity extraction disabled',
        alternativesConsidered: [],
      },
      thinkingMode,
      urgency,
      risk: {
        level: urgency === 'high' ? 'medium' : 'low',
        factors: ['Fallback mode — reduced accuracy'],
        requiresApproval: false,
      },
      confidence: 0.35,
      needClarification: false,
    };
  }

  private classifyIntent(message: string): { intent: string; subIntent: string } {
    for (const pattern of INTENT_PATTERNS) {
      if (pattern.regex.test(message)) {
        return { intent: pattern.intent, subIntent: pattern.subIntent };
      }
    }
    return { intent: 'inquiry', subIntent: 'general_inquiry' };
  }

  private classifyDomain(message: string): { primary: string; secondary: string[] } {
    const matched: string[] = [];
    for (const pattern of DOMAIN_PATTERNS) {
      if (pattern.regex.test(message) && !matched.includes(pattern.domain)) {
        matched.push(pattern.domain);
      }
    }
    return {
      primary: matched[0] || 'general',
      secondary: matched.slice(1),
    };
  }

  private classifyUrgency(message: string): 'low' | 'medium' | 'high' {
    if (/\b(urgent|segera|critical|kritis|darurat|emergency|asap)\b/i.test(message)) {
      return 'high';
    }
    if (/\b(today|hari ini|soon|segera|penting|important)\b/i.test(message)) {
      return 'medium';
    }
    return 'low';
  }
}
