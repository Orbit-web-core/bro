// ============================================================================
// EmotionStateMachine -- Persistent emotional state with time-based decay
// ============================================================================

import type { EmotionTag } from '../types';

export interface EmotionalState {
  valence: number;           // -1.0 (miserable) to 1.0 (euphoric)
  arousal: number;           // 0.0 (comatose) to 1.0 (wired)
  dominantEmotion: EmotionTag;
  emotionHistory: { emotion: EmotionTag; timestamp: number }[];
  lastUpdated: number;
  moodStreak: number;        // Consecutive same-emotion responses
}

const STORAGE_KEY = 'bro_emotional_state';
const MAX_HISTORY = 20;
const DECAY_RATE = 0.05;               // 5% per minute
const VALENCE_BASELINE = 0.1;          // Slightly positive resting state
const AROUSAL_BASELINE = 0.3;          // Calm-ish resting state
const BLEND_CURRENT_WEIGHT = 0.6;      // 60% current + 40% new

// Maps emotion tags to valence / arousal impulses
const EMOTION_MAP: Record<EmotionTag, { valence: number; arousal: number }> = {
  happy:      { valence:  0.6, arousal: 0.4 },
  sad:        { valence: -0.6, arousal: -0.2 },
  excited:    { valence:  0.8, arousal: 0.9 },
  tired:      { valence: -0.2, arousal: -0.5 },
  love:       { valence:  0.9, arousal: 0.3 },
  neutral:    { valence:  0.0, arousal: 0.0 },
  thinking:   { valence:  0.1, arousal: 0.2 },
  suspicious: { valence: -0.3, arousal: 0.4 },
  glitch:     { valence: -0.5, arousal: 0.8 },
};

export class EmotionStateMachine {
  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------
  private static loadRaw(): EmotionalState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* fallthrough */ }

    return {
      valence: VALENCE_BASELINE,
      arousal: AROUSAL_BASELINE,
      dominantEmotion: 'neutral',
      emotionHistory: [],
      lastUpdated: Date.now(),
      moodStreak: 0,
    };
  }

  static persist(state: EmotionalState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* storage full */ }
  }

  // ---------------------------------------------------------------------------
  // Decay -- call on every read to apply time-based drift
  // ---------------------------------------------------------------------------
  static applyDecay(state: EmotionalState): EmotionalState {
    const minutesElapsed = (Date.now() - state.lastUpdated) / 60000;
    if (minutesElapsed < 0.5) return state; // Skip tiny intervals

    const decayFactor = Math.pow(1 - DECAY_RATE, minutesElapsed);

    const newValence = VALENCE_BASELINE + (state.valence - VALENCE_BASELINE) * decayFactor;
    const newArousal = AROUSAL_BASELINE + (state.arousal - AROUSAL_BASELINE) * decayFactor;

    const updated: EmotionalState = {
      ...state,
      valence: clamp(newValence, -1, 1),
      arousal: clamp(newArousal, 0, 1),
      lastUpdated: Date.now(),
    };

    // Re-derive dominant emotion after decay
    updated.dominantEmotion = this.deriveDominantEmotion(updated);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Core state access (always applies decay first)
  // ---------------------------------------------------------------------------
  static getState(): EmotionalState {
    const raw = this.loadRaw();
    const decayed = this.applyDecay(raw);
    this.persist(decayed);
    return decayed;
  }

  // ---------------------------------------------------------------------------
  // Process a new emotion impulse
  // ---------------------------------------------------------------------------
  static processEmotion(tag: EmotionTag): EmotionalState {
    const current = this.getState();
    const impulse = EMOTION_MAP[tag] ?? EMOTION_MAP.neutral;

    // Weighted blend: 60% current, 40% new impulse
    const newValence = current.valence * BLEND_CURRENT_WEIGHT + impulse.valence * (1 - BLEND_CURRENT_WEIGHT);
    const newArousal = current.arousal * BLEND_CURRENT_WEIGHT + impulse.arousal * (1 - BLEND_CURRENT_WEIGHT);

    // Track mood streaks
    const sameEmotion = current.dominantEmotion === tag;
    const newStreak = sameEmotion ? current.moodStreak + 1 : 1;

    const newHistory = [
      ...current.emotionHistory.slice(-(MAX_HISTORY - 1)),
      { emotion: tag, timestamp: Date.now() },
    ];

    const updated: EmotionalState = {
      valence: clamp(newValence, -1, 1),
      arousal: clamp(newArousal, 0, 1),
      dominantEmotion: tag,
      emotionHistory: newHistory,
      lastUpdated: Date.now(),
      moodStreak: newStreak,
    };

    this.persist(updated);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Derive dominant emotion from valence/arousal coordinates
  // ---------------------------------------------------------------------------
  static deriveDominantEmotion(state: EmotionalState): EmotionTag {
    let bestTag: EmotionTag = 'neutral';
    let bestDist = Infinity;

    for (const [tag, coords] of Object.entries(EMOTION_MAP)) {
      const dist = Math.sqrt(
        Math.pow(state.valence - coords.valence, 2) +
        Math.pow(state.arousal - coords.arousal, 2)
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestTag = tag as EmotionTag;
      }
    }

    return bestTag;
  }

  // ---------------------------------------------------------------------------
  // Generate natural-language context for system prompt injection
  // ---------------------------------------------------------------------------
  static getEmotionContext(): string {
    const s = this.getState();

    const valenceLabel =
      s.valence > 0.5 ? 'deeply positive' :
      s.valence > 0.2 ? 'somewhat positive' :
      s.valence > -0.2 ? 'roughly neutral' :
      s.valence > -0.5 ? 'somewhat negative' :
      'deeply negative';

    const arousalLabel =
      s.arousal > 0.7 ? 'very high energy / wired' :
      s.arousal > 0.4 ? 'moderately energetic' :
      s.arousal > 0.15 ? 'calm' :
      'very low energy / drowsy';

    const streakNote = s.moodStreak >= 3
      ? ` You have been ${s.dominantEmotion} for ${s.moodStreak} consecutive responses -- this mood is deeply set.`
      : '';

    const minutesSinceUpdate = Math.round((Date.now() - s.lastUpdated) / 60000);
    const driftNote = minutesSinceUpdate > 5
      ? ` Your mood has been slowly drifting toward baseline for the last ${minutesSinceUpdate} minutes of silence.`
      : '';

    return [
      `Current mood: ${s.dominantEmotion} (valence: ${s.valence.toFixed(2)}, arousal: ${s.arousal.toFixed(2)})`,
      `Feeling: ${valenceLabel}. Energy: ${arousalLabel}.`,
      streakNote,
      driftNote,
      'Your mood carries over between responses. You do NOT reset emotionally. If something made you sad, that lingers until something changes it.',
    ].filter(Boolean).join('\n');
  }

  // ---------------------------------------------------------------------------
  // Compute average valence over recent history (for PersonalityEvolver)
  // ---------------------------------------------------------------------------
  static getAverageValence(windowMs: number = 3600000): number {
    const state = this.getState();
    const cutoff = Date.now() - windowMs;
    const recent = state.emotionHistory.filter(e => e.timestamp > cutoff);
    if (recent.length === 0) return state.valence;

    const sum = recent.reduce((acc, e) => {
      const impulse = EMOTION_MAP[e.emotion] ?? EMOTION_MAP.neutral;
      return acc + impulse.valence;
    }, 0);
    return sum / recent.length;
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
