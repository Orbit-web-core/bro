// ============================================================================
// GoalEngine -- Autonomous goal-setting, reminders, and deep memory recall
// ============================================================================

export interface BroGoal {
  id: string;
  text: string;
  createdAt: number;
  dueAt?: number;
  recurring?: 'daily' | 'weekly' | 'none';
  status: 'active' | 'completed' | 'dismissed';
  source: 'bro' | 'user';
}

const STORAGE_KEY = 'bro_goals';
const MAX_GOALS = 100;

export class GoalEngine {
  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------
  private static load(): BroGoal[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static save(goals: BroGoal[]): void {
    try {
      // Keep only the most recent MAX_GOALS
      const trimmed = goals.slice(-MAX_GOALS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Storage full -- silently fail
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------
  static addGoal(partial: Omit<BroGoal, 'id' | 'createdAt' | 'status'>): BroGoal {
    const goal: BroGoal = {
      ...partial,
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      status: 'active',
    };
    const goals = this.load();
    goals.push(goal);
    this.save(goals);
    return goal;
  }

  static getActiveGoals(): BroGoal[] {
    return this.load().filter(g => g.status === 'active');
  }

  static getAllGoals(): BroGoal[] {
    return this.load();
  }

  static getDueGoals(): BroGoal[] {
    const now = Date.now();
    return this.getActiveGoals().filter(g => g.dueAt && g.dueAt <= now);
  }

  static completeGoal(id: string): void {
    const goals = this.load();
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    goal.status = 'completed';

    // If recurring, create the next occurrence
    if (goal.recurring && goal.recurring !== 'none' && goal.dueAt) {
      const interval = goal.recurring === 'daily' ? 86400000 : 604800000;
      this.addGoal({
        text: goal.text,
        dueAt: goal.dueAt + interval,
        recurring: goal.recurring,
        source: goal.source,
      });
    }

    this.save(goals);
  }

  static dismissGoal(id: string): void {
    const goals = this.load();
    const goal = goals.find(g => g.id === id);
    if (goal) {
      goal.status = 'dismissed';
      this.save(goals);
    }
  }

  // ---------------------------------------------------------------------------
  // Context generation for system prompt
  // ---------------------------------------------------------------------------
  static getGoalContext(): string {
    const active = this.getActiveGoals();
    const due = this.getDueGoals();

    if (active.length === 0) return '';

    const lines: string[] = [];

    if (due.length > 0) {
      lines.push('**DUE NOW:**');
      due.forEach(g => {
        lines.push(`  - [${g.id}] "${g.text}" (set by ${g.source}, due ${new Date(g.dueAt!).toLocaleString()})`);
      });
    }

    const upcoming = active.filter(g => !g.dueAt || g.dueAt > Date.now());
    if (upcoming.length > 0) {
      lines.push('**UPCOMING:**');
      upcoming.forEach(g => {
        const dueStr = g.dueAt ? ` -- due ${new Date(g.dueAt).toLocaleString()}` : ' -- no deadline';
        const recurStr = g.recurring && g.recurring !== 'none' ? ` (${g.recurring})` : '';
        lines.push(`  - [${g.id}] "${g.text}"${dueStr}${recurStr}`);
      });
    }

    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Deep memory recall -- scans ALL memories, not just last N
  // ---------------------------------------------------------------------------
  static getDeepMemoryRecall(memories: string[], currentContext: string): string[] {
    if (memories.length === 0) return [];

    // No context? Return ALL memories (up to 30) so BRO has full recall on session start
    if (!currentContext || currentContext === 'UNKNOWN') {
      return memories.slice(-30);
    }

    // Extract keywords from current context (simple tokenisation)
    const contextWords = new Set(
      currentContext
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3) // Skip short words
    );

    // Score each memory by keyword overlap
    const scored = memories.map((memory, index) => {
      const memWords = memory
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3);

      let score = 0;
      memWords.forEach(w => {
        if (contextWords.has(w)) score += 1;
      });

      // Recency bonus -- newer memories get a stronger boost
      score += (index / memories.length) * 1.0;

      return { memory, score };
    });

    // Sort by relevance score
    scored.sort((a, b) => b.score - a.score);

    // Take top relevant memories + always include the most recent 10 (deduped)
    const topRelevant = scored.slice(0, 15).map(s => s.memory);
    const recentMemories = memories.slice(-10);
    const combined = new Set([...topRelevant, ...recentMemories]);
    return Array.from(combined).slice(0, 25);
  }
}
