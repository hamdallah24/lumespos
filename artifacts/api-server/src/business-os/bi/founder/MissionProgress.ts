interface Objective {
  id: string;
  title: string;
  executive: string;
  progress: number;
  target: string;
  deadline: string;
  status: string;
}

export class MissionProgress {
  objectives: Map<string, Objective> = new Map();

  setObjective(id: string, title: string, executive: string, target: string, deadline: string): void {
    this.objectives.set(id, {
      id,
      title,
      executive,
      progress: 0,
      target,
      deadline,
      status: 'pending',
    });
  }

  updateProgress(id: string, progress: number): void {
    const obj = this.objectives.get(id);
    if (!obj) return;
    const clamped = Math.max(0, Math.min(100, progress));
    obj.progress = clamped;
    obj.status = clamped >= 100 ? 'completed' : clamped >= 80 ? 'on_track' : clamped >= 50 ? 'at_risk' : 'behind';
  }

  getAllObjectives(): Objective[] {
    return Array.from(this.objectives.values());
  }

  getOnTrackObjectives(): Objective[] {
    return this.getAllObjectives().filter((o) => o.progress >= 80);
  }

  getAtRiskObjectives(): Objective[] {
    return this.getAllObjectives().filter((o) => o.progress < 50);
  }

  getOverallProgress(): number {
    const all = this.getAllObjectives();
    if (all.length === 0) return 0;
    return all.reduce((s, o) => s + o.progress, 0) / all.length;
  }
}
