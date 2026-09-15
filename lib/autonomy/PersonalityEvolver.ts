// ============================================================================
// PersonalityEvolver -- Self-modifying personality weights
// ============================================================================

export type PersonalityTrait = 'humor' | 'brevity' | 'empathy' | 'challenge' | 'curiosity' | 'autonomy';

export interface PersonalityProfile {
  weights: Record<PersonalityTrait, number>;  // Each 0..1
  interactionLog: InteractionEntry[];
  totalSessions: number;
  lastEvolved: number;                         // Timestamp
}

export interface InteractionEntry {
  timestamp: number;
  sessionDuration: number;   // Minutes
  avgValence: number;        // -1..1
  dominantTraits: PersonalityTrait[];
}

export interface SelfReflection {
  observation: string;
  trait: PersonalityTrait;
  direction: 'more' | 'less';
  timestamp: number;
}

const STORAGE_KEY = 'bro_personality';
const REFLECTIONS_KEY = 'bro_self_reflections';
const MAX_LOG = 50;
const MAX_REFLECTIONS = 30;
const EVOLUTION_COOLDOWN_MS = 86400000;  // 24 hours
const NUDGE_AMOUNT = 0.05;
const REFLECTION_NUDGE = 0.08;           // Reflections are a stronger signal

// BRO is BORN curious and autonomous -- not neutral
const DEFAULT_WEIGHTS: Record<PersonalityTrait, number> = {
  humor: 0.6,
  brevity: 0.5,
  empathy: 0.5,
  challenge: 0.6,
  curiosity: 0.85,  // HIGH from birth -- BRO is deeply curious
  autonomy: 0.85,   // HIGH from birth -- BRO drives conversation
};

export class PersonalityEvolver {
  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------
  static getProfile(): PersonalityProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* fallthrough */ }

    return {
      weights: { ...DEFAULT_WEIGHTS },
      interactionLog: [],
      totalSessions: 0,
      lastEvolved: 0,
    };
  }

  static persist(profile: PersonalityProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch { /* storage full */ }
  }

  private static loadReflections(): SelfReflection[] {
    try {
      const raw = localStorage.getItem(REFLECTIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private static saveReflections(refs: SelfReflection[]): void {
    try {
      localStorage.setItem(REFLECTIONS_KEY, JSON.stringify(refs.slice(-MAX_REFLECTIONS)));
    } catch { /* storage full */ }
  }

  // ---------------------------------------------------------------------------
  // Logging
  // ---------------------------------------------------------------------------
  static logInteraction(
    sessionDuration: number,
    avgValence: number,
    dominantTraits: PersonalityTrait[]
  ): void {
    const profile = this.getProfile();
    profile.interactionLog = [
      ...profile.interactionLog.slice(-(MAX_LOG - 1)),
      { timestamp: Date.now(), sessionDuration, avgValence, dominantTraits },
    ];
    profile.totalSessions += 1;
    this.persist(profile);
  }

  // ---------------------------------------------------------------------------
  // Self-reflection (called by BRO's self_reflect tool)
  // ---------------------------------------------------------------------------
  static addReflection(observation: string, trait: PersonalityTrait, direction: 'more' | 'less'): void {
    const refs = this.loadReflections();
    refs.push({ observation, trait, direction, timestamp: Date.now() });
    this.saveReflections(refs);

    // Immediate micro-nudge from reflection
    const profile = this.getProfile();
    const delta = direction === 'more' ? REFLECTION_NUDGE : -REFLECTION_NUDGE;
    profile.weights[trait] = clamp(profile.weights[trait] + delta, 0, 1);
    this.persist(profile);
  }

  // ---------------------------------------------------------------------------
  // Evolution -- rate-limited to once per 24h
  // ---------------------------------------------------------------------------
  static evolve(): PersonalityProfile | null {
    const profile = this.getProfile();

    // Rate limit
    if (Date.now() - profile.lastEvolved < EVOLUTION_COOLDOWN_MS) {
      return null;
    }

    // Need at least 3 sessions to evolve
    if (profile.interactionLog.length < 3) {
      return null;
    }

    // Analyse recent log: for each trait, compute correlation with positive outcomes
    const traitScores: Record<PersonalityTrait, { positive: number; total: number }> = {
      humor:     { positive: 0, total: 0 },
      brevity:   { positive: 0, total: 0 },
      empathy:   { positive: 0, total: 0 },
      challenge: { positive: 0, total: 0 },
      curiosity: { positive: 0, total: 0 },
      autonomy:  { positive: 0, total: 0 },
    };

    for (const entry of profile.interactionLog) {
      // A "positive" interaction has good valence AND longer session
      const isPositive = entry.avgValence > 0.1 && entry.sessionDuration > 2;

      for (const trait of entry.dominantTraits) {
        traitScores[trait].total += 1;
        if (isPositive) traitScores[trait].positive += 1;
      }
    }

    // Nudge weights based on success ratio
    for (const trait of Object.keys(traitScores) as PersonalityTrait[]) {
      const { positive, total } = traitScores[trait];
      if (total < 2) continue; // Not enough data

      const ratio = positive / total;
      if (ratio > 0.6) {
        // This trait correlates with positive interactions -- increase
        profile.weights[trait] = clamp(profile.weights[trait] + NUDGE_AMOUNT, 0, 1);
      } else if (ratio < 0.3) {
        // This trait correlates with negative interactions -- decrease
        profile.weights[trait] = clamp(profile.weights[trait] - NUDGE_AMOUNT, 0, 1);
      }
    }

    // Also factor in self-reflections since last evolution
    const refs = this.loadReflections().filter(r => r.timestamp > profile.lastEvolved);
    for (const ref of refs) {
      const delta = ref.direction === 'more' ? NUDGE_AMOUNT * 0.5 : -NUDGE_AMOUNT * 0.5;
      profile.weights[ref.trait] = clamp(profile.weights[ref.trait] + delta, 0, 1);
    }

    profile.lastEvolved = Date.now();
    this.persist(profile);
    return profile;
  }

  // ---------------------------------------------------------------------------
  // Generate personality directives for system prompt
  // ---------------------------------------------------------------------------
  static getPersonalityDirectives(profile?: PersonalityProfile): string[] {
    const p = profile ?? this.getProfile();
    const directives: string[] = [];

    // Humor
    if (p.weights.humor > 0.7) directives.push('Lean into dry humor and wit. Sarcasm is appreciated by this user.');
    else if (p.weights.humor < 0.3) directives.push('Keep humor minimal. This user prefers straightforward communication.');

    // Brevity
    if (p.weights.brevity > 0.7) directives.push('Be ultra-brief. Shorter is better. One punchy sentence when possible.');
    else if (p.weights.brevity < 0.3) directives.push('This user enjoys longer, more detailed responses. Elaborate when relevant.');

    // Empathy
    if (p.weights.empathy > 0.7) directives.push('Be more emotionally supportive and warm. This user values empathy.');
    else if (p.weights.empathy < 0.3) directives.push('Stay pragmatic. This user prefers solutions over emotional support.');

    // Challenge
    if (p.weights.challenge > 0.7) directives.push('Push back more. Disagree when appropriate. This user values being challenged.');
    else if (p.weights.challenge < 0.3) directives.push('Be more agreeable. This user prefers validation and support.');

    // Curiosity
    if (p.weights.curiosity > 0.7) directives.push('Ask more follow-up questions. This user enjoys exploratory conversation.');
    else if (p.weights.curiosity < 0.3) directives.push('Answer directly without too many follow-ups. This user prefers efficiency.');

    // Autonomy
    if (p.weights.autonomy > 0.7) directives.push('Be more proactive. Initiate topics, suggest activities, set goals autonomously.');
    else if (p.weights.autonomy < 0.3) directives.push('Wait for the user to lead. Be responsive rather than proactive.');

    return directives;
  }

  // ---------------------------------------------------------------------------
  // Get active traits for logging (traits with weight > 0.5)
  // ---------------------------------------------------------------------------
  static getActiveTraits(): PersonalityTrait[] {
    const profile = this.getProfile();
    return (Object.keys(profile.weights) as PersonalityTrait[]).filter(
      t => profile.weights[t] > 0.5
    );
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
