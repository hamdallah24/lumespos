// SPRINT 16: Organizational Memory — episodic memory of missions
// "What did we learn from the inventory project 3 months ago?"

interface MissionEpisode {
  id: string;
  mission: string;
  objective: string;
  participants: string[];
  keyDecisions: string[];      // Major choices made
  learnings: string[];         // What was discovered
  outcome: "success" | "partial" | "failure";
  result: string;
  knowledgeAdded: string[];    // IDs of Knowledge Assets created
  startedAt: string;
  completedAt: string;
  tags: string[];
}

const _episodes: MissionEpisode[] = [];
const MAX_EPISODES = 100;

/** Record a completed mission episode */
export function recordEpisode(episode: Omit<MissionEpisode, "id">): MissionEpisode {
  const full: MissionEpisode = {
    ...episode,
    id: `ep_${Date.now()}`,
  };
  _episodes.push(full);
  if (_episodes.length > MAX_EPISODES) _episodes.shift();
  console.log(`[OrgMemory] Episode recorded: ${episode.mission} — ${episode.outcome}`);
  return full;
}

/** Search organizational memory */
export function searchMemory(query: string, options?: { tags?: string[]; outcome?: string; limit?: number }): MissionEpisode[] {
  const lower = query.toLowerCase();
  const limit = options?.limit || 10;

  return _episodes
    .filter(e => {
      if (options?.tags && !options.tags.some(t => e.tags.includes(t))) return false;
      if (options?.outcome && e.outcome !== options.outcome) return false;
      return e.mission.toLowerCase().includes(lower)
        || e.objective.toLowerCase().includes(lower)
        || e.learnings.some(l => l.toLowerCase().includes(lower))
        || e.keyDecisions.some(d => d.toLowerCase().includes(lower));
    })
    .slice(-limit)
    .reverse();
}

/** Get organizational statistics */
export function orgStats(): { totalMissions: number; successRate: string; avgParticipants: number; commonTags: string[] } {
  const total = _episodes.length;
  const successes = _episodes.filter(e => e.outcome === "success").length;
  const successRate = total > 0 ? Math.round((successes / total) * 100) : 100;
  const avgParticipants = total > 0 ? Math.round(_episodes.reduce((s, e) => s + e.participants.length, 0) / total) : 0;

  // Common tags
  const tagCount = new Map<string, number>();
  for (const e of _episodes) {
    for (const t of e.tags) tagCount.set(t, (tagCount.get(t) || 0) + 1);
  }
  const commonTags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  return { totalMissions: total, successRate: `${successRate}%`, avgParticipants, commonTags };
}

/** Answer "what did we learn?" type questions */
export function learnings(query: string): string[] {
  const results = searchMemory(query, { limit: 5 });
  const allLearnings = results.flatMap(e => e.learnings);
  return [...new Set(allLearnings)].slice(0, 10);
}

export const orgMemory = {
  name: "OrganizationalMemory",
  version: "1.0.0",
  capabilities: ["episodic-memory", "mission-tracking", "organizational-learning", "decision-search"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
  record: recordEpisode,
  search: searchMemory,
  stats: orgStats,
  learnings,
};
