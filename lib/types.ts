// ============================================================================
// CORE TYPES
// ============================================================================

export type BroColor = 'indigo' | 'pink' | 'teal' | 'orange' | 'purple' | 'gold' | 'black' | 'green' | 'red' | 'cyan' | 'lime';
export type BroMode = 'chill' | 'homework';
export type BroGender = 'female' | 'male' | 'neutral';
export type BroStatus = 'egg' | 'hatching' | 'alive';
export type BroViewMode = 'full' | 'face';

// Dual-mode agent types
export type BroAgent = 'core' | 'coach' | 'mission_architect';

// ============================================================================
// EMOTION & UI CONTROL TYPES (New v3.0 Architecture)
// ============================================================================

// Emotion tags that BRO uses at the start of responses
export type EmotionTag = 
  | 'happy' 
  | 'neutral' 
  | 'thinking' 
  | 'sad' 
  | 'excited' 
  | 'suspicious' 
  | 'glitch' 
  | 'tired' 
  | 'love';

// Visual modes for the Living UI
export type VisualMode = 'FULL' | 'MINIMIZED' | 'STEALTH' | 'PARTY_MODE';

// LED color options for UI control
export type LedColor = 
  | 'INDIGO' 
  | 'PINK' 
  | 'CYAN' 
  | 'ORANGE' 
  | 'GREEN' 
  | 'RED' 
  | 'DARK_RED' 
  | 'PURPLE' 
  | 'GOLD';

// Hardware state for privacy controls
export interface HardwareState {
  mic: 'ON' | 'OFF';
  camera: 'ON' | 'OFF';
}

// System data stream injected at start of interactions
export interface SystemDataStream {
  time: string;
  hour: number; // 24-hour format, calculated client-side to avoid server timezone issues
  hardware: HardwareState;
  uiState: VisualMode;
  userActivity: string;
  weather?: string;
  location?: string;
}

// UI update payload from BRO's update_ui tool
export interface UIUpdatePayload {
  visual_mode?: VisualMode;
  led_color?: LedColor;
}

// ============================================================================
// APPEARANCE TYPES
// ============================================================================

export type BroHair = 
  | 'none' | 'bunny' | 'propeller' | 'halo' | 'fins'
  | 'bob' | 'fade' | 'quiff' | 'bun' | 'galaxy' | 'spikes';

export type BroAccessory = 
  | 'none' | 'snapback' | 'beanie' | 'headphones' | 'cape' | 'scarf'
  | 'cat-ears' | 'astronaut' | 'witch' | 'detective' | 'chef' | 'horns' | 'visor';

export type BroStyle = 'standard' | 'scholar' | 'dino' | 'skeleton' | 'cyber' | 'stealth' | 'hyper';

// ============================================================================
// SETTINGS & IDENTITY
// ============================================================================

export interface BroSettings {
  gender: BroGender;
  color: BroColor;
  mode: BroMode;
  hair: BroHair;
  accessory: BroAccessory;
  hasGlasses: boolean;
  style: BroStyle;
  viewMode: BroViewMode;
  // New v3.0 settings
  visualMode: VisualMode;
}

export interface FriendBro {
  id: string;
  name: string;
  color: BroColor;
  bondLevel: number;
}

export interface Achievement {
  id: string;
  label: string;
  unlockedAt: number;
}

export interface KnownFace {
  label: string;       // e.g. "Carlos", "Mom", "roommate"
  thumbnail: string;   // base64 JPEG thumbnail (~5KB)
  savedAt: number;     // timestamp
}

export interface BroIdentity {
  id: string;
  name: string;
  birthday: number;
  status: BroStatus;
  level: number;
  xp: number;
  bondLevel: number;
  happiness: number; 
  energy: number;    
  lastInteracted: number;
  friends: FriendBro[];
  unlockedAccessories: BroAccessory[];
  achievements: Achievement[];
  memories: string[];
  knownFaces: KnownFace[];
}

// ============================================================================
// TRANSCRIPTION & MESSAGING
// ============================================================================

export interface TranscriptionItem {
  text: string;
  sender: 'user' | 'bro';
  id: string;
  emotionTag?: EmotionTag;
}

// ============================================================================
// PROACTIVE SYSTEM EVENTS
// ============================================================================

export type SystemEventType = 
  | 'user_inactive'
  | 'session_long'
  | 'late_night'
  | 'task_complete'
  | 'error_detected';

export interface SystemEvent {
  type: SystemEventType;
  payload: Record<string, unknown>;
  timestamp: number;
}

// ============================================================================
// AUTONOMY TYPES (re-exported for convenience)
// ============================================================================

export type { BroGoal } from '../lib/autonomy/GoalEngine';
export type { EmotionalState } from '../lib/autonomy/EmotionStateMachine';
export type { PersonalityProfile, PersonalityTrait } from '../lib/autonomy/PersonalityEvolver';
export type { InnerThought, PersonalDesire, ThoughtCategory, ConsciousnessMetrics } from '../lib/autonomy/InnerLife';
