// ECP-032: Adaptive Compressor — reduces context size on overflow
// Frozen. Summarizes content to fit within budget. Deterministic.

class AdaptiveCompressor {
  /** Compress text to fit within a token budget */
  compress(text: string, maxTokens: number): string {
    const currentTokens = Math.ceil(text.length / 4);
    if (currentTokens <= maxTokens) return text;

    // Strategy 1: Keep first sentence of each paragraph
    const paragraphs = text.split(/\n\n+/);
    const sentences = paragraphs.map(p => p.split(/[.!?]\s+/)[0]);
    let result = sentences.join(". ");

    // Strategy 2: If still too long, truncate to budget
    const resultTokens = Math.ceil(result.length / 4);
    if (resultTokens > maxTokens) {
      result = text.slice(0, maxTokens * 4) + "...";
    }

    return result;
  }

  /** Summarize conversation history to key points */
  summarizeConversation(history: string[], maxTokens: number): string {
    // Keep first + last messages, compress middle
    if (history.length <= 3) return history.join("\n");

    const first = history[0];
    const last = history[history.length - 1];
    const middle = history.slice(1, -1).map(h => h.slice(0, 100)).join(" | ");

    let result = `${first}\n...\n${last}`;
    const resultTokens = Math.ceil(result.length / 4);
    if (resultTokens > maxTokens) {
      result = `${first}\n${last.slice(0, maxTokens * 2)}...`;
    }

    return result;
  }
}

export const adaptiveCompressor = new AdaptiveCompressor();
