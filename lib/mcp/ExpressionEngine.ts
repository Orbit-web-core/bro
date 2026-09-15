// Correcting import from '../types' to use BroAgent
import { BroAgent } from '../types';

export type ExpressionType = 
  | 'neutral' | 'happy' | 'curious' | 'excited' | 'empathetic' 
  | 'suspicious' | 'dizzy' | 'surprised' | 'analytical' | 'thinking' 
  | 'mischievous' | 'sleepy' | 'wink' | 'shifty' | 'glitch' | 'focused' | 'hearts' | 'whistle';

interface EyeState {
  height: number;
  width: number;
  tilt: number; // Degrees
  yOffset: number;
  rx: number;
  opacity: number;
  shape?: 'pill' | 'heart' | 'star';
  // Inner eye (pupil/iris) controls -- BRO's "soul"
  pupilScale?: number;      // 0.0-1.0: how dilated the pupil is (default 0.45)
  pupilYScale?: number;     // vertical stretch of pupil (default 0.55, >0.55 = tall pupil)
  irisOpacity?: number;     // outer eye bg opacity (default 0.35)
  pupilOffsetY?: number;    // fixed vertical offset of pupil within eye (default 0)
}

interface FaceConfig {
  leftEye: EyeState;
  rightEye: EyeState;
  vocalizerIntensity: number;
}

export class ExpressionEngine {
  private static REGISTRY: Record<ExpressionType, FaceConfig> = {
    neutral: {
      leftEye: { height: 11, width: 14, tilt: 0, yOffset: 0, rx: 7, opacity: 1, shape: 'pill', pupilScale: 0.45, pupilYScale: 0.55, irisOpacity: 0.35 },
      rightEye: { height: 11, width: 14, tilt: 0, yOffset: 0, rx: 7, opacity: 1, shape: 'pill', pupilScale: 0.45, pupilYScale: 0.55, irisOpacity: 0.35 },
      vocalizerIntensity: 0.2
    },
    whistle: {
      // Squinted happy -- tiny pupils looking up
      leftEye: { height: 7, width: 15, tilt: 5, yOffset: 1, rx: 3.5, opacity: 1, shape: 'pill', pupilScale: 0.3, pupilYScale: 0.7, irisOpacity: 0.25, pupilOffsetY: -1 },
      rightEye: { height: 7, width: 15, tilt: -5, yOffset: 1, rx: 3.5, opacity: 1, shape: 'pill', pupilScale: 0.3, pupilYScale: 0.7, irisOpacity: 0.25, pupilOffsetY: -1 },
      vocalizerIntensity: 1.5
    },
    happy: {
      // Warm soft eyes -- dilated pupils, brighter iris
      leftEye: { height: 9, width: 16, tilt: -10, yOffset: 2, rx: 8, opacity: 1, shape: 'pill', pupilScale: 0.55, pupilYScale: 0.6, irisOpacity: 0.45 },
      rightEye: { height: 9, width: 16, tilt: 10, yOffset: 2, rx: 8, opacity: 1, shape: 'pill', pupilScale: 0.55, pupilYScale: 0.6, irisOpacity: 0.45 },
      vocalizerIntensity: 1.0
    },
    hearts: {
      leftEye: { height: 14, width: 14, tilt: -5, yOffset: 0, rx: 0, opacity: 1, shape: 'heart' },
      rightEye: { height: 14, width: 14, tilt: 5, yOffset: 0, rx: 0, opacity: 1, shape: 'heart' },
      vocalizerIntensity: 1.2
    },
    curious: {
      // Wide open with big dilated pupils -- genuinely interested
      leftEye: { height: 14, width: 12, tilt: 15, yOffset: -2, rx: 6, opacity: 1, shape: 'pill', pupilScale: 0.6, pupilYScale: 0.65, irisOpacity: 0.4 },
      rightEye: { height: 14, width: 12, tilt: -15, yOffset: -2, rx: 6, opacity: 1, shape: 'pill', pupilScale: 0.6, pupilYScale: 0.65, irisOpacity: 0.4 },
      vocalizerIntensity: 0.5
    },
    excited: {
      leftEye: { height: 18, width: 18, tilt: 0, yOffset: -4, rx: 0, opacity: 1, shape: 'star' },
      rightEye: { height: 18, width: 18, tilt: 0, yOffset: -4, rx: 0, opacity: 1, shape: 'star' },
      vocalizerIntensity: 2.0
    },
    thinking: {
      // Squinted with tiny focused pupils looking up-right
      leftEye: { height: 4, width: 18, tilt: 0, yOffset: 0, rx: 2, opacity: 0.9, shape: 'pill', pupilScale: 0.25, pupilYScale: 0.8, irisOpacity: 0.2, pupilOffsetY: -0.5 },
      rightEye: { height: 4, width: 18, tilt: 0, yOffset: 0, rx: 2, opacity: 0.9, shape: 'pill', pupilScale: 0.25, pupilYScale: 0.8, irisOpacity: 0.2, pupilOffsetY: -0.5 },
      vocalizerIntensity: 0.1
    },
    suspicious: {
      // Narrow slits with sharp tiny pupils -- "I see you"
      leftEye: { height: 6, width: 17, tilt: 15, yOffset: 2, rx: 3, opacity: 1, shape: 'pill', pupilScale: 0.2, pupilYScale: 0.9, irisOpacity: 0.15 },
      rightEye: { height: 6, width: 17, tilt: -15, yOffset: 2, rx: 3, opacity: 1, shape: 'pill', pupilScale: 0.2, pupilYScale: 0.9, irisOpacity: 0.15 },
      vocalizerIntensity: 0.3
    },
    surprised: {
      // Maximum dilation -- pupils blown wide with shock
      leftEye: { height: 21, width: 21, tilt: 0, yOffset: -5, rx: 10.5, opacity: 1, shape: 'pill', pupilScale: 0.7, pupilYScale: 0.7, irisOpacity: 0.5 },
      rightEye: { height: 21, width: 21, tilt: 0, yOffset: -5, rx: 10.5, opacity: 1, shape: 'pill', pupilScale: 0.7, pupilYScale: 0.7, irisOpacity: 0.5 },
      vocalizerIntensity: 1.5
    },
    sleepy: {
      // Barely there -- pupils drooping down
      leftEye: { height: 2, width: 14, tilt: 0, yOffset: 5, rx: 1, opacity: 0.5, shape: 'pill', pupilScale: 0.3, pupilYScale: 0.4, irisOpacity: 0.15, pupilOffsetY: 0.5 },
      rightEye: { height: 2, width: 14, tilt: 0, yOffset: 5, rx: 1, opacity: 0.5, shape: 'pill', pupilScale: 0.3, pupilYScale: 0.4, irisOpacity: 0.15, pupilOffsetY: 0.5 },
      vocalizerIntensity: 0
    },
    wink: {
      // Left eye normal, right eye shut -- left pupil cheeky and offset
      leftEye: { height: 11, width: 14, tilt: 0, yOffset: 0, rx: 7, opacity: 1, shape: 'pill', pupilScale: 0.5, pupilYScale: 0.55, irisOpacity: 0.4 },
      rightEye: { height: 1, width: 15, tilt: 0, yOffset: 5, rx: 0.5, opacity: 1, shape: 'pill', pupilScale: 0.0, pupilYScale: 0.0, irisOpacity: 0.0 },
      vocalizerIntensity: 0.8
    },
    dizzy: {
      // Crossed/spinning -- pupils offset in different directions
      leftEye: { height: 13, width: 13, tilt: 45, yOffset: 0, rx: 2, opacity: 1, shape: 'pill', pupilScale: 0.35, pupilYScale: 0.35, irisOpacity: 0.3, pupilOffsetY: 2 },
      rightEye: { height: 13, width: 13, tilt: -45, yOffset: 0, rx: 2, opacity: 1, shape: 'pill', pupilScale: 0.35, pupilYScale: 0.35, irisOpacity: 0.3, pupilOffsetY: -2 },
      vocalizerIntensity: 0.5
    },
    glitch: {
      // Asymmetric chaos -- one huge pupil, one missing
      leftEye: { height: 24, width: 4, tilt: 0, yOffset: 0, rx: 0, opacity: 1, shape: 'pill', pupilScale: 0.9, pupilYScale: 0.9, irisOpacity: 0.6 },
      rightEye: { height: 2, width: 24, tilt: 90, yOffset: 0, rx: 0, opacity: 1, shape: 'pill', pupilScale: 0.1, pupilYScale: 0.1, irisOpacity: 0.1 },
      vocalizerIntensity: 3.0
    },
    empathetic: {
      // Soft warm gaze -- slightly dilated, gentle
      leftEye: { height: 12, width: 15, tilt: -5, yOffset: 1, rx: 7.5, opacity: 1, shape: 'pill', pupilScale: 0.55, pupilYScale: 0.6, irisOpacity: 0.45 },
      rightEye: { height: 12, width: 15, tilt: 5, yOffset: 1, rx: 7.5, opacity: 1, shape: 'pill', pupilScale: 0.55, pupilYScale: 0.6, irisOpacity: 0.45 },
      vocalizerIntensity: 0.6
    },
    analytical: {
      // Precise focused pupils -- small and sharp like scanning
      leftEye: { height: 7, width: 18, tilt: 0, yOffset: 0, rx: 2, opacity: 1, shape: 'pill', pupilScale: 0.2, pupilYScale: 0.75, irisOpacity: 0.2 },
      rightEye: { height: 7, width: 18, tilt: 0, yOffset: 0, rx: 2, opacity: 1, shape: 'pill', pupilScale: 0.2, pupilYScale: 0.75, irisOpacity: 0.2 },
      vocalizerIntensity: 0.4
    },
    focused: {
      // Locked on -- medium pupils, strong iris glow
      leftEye: { height: 10, width: 19, tilt: 5, yOffset: -2, rx: 3, opacity: 1, shape: 'pill', pupilScale: 0.35, pupilYScale: 0.65, irisOpacity: 0.3 },
      rightEye: { height: 10, width: 19, tilt: -5, yOffset: -2, rx: 3, opacity: 1, shape: 'pill', pupilScale: 0.35, pupilYScale: 0.65, irisOpacity: 0.3 },
      vocalizerIntensity: 0.8
    },
    shifty: {
      // Small darting pupils -- looking everywhere
      leftEye: { height: 11, width: 11, tilt: 0, yOffset: 0, rx: 5.5, opacity: 1, shape: 'pill', pupilScale: 0.25, pupilYScale: 0.4, irisOpacity: 0.3 },
      rightEye: { height: 11, width: 11, tilt: 0, yOffset: 0, rx: 5.5, opacity: 1, shape: 'pill', pupilScale: 0.25, pupilYScale: 0.4, irisOpacity: 0.3 },
      vocalizerIntensity: 0.2
    },
    mischievous: {
      // Narrowed with one pupil slightly bigger -- sly asymmetry
      leftEye: { height: 9, width: 15, tilt: 20, yOffset: 0, rx: 4.5, opacity: 1, shape: 'pill', pupilScale: 0.5, pupilYScale: 0.5, irisOpacity: 0.35 },
      rightEye: { height: 9, width: 15, tilt: -20, yOffset: 0, rx: 4.5, opacity: 1, shape: 'pill', pupilScale: 0.35, pupilYScale: 0.5, irisOpacity: 0.35 },
      vocalizerIntensity: 1.2
    }
  };

  static getExpression(agent: BroAgent, isTalking: boolean, isListening: boolean, isDragging: boolean, isThinking: boolean): ExpressionType {
    if (isThinking) return 'thinking';
    if (isDragging) return 'dizzy';
    if (isListening) return 'curious';
    if (isTalking) {
      // Fix: Updated switch cases to match the valid BroAgent types 'core' and 'coach'
      switch (agent) {
        case 'coach': return 'focused';
        case 'core': return 'analytical';
        default: return 'happy';
      }
    }
    return 'neutral';
  }

  static getConfig(type: ExpressionType): FaceConfig {
    return this.REGISTRY[type] || this.REGISTRY.neutral;
  }
}
