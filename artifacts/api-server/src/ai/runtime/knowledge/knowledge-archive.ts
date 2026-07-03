// ECP-029.5: Knowledge Archive Manager
// Frozen. Archives knowledge that is unused, obsolete, or low-ranked.
// Archived cards are hidden by default but still searchable.

import type { KnowledgeCard } from "./knowledge-card";
import { confidenceEngine } from "./knowledge-confidence";

class ArchiveManager {
  private _archive: KnowledgeCard[] = [];

  archive(card: KnowledgeCard): void {
    card.status = "ARCHIVED";
    this._archive.push(card);
    if (this._archive.length > 500) this._archive.shift();
  }

  /** Check if card should be archived */
  shouldArchive(card: KnowledgeCard): boolean {
    const daysUnused = (Date.now() - new Date(card.lastUsed).getTime()) / 86400000;

    if (card.confidence < 20) return true;
    if (daysUnused > 90) return true;
    if (card.status === "ARCHIVED") return false;

    return false;
  }

  /** Auto-archive stale cards */
  autoArchive(cards: KnowledgeCard[]): KnowledgeCard[] {
    const archived: KnowledgeCard[] = [];
    for (const card of cards) {
      if (this.shouldArchive(card)) {
        this.archive(card);
        archived.push(card);
      }
    }
    return archived;
  }

  getArchived(): KnowledgeCard[] { return [...this._archive]; }
}

export const archiveManager = new ArchiveManager();
