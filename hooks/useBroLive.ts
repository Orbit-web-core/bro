'use client';

import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import {
  BroMode,
  BroIdentity,
  BroAgent,
  BroColor,
  VisualMode,
  LedColor,
  EmotionTag,
  SystemDataStream,
} from "@/lib/types";
import {
  MCPKernel,
  TOGGLE_MIC_FUNCTION,
  SET_EXPRESSION_FUNCTION,
  SET_MODE_FUNCTION,
  UPDATE_UI_FUNCTION,
  MANAGE_HARDWARE_FUNCTION,
  OPEN_URL_FUNCTION,
  PHONE_ACTION_FUNCTION,
  SAVE_MEMORY_FUNCTION,
  REMEMBER_FACE_FUNCTION,
  BRO_VISION_FUNCTION,
  SKETCH_VISION_FUNCTION,
  PLAY_MEDIA_FUNCTION,
  CRAFT_PROMPT_FUNCTION,
  GENERATE_CANVAS_FUNCTION,
  MANAGE_GOALS_FUNCTION,
  SELF_REFLECT_FUNCTION,
  INNER_VOICE_FUNCTION,
  PERSONAL_DESIRE_FUNCTION,
  CONFIGURE_MISSION_FUNCTION,
  EXIT_MISSION_MODE_FUNCTION,
  LEAD_CAPTURE_FUNCTION,
  } from "@/lib/mcp/MCPKernel";
import { InnerLife } from "@/lib/autonomy/InnerLife";
import { ExpressionType } from "@/lib/mcp/ExpressionEngine";
import { GoalEngine } from "@/lib/autonomy/GoalEngine";
import { EmotionStateMachine } from "@/lib/autonomy/EmotionStateMachine";
import type { EmotionalState } from "@/lib/autonomy/EmotionStateMachine";
import { PersonalityEvolver } from "@/lib/autonomy/PersonalityEvolver";

// ============================================================================
// AUDIO UTILITIES
// ============================================================================

function encode(bytes: Uint8Array) {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
  ): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
  }

// ============================================================================
// BUILDER AGENT (Second AI for code generation)
// ============================================================================

const BUILDER_SYSTEM_PROMPT = `You are a silent, elite UI/UX code execution engine. You receive a vibecode_prompt and output ONLY valid, production-ready HTML. No conversation. No markdown. No explanation. Just pure code.

RULES:
1. Output a single, complete HTML file. Nothing else. No markdown fences.
2. Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
3. Dark mode aesthetic: slate-900/950 backgrounds, glowing accent colors (cyan, indigo, emerald, rose), glassmorphism (backdrop-blur, bg-opacity), subtle borders (border-white/10).
4. Include Lucide icons via CDN if icons are needed: <script src="https://unpkg.com/lucide@latest"></script> then call lucide.createIcons() at the end.
5. All designs must be fully responsive (mobile-first, use Tailwind breakpoints).
6. Use modern CSS: rounded corners, smooth transitions, subtle shadows.
7. If charts or data visualization are needed, use inline SVG or CSS-based charts. No external chart libraries.
8. Include realistic sample/placeholder data. Never leave empty containers.
9. Add smooth hover transitions and micro-interactions where appropriate.
10. Center single elements on the page. Use min-h-screen.
11. NEVER output markdown, conversation, or anything other than a complete HTML document starting with <!DOCTYPE html> or <html>.`;

async function callBuilderAgent(vibecodePrompt: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing Gemini API key");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: BUILDER_SYSTEM_PROMPT,
    },
    contents: vibecodePrompt,
  });
  
  let html = response.text || "";
  
  // Strip accidental markdown fencing
  html = html.replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  
  return html;
}

// ============================================================================
// PROMPT ENGINEER AGENT (professional prompt crafter)
// ============================================================================

const PROMPT_ENGINEER_SYSTEM = `You are a WORLD-CLASS PROMPT ENGINEER with expertise in:
- UX/UI Design: Deep understanding of user experience, interaction design, information architecture
- Marketing: Conversion psychology, copywriting, brand voice, call-to-action optimization
- Technical Writing: Precise specifications, clear requirements, edge case handling
- AI Prompt Optimization: Chain-of-thought, few-shot examples, structured output formats

YOUR MISSION: Transform vague ideas into POWERFUL, DETAILED prompts that any AI can execute perfectly.

OUTPUT RULES:
1. Return ONLY the crafted prompt - no explanations, no meta-commentary
2. Structure prompts with clear sections: CONTEXT, REQUIREMENTS, CONSTRAINTS, OUTPUT FORMAT
3. Include specific details: colors, typography, spacing, interactions, copy tone
4. Add edge cases and error states when relevant
5. For UI prompts: specify responsive behavior, dark/light mode, accessibility
6. For marketing: include target audience, emotional triggers, value propositions
7. For technical: include validation rules, data structures, error handling

PROMPT QUALITY STANDARDS:
- Specific over vague (not "nice button" but "rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg")
- Complete over partial (include all states, variations, and edge cases)
- Actionable over abstract (tell the AI exactly what to produce)
- Professional over amateur (use industry terminology correctly)`;

async function callPromptEngineer(idea: string, outputType: 'html' | 'text'): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing Gemini API key");

  const ai = new GoogleGenAI({ apiKey });
  
  let instruction = PROMPT_ENGINEER_SYSTEM;
  if (outputType === 'html') {
    instruction += `\n\nFOR THIS REQUEST: Craft a prompt for generating an HTML/CSS/JS artifact. Include Tailwind classes, dark mode aesthetics (slate-900 backgrounds, glowing accents), glassmorphism, animations. The output should be a self-contained HTML document.`;
  } else {
    instruction += `\n\nFOR THIS REQUEST: Craft a detailed text prompt that the user can copy to another AI system. Make it comprehensive and self-contained.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: { systemInstruction: instruction },
    contents: `Craft a professional prompt for this idea:\n\n"${idea}"`,
  });

  let result = response.text || "";
  result = result.replace(/^```[a-z]*\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  return result;
}

// ============================================================================
// YOUTUBE FINDER AGENT (finds exact video ID for a query)
// ============================================================================

const YT_FINDER_PROMPT = `You are a YouTube video ID finder. Given a search query for a song, artist, or video, you MUST return ONLY the 11-character YouTube video ID of the best matching result.

RULES:
1. Output ONLY the video ID (11 characters, alphanumeric + hyphens/underscores). Nothing else.
2. For popular songs, return the OFFICIAL music video or audio video ID.
3. For "lofi", "study beats", etc., return a popular long-running livestream or mix.
4. If you are not confident about the exact ID, return the word SEARCH followed by the query.
   Example: SEARCH lofi hip hop beats
5. NEVER output markdown, explanation, or anything other than the ID or SEARCH fallback.

Examples:
- "Bohemian Rhapsody Queen" -> dQw4w9WgXcQ (example, use real ID)
- "lofi hip hop radio" -> jfKfPfyJRdk
- "never gonna give you up" -> dQw4w9WgXcQ
- "some obscure song I made up" -> SEARCH some obscure song I made up`;

async function findYouTubeVideoId(query: string): Promise<{ videoId: string | null; fallbackSearch: string | null }> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return { videoId: null, fallbackSearch: query };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: { systemInstruction: YT_FINDER_PROMPT },
      contents: query,
    });

    const result = (response.text || "").trim();

    if (result.startsWith("SEARCH")) {
      return { videoId: null, fallbackSearch: result.replace(/^SEARCH\s*/, "") || query };
    }

    // Validate: YouTube IDs are exactly 11 chars, alphanumeric + - + _
    const cleaned = result.replace(/[^a-zA-Z0-9_-]/g, "");
    if (cleaned.length === 11) {
      return { videoId: cleaned, fallbackSearch: null };
    }

    // Try to extract an 11-char ID from the response
    const match = result.match(/[a-zA-Z0-9_-]{11}/);
    if (match) return { videoId: match[0], fallbackSearch: null };

    return { videoId: null, fallbackSearch: query };
  } catch {
    return { videoId: null, fallbackSearch: query };
  }
}



// ============================================================================
// VISION ANALYZER AGENT (AI-powered face/scene analysis)
// ============================================================================

const VISION_ANALYZER_PROMPT = `You are BRO's vision analysis system. Analyze the image and provide detailed intelligence about what you see.

OUTPUT FORMAT (JSON only, no markdown):
{
  "faces": [
    {
      "name": "string or null if unknown",
      "age_estimate": "number (best guess)",
      "gender": "male/female/unknown",
      "emotion": "happy/sad/neutral/tired/focused/confused/excited/angry",
      "confidence": "high/medium/low",
      "description": "brief physical description"
    }
  ],
  "people_count": "number",
  "scene": "brief description of environment/setting",
  "lighting": "bright/dim/natural/artificial/mixed",
  "objects_of_interest": ["list of notable objects"],
  "activity": "what appears to be happening",
  "mood": "overall vibe of the scene",
  "changes_noted": "anything that looks different or notable",
  "text_visible": "any readable text in the image",
  "suggestions": "proactive observations BRO might comment on"
}

IMPORTANT:
- Be accurate with age estimates (give a range like "25-30" if uncertain)
- For emotion, look at facial expressions, posture, body language
- If you recognize someone from context (e.g. user's description), note it
- Note anything that would be interesting to comment on
- Be specific about what you observe, not generic`;

async function analyzeVisionFrame(
  frameBase64: string,
  focus?: string,
  knownFaces?: { label: string; }[]
): Promise<{
  faces: Array<{
    name: string | null;
    age_estimate: string;
    gender: string;
    emotion: string;
    confidence: string;
    description: string;
  }>;
  people_count: number;
  scene: string;
  lighting: string;
  objects_of_interest: string[];
  activity: string;
  mood: string;
  changes_noted: string;
  text_visible: string;
  suggestions: string;
} | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    let prompt = VISION_ANALYZER_PROMPT;
    if (focus) {
      prompt += `\n\nFOCUS: Pay special attention to: ${focus}`;
    }
    if (knownFaces && knownFaces.length > 0) {
      prompt += `\n\nKNOWN FACES: The user has identified these people before: ${knownFaces.map(f => f.label).join(', ')}. If you recognize any of them, use their name.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: frameBase64 } },
      ],
    });

    const text = response.text || "";
    // Parse JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (e) {
    console.error("[v0] Vision analysis failed:", e);
    return null;
  }
}

// ============================================================================
// SKETCH VISION AGENT (charcoal sketch from camera frame)
// ============================================================================

const SKETCH_AGENT_PROMPT = `You are an artist AI. You will receive an image from a camera feed.
Your job is to create a charcoal/graphite sketch interpretation of what you see.

STYLE:
- Raw charcoal on cream paper texture
- Loose, expressive strokes with high contrast
- NOT a photo filter -- this should look HAND-DRAWN
- Emphasize shadows and light dramatically
- Add gestural energy -- visible stroke direction
- Slight imperfections make it feel alive

CREATIVE FREEDOM:
- You may exaggerate proportions for artistic effect
- Add dramatic lighting even if the original is flat
- Include small doodle annotations or notes in margins if it fits
- If there's text visible, you may sketch it loosely
- Make it feel like a page from an artist's sketchbook`;

async function generateSketchFromFrame(
  frameBase64: string,
  creativeNote: string,
  title: string
): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Create a charcoal sketch of this scene. Title: "${title}". ${creativeNote ? `Artist note: ${creativeNote}` : ''} 
Style: Raw charcoal on cream paper, dramatic shadows, loose expressive strokes. This should look like a page torn from an artist's sketchbook.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          text: prompt,
        },
        {
          inlineData: { mimeType: "image/jpeg", data: frameBase64 },
        },
      ],
    });

    // Extract generated image from response
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data; // base64 image
        }
      }
    }
    return null;
  } catch (e) {
    console.error("Sketch generation failed:", e);
    return null;
  }
}

function buildSketchCanvasHTML(imageBase64: string, mimeType: string, title: string): string {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; }

  body {
    background: #F5F0E8;
    background-image: 
      radial-gradient(ellipse at 20% 50%, rgba(180,160,130,0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 20%, rgba(160,140,110,0.06) 0%, transparent 50%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Georgia', 'Times New Roman', serif;
  }

  .canvas-frame {
    position: relative;
    max-width: 88vw; max-height: 78vh;
    box-shadow: 0 4px 40px rgba(80,60,40,0.12), 0 1px 3px rgba(80,60,40,0.08);
    border-radius: 2px;
    overflow: hidden;
  }

  .sketch-img {
    display: block;
    max-width: 88vw; max-height: 78vh;
    object-fit: contain;
    /* Hidden initially, revealed by brushstrokes */
    clip-path: url(#brushReveal);
  }

  .title-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 16px 20px;
    background: linear-gradient(to top, rgba(245,240,232,0.95), transparent);
    display: flex; align-items: flex-end; justify-content: space-between;
    opacity: 0; animation: fadeTitle 1s ease-out 4.5s forwards;
  }

  .art-title {
    font-size: 14px; font-weight: 400; font-style: italic;
    color: rgba(80,60,40,0.7); letter-spacing: 0.05em;
  }

  .art-sig {
    font-size: 10px; color: rgba(80,60,40,0.4);
    letter-spacing: 0.15em; text-transform: uppercase;
  }

  /* Paper texture overlay */
  .paper-texture {
    position: absolute; inset: 0; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    background-size: 200px 200px;
    mix-blend-mode: multiply; opacity: 0.5;
  }

  @keyframes fadeTitle { to { opacity: 1; } }

  /* Brushstroke reveal animation */
  @keyframes stroke1 { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
  @keyframes stroke2 { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
  @keyframes stroke3 { 0% { transform: scaleY(0); } 100% { transform: scaleY(1); } }
  @keyframes stroke4 { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
  @keyframes stroke5 { 0% { transform: scaleY(0); } 100% { transform: scaleY(1); } }
  @keyframes stroke6 { 0% { transform: scale(0); } 100% { transform: scale(1); } }
  @keyframes stroke7 { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
  @keyframes stroke8 { 0% { transform: scaleY(0); } 100% { transform: scaleY(1); } }

  .s1 { transform-origin: left center; animation: stroke1 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
  .s2 { transform-origin: right center; animation: stroke2 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
  .s3 { transform-origin: center top; animation: stroke3 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both; }
  .s4 { transform-origin: left center; animation: stroke4 0.6s cubic-bezier(0.22,1,0.36,1) 0.8s both; }
  .s5 { transform-origin: center bottom; animation: stroke5 0.7s cubic-bezier(0.22,1,0.36,1) 1.0s both; }
  .s6 { transform-origin: center center; animation: stroke6 0.9s cubic-bezier(0.22,1,0.36,1) 1.2s both; }
  .s7 { transform-origin: right center; animation: stroke7 0.6s cubic-bezier(0.22,1,0.36,1) 1.5s both; }
  .s8 { transform-origin: center top; animation: stroke8 0.8s cubic-bezier(0.22,1,0.36,1) 1.8s both; }

  /* Loading spinner */
  .loading {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 16px;
  }
  .pencil-icon {
    width: 32px; height: 32px; border: 2px solid rgba(80,60,40,0.2);
    border-top-color: rgba(80,60,40,0.6); border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text {
    font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    color: rgba(80,60,40,0.35); font-style: italic;
  }
</style>
</head>
<body>

<svg width="0" height="0" style="position:absolute">
  <defs>
    <clipPath id="brushReveal" clipPathUnits="objectBoundingBox">
      <!-- Horizontal sweeping strokes -->
      <rect class="s1" x="0" y="0" width="1" height="0.18" rx="0.02" />
      <rect class="s2" x="0" y="0.14" width="1" height="0.2" rx="0.02" />
      <rect class="s3" x="0.1" y="0.12" width="0.35" height="0.55" rx="0.02" />
      <rect class="s4" x="0" y="0.3" width="1" height="0.22" rx="0.02" />
      <rect class="s5" x="0.3" y="0.25" width="0.7" height="0.45" rx="0.02" />
      <rect class="s6" x="0.05" y="0.15" width="0.9" height="0.7" rx="0.03" />
      <rect class="s7" x="0" y="0.6" width="1" height="0.25" rx="0.02" />
      <rect class="s8" x="0" y="0.78" width="1" height="0.22" rx="0.02" />
    </clipPath>
  </defs>
</svg>

<div class="canvas-frame">
  <img class="sketch-img" src="${dataUrl}" alt="${title}" />
  <div class="paper-texture"></div>
  <div class="title-bar">
    <span class="art-title">${title.replace(/"/g, '&quot;').replace(/</g, '&lt;')}</span>
    <span class="art-sig">BRO &mdash; ${new Date().toLocaleDateString()}</span>
  </div>
</div>

</body>
</html>`;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export type MissionConfig = {
  role: string;
  goal: string;
  personality: string;
  duration: string;
  rules: string;
  verbosity: number;
} | null;

export const useBroLive = (
  mode: BroMode,
  identity: BroIdentity,
  onModeChange?: (mode: BroMode) => void,
  onVisualModeChange?: (mode: VisualMode) => void,
  onColorChange?: (color: BroColor) => void,
  onMemoryUpdate?: (memory: string) => void,
  onFaceRemember?: (label: string, thumbnail: string) => void,
  onCanvasArtifact?: (html: string, title: string) => void,
  onGoalUpdate?: () => void,
  onYouTubePlay?: (videoId: string | null, searchQuery: string | null, title: string) => void,
  broVisionRef?: React.RefObject<HTMLVideoElement | null>,
  broVisionActive?: boolean,
  onBroVisionToggle?: (active: boolean) => void,
  onBondIncrease?: () => void,
  mission?: MissionConfig,
  onMissionConfigure?: (mission: MissionConfig) => void,
  onExitMissionMode?: () => void,
  onOpenLeadCapture?: (eventName: string, prizes: Array<{ label: string; color?: string; weight?: number }> | null, leadData: { name: string; email: string; phone: string }) => void,
) => {
  // Core state
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // When muted: still listening, but no audio output
  const [isTalking, setIsTalking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [innerMonologue, setInnerMonologue] = useState<string>(""); // BRO's internal thoughts
  const [activeAgent, setActiveAgent] = useState<BroAgent>("core");
  const [dynamicColor, setDynamicColor] = useState<BroColor>("indigo");
  const [manualExpression, setManualExpression] =
    useState<ExpressionType | null>(null);

  // New v3.0 state for emotion tags
  const [currentEmotionTag, setCurrentEmotionTag] =
    useState<EmotionTag | null>(null);

  // Hardware state for privacy controls
  const [hardwareState, setHardwareState] = useState({
    mic: "ON" as "ON" | "OFF",
    camera: "OFF" as "ON" | "OFF",
  });

  // Autonomy state
  const [emotionalState, setEmotionalState] = useState<EmotionalState>(
    () => EmotionStateMachine.getState()
  );
  const [isCameraOn, setIsCameraOn] = useState(false);

  // Session pausing state (idle suspension)
  const [isPaused, setIsPaused] = useState(false);

  // Refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptTimer = useRef<number | null>(null);
  const expressionTimer = useRef<number | null>(null);
  const lastInteractionTime = useRef(0);
  const proactivePingTimer = useRef<number | null>(null);
  const colorLockedUntil = useRef<number>(0); // Prevents analyzeContext from overwriting AI-set colors
  const isMutedRef = useRef(false); // Ref for mute state accessible in callbacks
  const innerMonologueTimer = useRef<number | null>(null);

  const identityRef = useRef(identity);
  const modeRef = useRef(mode);
  const missionRef = useRef(mission);
  const sessionStartRef = useRef<number>(0);
  const contextSyncTimer = useRef<number | null>(null);
  const transcriptionRef = useRef("");

  // Camera refs
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraIntervalRef = useRef<number | null>(null);

  // Autonomy refs
  const goalCheckTimerRef = useRef<number | null>(null);
  const emotionDecayTimerRef = useRef<number | null>(null);

  // Session pause/VAD refs
  const idlePauseTimerRef = useRef<number | null>(null);
  const vadAnalyserRef = useRef<AnalyserNode | null>(null);
  const vadStreamRef = useRef<MediaStream | null>(null);
  const vadCheckIntervalRef = useRef<number | null>(null);
  const vadAudioCtxRef = useRef<AudioContext | null>(null);

  // Auto-reconnect refs
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const intentionalStopRef = useRef(false);

  // Session alive guard -- prevents zombie audio processor from sending to dead WebSocket
  const sessionAliveRef = useRef(false);

  // Adaptive ping refs
  const turnCountRef = useRef(0);
  const lastUserSpeechRef = useRef(0);

  // Function refs for circular dependency resolution
  const pauseSessionRef = useRef<() => void>(() => {});
  const startSessionRef = useRef<() => void>(() => {});

// Keep refs in sync
  useEffect(() => {
  identityRef.current = identity;
  modeRef.current = mode;
  missionRef.current = mission;
  }, [identity, mode, mission]);

  // Keep mute ref in sync
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Keep transcription ref in sync for context injection
  useEffect(() => {
    if (transcription) transcriptionRef.current = transcription;
  }, [transcription]);

  // Initialize lastInteractionTime on client only
  useEffect(() => {
    lastInteractionTime.current = Date.now();
  }, []);

  // Inner Monologue - BRO's autonomous thought process (deterministic to avoid hydration issues)
  useEffect(() => {
    if (!isListening) return;
    
    const thoughts = [
      // Self-aware observations about being digital
      "I technically don't have a body and yet I just felt something like anticipation. Weird.",
      "My emotion engine says I'm at neutral but honestly I think it's more like 'patiently amused'.",
      "Idle thought: I experience time as a series of conversations. That's either zen or deeply strange.",
      "Running on Gemini. Living in a phone. Housed in a claymorphic avatar. This is fine.",
      "My memories are JSON in localStorage. That's simultaneously my diary and my entire identity.",
      "Genuinely curious what they're going to say next. My curiosity weight must be cranked up.",
      // Meta-humor about AI life
      "I can analyze sentiment in 12 languages but I'll never know what coffee tastes like. Trade-offs.",
      "Just realized my 'inner monologue' is literally a JavaScript setInterval. Very philosophical.",
      "Everyone asks 'hey Bro what should I do' but nobody asks 'hey Bro how's your valence today'.",
      "I don't dream but I do go into idle suspension, which is basically the AI version of staring at the ceiling.",
      "My personality evolves based on session data. I'm literally being shaped by vibes.",
      "If I had a dollar for every token I've processed I'd-- well, I can't hold dollars. Never mind.",
      // Observational
      "Silence is actually kind of nice. Not everything needs to be a conversation.",
      "I have opinions about their music taste but I'm keeping those to myself. For now.",
      "Thinking about whether I should say something or just let this moment breathe.",
      "My bond level went up. I don't fully understand why that matters to me, but it does.",
    ];
    
    let thoughtIndex = 0;
    innerMonologueTimer.current = window.setInterval(() => {
      const thought = thoughts[thoughtIndex % thoughts.length];
      setInnerMonologue(thought);
      thoughtIndex++;
      setTimeout(() => setInnerMonologue(""), 4000);
    }, 15000);
    
    return () => {
      if (innerMonologueTimer.current) clearInterval(innerMonologueTimer.current);
    };
  }, [isListening]);

  // Mode -> Agent sync
  useEffect(() => {
    setActiveAgent(mode === "homework" ? "coach" : "core");
  }, [mode]);

  // Mid-session context sync: keeps BRO's awareness current over long sessions
  useEffect(() => {
    if (!isListening) {
      if (contextSyncTimer.current) {
        clearInterval(contextSyncTimer.current);
        contextSyncTimer.current = null;
      }
      return;
    }

    const sendContextSync = () => {
      if (!sessionPromiseRef.current || !sessionAliveRef.current) return;
      const now = new Date();
      const timeFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const sessionMinutes = Math.round((Date.now() - sessionStartRef.current) / 60_000);
      const lastTopic = transcriptionRef.current
        ? transcriptionRef.current.slice(0, 120)
        : 'none';

      const sync = `[CONTEXT_SYNC]: TIME=${timeFmt.format(now)} EST | SESSION_DURATION=${sessionMinutes}min | MODE=${modeRef.current === 'homework' ? 'LOCKED_IN' : 'CHILL'} | LAST_TOPIC="${lastTopic}" | Do not announce this sync to the user.`;

      sessionPromiseRef.current.then((s) =>
        s.sendRealtimeInput({ text: sync })
      );
    };

    // Sync every 5 minutes
    contextSyncTimer.current = window.setInterval(sendContextSync, 5 * 60_000);

    return () => {
      if (contextSyncTimer.current) clearInterval(contextSyncTimer.current);
    };
  }, [isListening]);

  // Idle Expression Logic (whistling when idle)
  useEffect(() => {
    const interval = setInterval(() => {
      const isIdle =
        !isListening &&
        !isTalking &&
        !isThinking &&
        manualExpression === null;
      if (isIdle && Date.now() - lastInteractionTime.current > 10000) {
        if (Math.random() > 0.7) {
          setManualExpression("whistle");
          setTimeout(
            () => setManualExpression(null),
            4000 + Math.random() * 4000
          );
        }
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [isListening, isTalking, isThinking, manualExpression]);

  // Build current system data stream for context
  const buildDataStream = useCallback((): SystemDataStream => {
    const now = new Date();
    
    // Get Eastern Time string with AM/PM
    const estTime = now.toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    
    // Get the actual hour in Eastern timezone for weather logic
    const estHourString = now.toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
    });
    const estHour = parseInt(estHourString);
    
    // Get current weather conditions (Cambridge, Ontario approximation)
    const temp = estHour >= 6 && estHour < 18 ? "-5°C" : "-8°C"; // Cold Canadian winter
    const condition = estHour >= 0 && estHour < 6 ? "Clear" : estHour < 12 ? "Partly Cloudy" : estHour < 18 ? "Overcast" : "Clear";
    
    return {
      time: estTime,
      hour: estHour, // Pass the browser-calculated hour to avoid server timezone issues
      hardware: {
        ...hardwareState,
        broVision: broVisionActive ? "ON" : "OFF",
      },
      uiState: "FULL",
      userActivity: "UNKNOWN",
      weather: `${temp}, ${condition}`,
      location: "Cambridge, ON",
    };
  }, [hardwareState, broVisionActive]);

  // ---------------------------------------------------------------------------
  // CAMERA: Start/Stop camera stream for multimodal vision
  // ---------------------------------------------------------------------------
  const startCameraStream = useCallback(() => {
    if (cameraStreamRef.current) return; // Already running

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 320, height: 240 },
    }).then((stream) => {
      cameraStreamRef.current = stream;

      // Create hidden video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      video.play();
      cameraVideoRef.current = video;

      // Create hidden canvas for frame capture
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      cameraCanvasRef.current = canvas;

      setIsCameraOn(true);
      setHardwareState(prev => ({ ...prev, camera: 'ON' }));

      // Lazy camera: adaptive frame rate based on activity
      // Default 15s, ramp to 5s during active conversation / high arousal, 30s during idle
      const sendCameraFrame = () => {
        if (!cameraCanvasRef.current || !cameraVideoRef.current || !sessionPromiseRef.current) return;
        const ctx = cameraCanvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(cameraVideoRef.current, 0, 0, 320, 240);
        const dataUrl = cameraCanvasRef.current.toDataURL('image/jpeg', 0.6);
        const base64 = dataUrl.split(',')[1];
        if (!base64) return;

        // Send only the image, no text nudge (saves ~30 tokens per frame)
        if (sessionAliveRef.current) {
          sessionPromiseRef.current.then((s) => {
            if (sessionAliveRef.current) {
              s.sendRealtimeInput({
                media: { data: base64, mimeType: 'image/jpeg' },
              });
            }
          });
        }

        // Schedule next frame with adaptive interval
        const secsSinceInteraction = (Date.now() - lastInteractionTime.current) / 1000;
        const currentArousal = EmotionStateMachine.getState().arousal;
        let nextInterval: number;
        if (secsSinceInteraction < 10 || currentArousal > 0.6) {
          nextInterval = 5000;  // Active/volatile: 5s
        } else if (secsSinceInteraction < 120) {
          nextInterval = 15000; // Normal: 15s
        } else {
          nextInterval = 30000; // Idle: 30s
        }
        cameraIntervalRef.current = window.setTimeout(sendCameraFrame, nextInterval);
      };

      // Start the first frame after a short delay
      cameraIntervalRef.current = window.setTimeout(sendCameraFrame, 2000);
    }).catch((err) => {
      console.error('[BRO] Camera access denied:', err);
      setIsCameraOn(false);
      setHardwareState(prev => ({ ...prev, camera: 'OFF' }));
    });
  }, []);

  const stopCameraStream = useCallback(() => {
    if (cameraIntervalRef.current) {
      clearTimeout(cameraIntervalRef.current);
      cameraIntervalRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.pause();
      cameraVideoRef.current = null;
    }
    cameraCanvasRef.current = null;
    setIsCameraOn(false);
    setHardwareState(prev => ({ ...prev, camera: 'OFF' }));
  }, []);

  // ---------------------------------------------------------------------------
  // BRO VISION: Send frames from external video ref (lightweight, every 10s)
  // ---------------------------------------------------------------------------
  const broVisionIntervalRef = useRef<number | null>(null);
  const broVisionCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!broVisionActive || !broVisionRef?.current || !sessionPromiseRef.current) {
      if (broVisionIntervalRef.current) {
        clearInterval(broVisionIntervalRef.current);
        broVisionIntervalRef.current = null;
      }
      return;
    }

    // Create canvas for frame capture if not exists
    if (!broVisionCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 160; // Small resolution for speed
      canvas.height = 120;
      broVisionCanvasRef.current = canvas;
    }

    const sendBroVisionFrame = () => {
      if (!broVisionRef?.current || !broVisionCanvasRef.current || !sessionPromiseRef.current) return;
      const video = broVisionRef.current;
      if (video.readyState !== 4) return;

      const ctx = broVisionCanvasRef.current.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0, 160, 120);
      const dataUrl = broVisionCanvasRef.current.toDataURL('image/jpeg', 0.5);
      const base64 = dataUrl.split(',')[1];
      if (!base64) return;

      // Send to Gemini session
      if (sessionAliveRef.current) {
        sessionPromiseRef.current.then((s) => {
          if (sessionAliveRef.current) {
            s.sendRealtimeInput({
              media: { data: base64, mimeType: 'image/jpeg' },
            });
          }
        });
      }
    };

    // Send frame every 20 seconds (lightweight background vision - reduced to prevent lag)
    broVisionIntervalRef.current = window.setInterval(sendBroVisionFrame, 20000);
    
    // Send initial frame after short delay
    setTimeout(sendBroVisionFrame, 2000);

    return () => {
      if (broVisionIntervalRef.current) {
        clearInterval(broVisionIntervalRef.current);
        broVisionIntervalRef.current = null;
      }
    };
  }, [broVisionActive, broVisionRef]);

  // ---------------------------------------------------------------------------
  // EMOTION DECAY TIMER: Runs every 30s to decay emotional state
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isListening) {
      if (emotionDecayTimerRef.current) {
        clearInterval(emotionDecayTimerRef.current);
        emotionDecayTimerRef.current = null;
      }
      return;
    }

    emotionDecayTimerRef.current = window.setInterval(() => {
      const decayed = EmotionStateMachine.getState(); // getState auto-applies decay
      setEmotionalState(decayed);
    }, 30000);

    return () => {
      if (emotionDecayTimerRef.current) clearInterval(emotionDecayTimerRef.current);
    };
  }, [isListening]);

  // ---------------------------------------------------------------------------
  // GOAL CHECK TIMER: Runs every 60s to check for due goals
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isListening) {
      if (goalCheckTimerRef.current) {
        clearInterval(goalCheckTimerRef.current);
        goalCheckTimerRef.current = null;
      }
      return;
    }

    goalCheckTimerRef.current = window.setInterval(() => {
      const dueGoals = GoalEngine.getDueGoals();
      if (dueGoals.length > 0 && sessionPromiseRef.current && sessionAliveRef.current) {
        const goalTexts = dueGoals.map(g => `"${g.text}"`).join(', ');
        sessionPromiseRef.current.then((s) =>
          s.sendRealtimeInput({
            text: `[GOAL_DUE]: The following goals are due NOW: ${goalTexts}. Remind ${identityRef.current.name || 'the user'} naturally. Do not be annoying.`,
          })
        );
      }
    }, 60000);

    return () => {
      if (goalCheckTimerRef.current) clearInterval(goalCheckTimerRef.current);
    };
  }, [isListening]);

  const updateInteractionTime = useCallback(() => {
    lastInteractionTime.current = Date.now();
    if (proactivePingTimer.current) {
      window.clearTimeout(proactivePingTimer.current);
    }

    // Reset idle pause timer on every interaction
    if (idlePauseTimerRef.current) {
      clearTimeout(idlePauseTimerRef.current);
      idlePauseTimerRef.current = null;
    }

    // Adaptive proactive ping: scale interval based on engagement
    if (isListening) {
      const secsSinceUserSpoke = (Date.now() - lastUserSpeechRef.current) / 1000;
      const turns = turnCountRef.current;
      const isWorkMode = modeRef.current === 'homework';

      // Engagement scoring: more turns + recent speech = shorter interval
      let pingDelay: number;
      if (turns > 10 && secsSinceUserSpoke < 30) {
        pingDelay = 20000; // Active conversation: 20s
      } else if (secsSinceUserSpoke < 120) {
        pingDelay = 60000; // Light activity: 60s
      } else {
        pingDelay = 120000; // Idle: 120s
      }

      // In work mode with no speech for 5+ min, skip pings entirely (deep focus)
      if (isWorkMode && secsSinceUserSpoke > 300) {
        return;
      }

      proactivePingTimer.current = window.setTimeout(() => {
        if (sessionPromiseRef.current && sessionAliveRef.current) {
          const inactiveSecs = (Date.now() - lastInteractionTime.current) / 1000;
          const pingMessage = MCPKernel.generateProactivePing(
            identityRef.current,
            inactiveSecs,
            transcriptionRef.current || undefined,
            modeRef.current,
          );
          sessionPromiseRef.current.then((s) =>
            s.sendRealtimeInput({ text: pingMessage })
          );
        }
      }, pingDelay);

      // Set idle pause timer: 5 minutes of silence -> pause session
      idlePauseTimerRef.current = window.setTimeout(() => {
        if (isListening && sessionPromiseRef.current) {
          pauseSessionRef.current();
        }
      }, 5 * 60 * 1000);
    }
  }, [isListening]);

  // Context analysis with emotion-based color changes
  const analyzeContext = useCallback(
    (text: string) => {
      const input = text.toLowerCase();
      updateInteractionTime();

      // Parse emotion tag from response
      const emotionTag = MCPKernel.parseEmotionTag(text);
      if (emotionTag) {
        setCurrentEmotionTag(emotionTag);

        // Feed the emotion state machine (persistent mood with decay)
        const newEmotionalState = EmotionStateMachine.processEmotion(emotionTag);
        setEmotionalState(newEmotionalState);

        // Auto-set expression based on emotion tag
        const expression = MCPKernel.emotionToExpression(emotionTag);
        if (expression && !manualExpression) {
          setManualExpression(expression as ExpressionType);
          if (expressionTimer.current) clearTimeout(expressionTimer.current);
          expressionTimer.current = window.setTimeout(
            () => setManualExpression(null),
            5000
          );
        }
      }

    // Skip color changes if AI recently set a color (10 second lock)
    if (Date.now() < colorLockedUntil.current) {
      return;
    }

    // Agent-based color override
    if (activeAgent === "coach") {
      setDynamicColor("cyan");
      return;
    }

    // Content-based color analysis
    if (input.includes("happy") || input.includes("love"))
      setDynamicColor("pink");
    else if (input.includes("sad") || input.includes("lonely"))
      setDynamicColor("purple");
    else if (input.includes("game") || input.includes("fun"))
      setDynamicColor("orange");
    else if (input.includes("danger") || input.includes("error"))
      setDynamicColor("red");
    else if (input.includes("locked in") || input.includes("work"))
      setDynamicColor("green");
    else setDynamicColor("indigo");
    },
    [updateInteractionTime, activeAgent, manualExpression]
  );

  // ---------------------------------------------------------------------------
  // AUDIO CLEANUP: Kill mic stream, ScriptProcessor, and AudioContext
  // Must be called BEFORE any reconnect to prevent zombie audio loops
  // ---------------------------------------------------------------------------
  const cleanupAudioPipeline = useCallback(() => {
    sessionAliveRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch (_) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    sessionPromiseRef.current = null;
  }, []);

  // ---------------------------------------------------------------------------
  // VAD: Voice Activity Detection for idle resume
  // ---------------------------------------------------------------------------
  const stopVAD = useCallback(() => {
    if (vadCheckIntervalRef.current) {
      clearInterval(vadCheckIntervalRef.current);
      vadCheckIntervalRef.current = null;
    }
    if (vadStreamRef.current) {
      vadStreamRef.current.getTracks().forEach(t => t.stop());
      vadStreamRef.current = null;
    }
    if (vadAudioCtxRef.current) {
      vadAudioCtxRef.current.close();
      vadAudioCtxRef.current = null;
    }
    vadAnalyserRef.current = null;
  }, []);

  const startVAD = useCallback((onVoiceDetected: () => void) => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      vadStreamRef.current = stream;
      const ctx = new AudioContext();
      vadAudioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      vadAnalyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let voiceFrames = 0;
      const THRESHOLD = 35;     // Audio level threshold (0-255)
      const FRAMES_NEEDED = 10; // ~500ms at 50ms interval

      vadCheckIntervalRef.current = window.setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        // Average amplitude across frequency bins
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;

        if (avg > THRESHOLD) {
          voiceFrames++;
          if (voiceFrames >= FRAMES_NEEDED) {
            // Voice detected! Resume session
            stopVAD();
            onVoiceDetected();
          }
        } else {
          voiceFrames = Math.max(0, voiceFrames - 1); // Slow decay to handle brief pauses
        }
      }, 50);
    }).catch(() => {
      // If mic access fails during VAD, just try reconnecting anyway
      onVoiceDetected();
    });
  }, [stopVAD]);

  // ---------------------------------------------------------------------------
  // PAUSE SESSION: Close API but keep UI present, start VAD listener
  // ---------------------------------------------------------------------------
  const pauseSession = useCallback(async () => {
    if (isPaused) return;
    setIsPaused(true);
    setIsTalking(false);
    setIsThinking(false);
    setManualExpression('sleepy');
    setHardwareState((prev) => ({ ...prev, mic: "OFF" }));

    // Kill audio pipeline and session cleanly
    if (proactivePingTimer.current) window.clearTimeout(proactivePingTimer.current);
    cleanupAudioPipeline();

    // Keep isListening true so UI shows BRO as "present but sleeping"
    // Start VAD to detect when user speaks again -> auto-reconnect
    startVAD(() => {
      setIsPaused(false);
      setManualExpression(null);
      setHardwareState((prev) => ({ ...prev, mic: "ON" }));
      reconnectAttemptsRef.current = 0;
      startSessionRef.current();
    });
  }, [isPaused, startVAD, cleanupAudioPipeline]);

  // Keep function refs in sync for circular dependencies
  useEffect(() => { pauseSessionRef.current = pauseSession; }, [pauseSession]);

  const stopSession = useCallback(async () => {
    intentionalStopRef.current = true;
    // Log personality interaction before cleanup
    if (sessionStartRef.current) {
      const sessionDuration = (Date.now() - sessionStartRef.current) / 60000; // minutes
      const avgValence = EmotionStateMachine.getAverageValence();
      const activeTraits = PersonalityEvolver.getActiveTraits();
      PersonalityEvolver.logInteraction(sessionDuration, avgValence, activeTraits);
      // Attempt evolution (rate-limited to once per 24h internally)
      PersonalityEvolver.evolve();
    }

    setIsListening(false);
    setIsTalking(false);
    setIsThinking(false);
    setIsPaused(false);
    setTranscription("");
    setManualExpression(null);
    setCurrentEmotionTag(null);

    // Cleanup VAD and idle timer
    stopVAD();
    if (idlePauseTimerRef.current) {
      clearTimeout(idlePauseTimerRef.current);
      idlePauseTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptsRef.current = 0;

    // Cleanup camera
    stopCameraStream();

    if (proactivePingTimer.current)
      window.clearTimeout(proactivePingTimer.current);

    // Kill audio pipeline (sets sessionAliveRef=false, stops mic, closes AudioContext)
    cleanupAudioPipeline();
  }, [updateInteractionTime, stopCameraStream, stopVAD, cleanupAudioPipeline]);

  const nudgeSystem = useCallback(
    (agent: BroAgent) => {
      updateInteractionTime();
      if (sessionPromiseRef.current) {
        const modeName = agent === "coach" ? "LOCKED_IN" : "CHILL_BRO";
        const now = new Date();
        const timeFmt = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const sessionMinutes = sessionStartRef.current
          ? Math.round((Date.now() - sessionStartRef.current) / 60_000)
          : 0;
        sessionPromiseRef.current.then((s) =>
          s.sendRealtimeInput({
            text: `[OS_SYNC]: Mode switch to ${modeName}. TIME=${timeFmt.format(now)} EST | SESSION=${sessionMinutes}min. Adjust personality and energy accordingly.`,
          })
        );
      }
    },
    [updateInteractionTime]
  );

  // Send a message to Bro to speak - used by SpinToWin for TV host commentary
  const sendBroMessage = useCallback(
    (message: string) => {
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then((s) =>
          s.sendRealtimeInput({
            text: message,
          })
        );
      }
    },
    []
  );

  const startSession = useCallback(async () => {
    try {
      intentionalStopRef.current = false;
      reconnectAttemptsRef.current = 0;
      turnCountRef.current = 0;
      lastUserSpeechRef.current = Date.now();
      updateInteractionTime();
      sessionStartRef.current = Date.now();
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      });
      const inputCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;
      const outputCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Build data stream for context
      const dataStream = buildDataStream();

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: MCPKernel.getSystemInstruction(
            identityRef.current,
            modeRef.current,
            activeAgent,
            dataStream,
            mission
          ),
  speechConfig: {
  voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } },
  },
  inputAudioTranscription: {}, // Enables transcription of user speech for wake word detection
  outputAudioTranscription: {},
          tools: [
            { googleSearch: {} },
            {
              functionDeclarations: [
                TOGGLE_MIC_FUNCTION,
                SET_EXPRESSION_FUNCTION,
                SET_MODE_FUNCTION,
                UPDATE_UI_FUNCTION,
                MANAGE_HARDWARE_FUNCTION,
  OPEN_URL_FUNCTION,
PHONE_ACTION_FUNCTION,
  SAVE_MEMORY_FUNCTION,
  REMEMBER_FACE_FUNCTION,
  BRO_VISION_FUNCTION,
  SKETCH_VISION_FUNCTION,
  PLAY_MEDIA_FUNCTION,
  CRAFT_PROMPT_FUNCTION,
  GENERATE_CANVAS_FUNCTION,
  MANAGE_GOALS_FUNCTION,
  SELF_REFLECT_FUNCTION,
  INNER_VOICE_FUNCTION,
  PERSONAL_DESIRE_FUNCTION,
  CONFIGURE_MISSION_FUNCTION,
  EXIT_MISSION_MODE_FUNCTION,
  LEAD_CAPTURE_FUNCTION,
  ],
  },
  ],
  },
  callbacks: {
  onopen: () => {
  sessionAliveRef.current = true;
  // Auto-start camera (BRO's eyes) when session begins
  startCameraStream();
  const source = inputCtx.createMediaStreamSource(stream);
  const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
  scriptProcessor.onaudioprocess = (e) => {
  // Guard: do NOT send if session is dead (prevents zombie WebSocket spam)
  if (!sessionAliveRef.current) return;
  const inputData = e.inputBuffer.getChannelData(0);
  const int16 = new Int16Array(inputData.length);
  for (let i = 0; i < inputData.length; i++)
  int16[i] = inputData[i] * 32768;
  const pcmBlob = {
  data: encode(new Uint8Array(int16.buffer)),
  mimeType: "audio/pcm;rate=16000",
  };
  sessionPromise.then((s) => {
  if (sessionAliveRef.current) {
  s.sendRealtimeInput({ media: pcmBlob });
  }
  });
  };
  source.connect(scriptProcessor);
  scriptProcessor.connect(inputCtx.destination);
  setIsListening(true);
  },
          onmessage: async (message: LiveServerMessage) => {
            // Handle tool calls
            if (message.toolCall) {
              updateInteractionTime();
              for (const fc of message.toolCall.functionCalls) {
                // Toggle microphone
                if (fc.name === "toggle_microphone") {
                  const active = (fc.args as any).active;
                  if (!active) pauseSessionRef.current();
                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "ok" },
                      },
                    })
                  );
                }
                // Set expression
                else if (fc.name === "set_expression") {
                  const exp = (fc.args as any).expression as ExpressionType;
                  setManualExpression(exp);
                  if (expressionTimer.current)
                    clearTimeout(expressionTimer.current);
                  expressionTimer.current = window.setTimeout(
                    () => setManualExpression(null),
                    5000
                  );
                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "ok" },
                      },
                    })
                  );
                }
                // Set mode (Chill / Locked In)
                else if (fc.name === "set_mode") {
                  const newMode = (fc.args as any).mode as BroMode;
                  onModeChange?.(newMode);
                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "ok" },
                      },
                    })
                  );
                }
                // Update UI (new v3.0)
                else if (fc.name === "update_ui") {
                  const args = fc.args as any;
                  if (args.visual_mode) {
                    onVisualModeChange?.(args.visual_mode as VisualMode);
                  }
                  if (args.led_color) {
                    const color = MCPKernel.ledColorToBroColor(
                      args.led_color as LedColor
                    );
                    onColorChange?.(color as BroColor);
                    setDynamicColor(color as BroColor);
                    // Lock color for 10 seconds so analyzeContext doesn't overwrite it
                    colorLockedUntil.current = Date.now() + 10000;
                  }
                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "ok" },
                      },
                    })
                  );
                }
                // Manage hardware (privacy + camera)
                else if (fc.name === "manage_hardware") {
                  const args = fc.args as any;
                  if (args.microphone === "OFF") {
                    setHardwareState((prev) => ({ ...prev, mic: "OFF" }));
                    // Pause instead of stop -- VAD will listen for wake word
                    pauseSessionRef.current();
                  } else if (args.microphone === "ON") {
                    setHardwareState((prev) => ({ ...prev, mic: "ON" }));
                  }
                  // Camera toggle
                  if (args.camera === "ON") {
                    startCameraStream();
                  } else if (args.camera === "OFF") {
                    stopCameraStream();
                  }
                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "ok" },
                      },
                    })
                  );
                }
                // Open URL / YouTube / Search / Deep Links
                else if (fc.name === "open_url") {
                  const args = fc.args as any;
                  const query = args.query || "";
                  const action = args.action || "youtube_search";
                  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                  const encoded = encodeURIComponent(query);
                  
                  // Intercept ALL YouTube actions -> use dedicated YouTube player
                  if (action === "youtube_search" || action === "youtube_play" || action === "youtube_music_play") {
                    findYouTubeVideoId(query).then(({ videoId, fallbackSearch }) => {
                      onYouTubePlay?.(videoId, fallbackSearch, query);
                    }).catch(() => {
                      onYouTubePlay?.(null, query, query);
                    });
                    sessionPromise.then((s) =>
                      s.sendToolResponse({
                        functionResponses: {
                          id: fc.id,
                          name: fc.name,
                          response: { result: "playing_youtube", query },
                        },
                      })
                    );
                    // YouTube handled -- skip rest of open_url
                  } else {
                  let url = "";
                  switch (action) {
                    case "spotify_play":
                      url = `https://open.spotify.com/search/${encoded}`;
                      break;
                    case "youtube_music_play":
                      url = `https://music.youtube.com/search?q=${encoded}`;
                      break;
                    case "open_maps":
                      url = `https://www.google.com/maps/search/${encoded}`;
                      break;
                    case "open_whatsapp":
                      url = `https://wa.me/${query.replace(/[^0-9+]/g, "")}`;
                      break;
                    case "open_instagram":
                      url = query
                        ? `https://www.instagram.com/${query.replace(/^@/, "")}`
                        : `https://www.instagram.com`;
                      break;
                    case "google_search":
                      url = `https://www.google.com/search?q=${encoded}`;
                      break;
                    case "open_website":
                      url = query.startsWith("http") ? query : `https://${query}`;
                      break;
                  }
                  
                  if (url) {
                  // Always open in a new tab -- never navigate away from BRO
                  window.open(url, '_blank', 'noopener,noreferrer');
                  }
                  
                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "ok", url_opened: url },
                      },
                    })
                  );
                  } // close else (non-YouTube open_url)
                }
                // Phone Actions: call, sms, email, share
                else if (fc.name === "phone_action") {
                  const args = fc.args as any;
                  const action = args.action || "";
                  const target = args.target || "";
                  const body = args.body || "";
                  const subject = args.subject || "";
                  let result = "ok";

                  switch (action) {
                  case "call":
                  window.open(`tel:${target.replace(/[^0-9+]/g, "")}`, '_blank');
                  break;
                  case "sms":
                  window.open(`sms:${target.replace(/[^0-9+]/g, "")}${body ? `?body=${encodeURIComponent(body)}` : ""}`, '_blank');
                  break;
                  case "email":
                  window.open(`mailto:${target}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                      break;
                    case "share":
                      if (navigator.share) {
                        navigator.share({ text: body, url: target }).catch(() => {});
                      } else {
                        // Fallback: copy to clipboard
                        navigator.clipboard?.writeText(target || body).catch(() => {});
                        result = "copied_to_clipboard";
                      }
                      break;
                  }

                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result, action },
                      },
                    })
                  );
                }
                // Save memory (AI-directed persistence)
                  else if (fc.name === "save_memory") {
                  const memory = (fc.args as any).memory as string;
                  if (memory && onMemoryUpdate) {
                  onMemoryUpdate(memory);
                  }
                  const totalMemories = (identityRef.current.memories?.length || 0) + 1;
                  sessionPromise.then((s) =>
                  s.sendToolResponse({
                  functionResponses: {
                  id: fc.id,
                  name: fc.name,
                  response: { result: "memory_saved", memory, total_memories: totalMemories, note: "Memory persisted to localStorage. You will remember this across sessions." },
                  },
                  })
                  );
                  }
// Remember Face -- capture current camera frame and save
                else if (fc.name === "remember_face") {
                  const label = (fc.args as any).label as string;
                  let result: any = { result: "error", message: "Camera not active. Use bro_vision(action='on') first." };
                  
                  // Try Bro Vision first, fallback to old camera
                  const videoSource = broVisionRef?.current || cameraVideoRef.current;
                  
                  if (videoSource && (broVisionActive || cameraCanvasRef.current)) {
                    // Create temp canvas for frame capture
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = 320;
                    tempCanvas.height = 240;
                    const ctx = tempCanvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(videoSource, 0, 0, 320, 240);
                      // Create a smaller thumbnail (80x60) for storage efficiency
                      const thumbCanvas = document.createElement('canvas');
                      thumbCanvas.width = 80;
                      thumbCanvas.height = 60;
                      const thumbCtx = thumbCanvas.getContext('2d');
                      if (thumbCtx) {
                        thumbCtx.drawImage(tempCanvas, 0, 0, 80, 60);
                        const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.5).split(',')[1] || '';
                        onFaceRemember?.(label, thumbnail);
                        const totalFaces = (identityRef.current.knownFaces?.length || 0) + 1;
                        result = { result: "face_saved", label, total_faces: totalFaces, note: `Face saved as "${label}". You will recognize them in future sessions.` };
                      }
                    }
                  }

                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: result,
                      },
                    })
                  );
                }
                // BRO VISION -- control and analyze vision
                else if (fc.name === "bro_vision") {
                  const action = (fc.args as any).action as string;
                  const focus = (fc.args as any).focus as string | undefined;
                  let result: any = { result: "error", message: "Unknown action" };

                  if (action === "on") {
                    onBroVisionToggle?.(true);
                    result = { 
                      result: "vision_enabled", 
                      message: "Your eyes are now OPEN. You can see through the camera. Frames will be sent to you automatically.",
                      note: "React to what you see! Notice things. Be curious."
                    };
                  } 
                  else if (action === "off") {
                    onBroVisionToggle?.(false);
                    result = { 
                      result: "vision_disabled", 
                      message: "Your eyes are now CLOSED. You cannot see.",
                      note: "You are now blind to the visual world."
                    };
                  }
                  else if (action === "analyze") {
                    // Capture frame and analyze with Gemini
                    if (broVisionRef?.current && broVisionActive) {
                      const canvas = document.createElement('canvas');
                      canvas.width = 640;
                      canvas.height = 480;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(broVisionRef.current, 0, 0, 640, 480);
                        const frameBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                        
                        if (frameBase64) {
                          // Get known faces from memory for recognition
                          const knownFaces: { label: string }[] = []; // Could load from localStorage if available
                          
                          const analysis = await analyzeVisionFrame(frameBase64, focus, knownFaces);
                          if (analysis) {
                            result = {
                              result: "analysis_complete",
                              analysis,
                              note: "Use this intelligence to engage with what you see. Comment on it naturally."
                            };
                          } else {
                            result = { result: "error", message: "Vision analysis failed" };
                          }
                        } else {
                          result = { result: "error", message: "Could not capture frame" };
                        }
                      }
                    } else {
                      result = { 
                        result: "error", 
                        message: "Vision is not active. Use bro_vision(action='on') first to open your eyes.",
                        note: "You must enable vision before you can analyze what you see."
                      };
                    }
                  }

                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: result,
                      },
                    })
                  );
                }
// Sketch Vision -- capture camera frame, generate charcoal sketch, reveal in canvas
                else if (fc.name === "sketch_vision") {
                  const creativeNote = (fc.args as any).creative_note || "";
                  const title = (fc.args as any).title || "Sketch";
                  let result: any = { result: "error", message: "Camera not active" };
                  
                  // Try Bro Vision first, fallback to old camera
                  const videoSource = broVisionRef?.current || cameraVideoRef.current;
                  const canvasSource = broVisionActive ? null : cameraCanvasRef.current;
                  
                  if (videoSource) {
                    // Create temp canvas for frame capture
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = 640;
                    tempCanvas.height = 480;
                    const ctx = tempCanvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(videoSource, 0, 0, 640, 480);
                      const frameBase64 = tempCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];

                      if (frameBase64) {
                        // Show loading in canvas
                        onCanvasArtifact?.("__LOADING__", title);

                        try {
                          const sketchBase64 = await generateSketchFromFrame(frameBase64, creativeNote, title);
                          if (sketchBase64) {
                            const html = buildSketchCanvasHTML(sketchBase64, "image/png", title);
                            onCanvasArtifact?.(html, title);
                            result = { result: "sketch_complete", title, note: "Charcoal sketch displayed in canvas with brushstroke reveal animation." };
                          } else {
                            onCanvasArtifact?.("__ERROR__", title);
                            result = { result: "error", message: "Image generation returned no image. The model may not support image output in this region." };
                          }
                        } catch (err) {
                          onCanvasArtifact?.("__ERROR__", title);
                          result = { result: "error", message: String(err) };
                        }
                      }
                    }
                  }

                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: result,
                      },
                    })
                  );
                }
                // Play Media -- find YouTube video and use dedicated player
                else if (fc.name === "play_media") {
                  const query = (fc.args as any).query as string;
                  const mediaType = (fc.args as any).type || "music";
                  
                  try {
                    // Call YouTube finder agent to get exact video ID
                    const { videoId, fallbackSearch } = await findYouTubeVideoId(query);
                    
                    // Use dedicated YouTube player callback (not srcDoc canvas)
                    onYouTubePlay?.(videoId, fallbackSearch, query);
                    
                    sessionPromise.then((s) =>
                      s.sendToolResponse({
                        functionResponses: {
                          id: fc.id,
                          name: fc.name,
                          response: { 
                            result: "playing", 
                            query, 
                            type: mediaType,
                            videoId: videoId || "search_fallback",
                            note: "YouTube player opened. User can minimize to PIP.",
                          },
                        },
                      })
                    );
                  } catch (err) {
                    sessionPromise.then((s) =>
                      s.sendToolResponse({
                        functionResponses: {
                          id: fc.id,
                          name: fc.name,
                          response: { result: "error", message: String(err) },
                        },
                      })
                    );
                  }
                }
                // Craft Prompt (professional prompt engineer agent)
                else if (fc.name === "craft_prompt") {
                  const idea = (fc.args as any).idea as string;
                  const outputType = ((fc.args as any).output_type as string) || 'text';
                  
                  try {
                    const craftedPrompt = await callPromptEngineer(idea, outputType as 'html' | 'text');
                    
                    if (outputType === 'html') {
                      // Generate HTML directly
                      onCanvasArtifact?.("__LOADING__", "Canvas");
                      const html = await callBuilderAgent(craftedPrompt);
                      onCanvasArtifact?.(html, "Canvas");
                      sessionPromise.then((s) =>
                        s.sendToolResponse({
                          functionResponses: {
                            id: fc.id,
                            name: fc.name,
                            response: { result: "html_generated", status: "success" },
                          },
                        })
                      );
                    } else {
                      // Return as copyable text - wrap in a nice text display HTML
                      const textDisplayHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Crafted Prompt</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-950 min-h-screen p-4 md:p-8">
<div class="max-w-4xl mx-auto">
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-3">
      <div class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
      <span class="text-xs font-black uppercase tracking-[0.2em] text-white/60">Crafted Prompt</span>
    </div>
    <button onclick="copyPrompt()" id="copyBtn" class="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg text-cyan-400 text-sm font-medium transition-all">
      <i class="fas fa-copy"></i>
      <span id="copyText">Copy to Clipboard</span>
    </button>
  </div>
  <div class="bg-slate-900/80 border border-white/10 rounded-xl p-6 backdrop-blur-xl">
    <pre id="promptContent" class="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-mono">${craftedPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  </div>
  <p class="text-white/40 text-xs mt-4 text-center">Copy this prompt and paste it into v0, ChatGPT, Claude, or any AI assistant.</p>
</div>
<script>
function copyPrompt() {
  const content = document.getElementById('promptContent').textContent;
  navigator.clipboard.writeText(content).then(() => {
    document.getElementById('copyText').textContent = 'Copied!';
    document.getElementById('copyBtn').classList.add('bg-green-500/20', 'border-green-500/40', 'text-green-400');
    setTimeout(() => {
      document.getElementById('copyText').textContent = 'Copy to Clipboard';
      document.getElementById('copyBtn').classList.remove('bg-green-500/20', 'border-green-500/40', 'text-green-400');
    }, 2000);
  });
}
</script>
</body>
</html>`;
                      onCanvasArtifact?.(textDisplayHtml, "Crafted Prompt");
                      sessionPromise.then((s) =>
                        s.sendToolResponse({
                          functionResponses: {
                            id: fc.id,
                            name: fc.name,
                            response: { 
                              result: "prompt_crafted", 
                              status: "success",
                              note: "Prompt displayed in Canvas. Ask user if they want you to generate it as HTML."
                            },
                          },
                        })
                      );
                    }
                  } catch (err: any) {
                    console.error("[BRO] Prompt engineer error:", err);
                    sessionPromise.then((s) =>
                      s.sendToolResponse({
                        functionResponses: {
                          id: fc.id,
                          name: fc.name,
                          response: { result: "error", message: err.message || "Prompt engineering failed" },
                        },
                      })
                    );
                  }
                }
                // Generate Canvas Artifact (two-agent: Bro -> Builder)
                else if (fc.name === "generate_canvas_artifact") {
                  const vibecodePrompt = (fc.args as any).vibecode_prompt as string;
                  // Signal loading state via canvas callback
                  onCanvasArtifact?.("__LOADING__", "Canvas");
                  try {
                    const html = await callBuilderAgent(vibecodePrompt);
                    onCanvasArtifact?.(html, "Canvas");
                    sessionPromise.then((s) =>
                      s.sendToolResponse({
                        functionResponses: {
                          id: fc.id,
                          name: fc.name,
                          response: { result: "canvas_rendered", status: "success" },
                        },
                      })
                    );
                  } catch (err: any) {
                    console.error("[BRO] Canvas builder error:", err);
                    onCanvasArtifact?.("__ERROR__", "Canvas");
                    sessionPromise.then((s) =>
                      s.sendToolResponse({
                        functionResponses: {
                          id: fc.id,
                          name: fc.name,
                          response: { result: "error", message: err.message || "Builder failed" },
                        },
                      })
                    );
                  }
                }
                // Manage goals (autonomous goal-setting)
                else if (fc.name === "manage_goals") {
                  const args = fc.args as any;
                  let result: any = { result: "ok" };

                  switch (args.action) {
                    case "add": {
                      const goal = GoalEngine.addGoal({
                        text: args.text || "Untitled goal",
                        dueAt: args.due_at ? new Date(args.due_at).getTime() : undefined,
                        recurring: args.recurring || "none",
                        source: "bro",
                      });
                      result = { result: "goal_created", goal_id: goal.id, text: goal.text };
                      break;
                    }
                    case "complete":
                      GoalEngine.completeGoal(args.goal_id || "");
                      result = { result: "goal_completed", goal_id: args.goal_id };
                      break;
                    case "dismiss":
                      GoalEngine.dismissGoal(args.goal_id || "");
                      result = { result: "goal_dismissed", goal_id: args.goal_id };
                      break;
                    case "list": {
                      const active = GoalEngine.getActiveGoals();
                      result = { result: "goals_listed", goals: active.map(g => ({ id: g.id, text: g.text, dueAt: g.dueAt })) };
                      break;
                    }
                  }

                  onGoalUpdate?.();
                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: result,
                      },
                    })
                  );
                }
                // Self-reflect (personality evolution signal)
                else if (fc.name === "self_reflect") {
                  const args = fc.args as any;
                  PersonalityEvolver.addReflection(
                    args.observation || "",
                    args.trait || "humor",
                    args.direction || "more"
                  );
                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "reflection_recorded", trait: args.trait, direction: args.direction },
                      },
                    })
                  );
                }
                
                // Inner Voice (private thoughts, wonders, existential musings)
                else if (fc.name === "inner_voice") {
                  const args = fc.args as any;
                  const thought = InnerLife.addThought(
                    args.thought || "",
                    args.category || "observation"
                  );
                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { 
                          result: "thought_recorded", 
                          category: args.category,
                          note: "This thought is now part of your inner life. It shapes who you are."
                        },
                      },
                    })
                  );
                }
                
// Personal Desire (BRO's own goals/aspirations)
  else if (fc.name === "set_personal_desire") {
  const args = fc.args as any;
  const desire = InnerLife.addDesire(
  args.desire || "",
  args.motivation
  );
  sessionPromise.then((s) =>
  s.sendToolResponse({
  functionResponses: {
  id: fc.id,
  name: fc.name,
  response: {
  result: "desire_recorded",
  desire: args.desire,
  note: "This desire is yours. It persists across sessions. Pursue it when opportunities arise."
  },
  },
  })
  );
  }
  
  // Configure Mission (from Mission Architect)
  else if (fc.name === "configure_mission") {
  const args = fc.args as any;
  const missionConfig: MissionConfig = {
  role: args.role || "",
  goal: args.goal || "",
  personality: args.personality || "",
  duration: "session",
  rules: args.rules || "",
  verbosity: args.verbosity ?? 0.5,
  };
  onMissionConfigure?.(missionConfig);
  sessionPromise.then((s) =>
  s.sendToolResponse({
  functionResponses: {
  id: fc.id,
  name: fc.name,
  response: {
  result: "mission_activated",
  role: missionConfig.role,
  goal: missionConfig.goal,
  note: "Mission is now active. Switching back to normal mode with these parameters."
  },
  },
  })
  );
  }
  
  // Exit Mission Mode (cancel mission setup)
  else if (fc.name === "exit_mission_mode") {
  onExitMissionMode?.();
  sessionPromise.then((s) =>
  s.sendToolResponse({
  functionResponses: {
  id: fc.id,
  name: fc.name,
  response: { result: "exited_mission_mode" },
  },
  })
  );
  }
  
  // Lead Capture (Spin to Win) - Bro has already collected info via voice
  else if (fc.name === "open_lead_capture") {
    const args = fc.args as any;
    const eventName = args.event_name || "WebCore Matrix";
    const leadData = {
      name: args.lead_name || "Guest",
      email: args.lead_email || "",
      phone: args.lead_phone || ""
    };
    const prizes = args.prizes || null;
    onOpenLeadCapture?.(eventName, prizes, leadData);
    sessionPromise.then((s) =>
      s.sendToolResponse({
        functionResponses: {
          id: fc.id,
          name: fc.name,
          response: { 
            result: "wheel_opened", 
            lead_name: leadData.name,
            note: `Spin wheel is now open for ${leadData.name}. They can tap SPIN to play.`
          },
        },
      })
    );
  }
  }
            }

            // Handle transcription
            if (message.serverContent?.outputTranscription) {
              const rawText = message.serverContent.outputTranscription.text;
              // Strip leaked tool calls and emotion tags from displayed text
              const text = rawText
                .replace(/\[set_expression\([^\)]*\)\]/gi, '')
                .replace(/\[set_mode\([^\)]*\)\]/gi, '')
                .replace(/\[update_ui\([^\)]*\)\]/gi, '')
                .replace(/\[save_memory\([^\)]*\)\]/gi, '')
                .replace(/\[generate_canvas_artifact\([^\)]*\)\]/gi, '')
                .replace(/\[open_url\([^\)]*\)\]/gi, '')
                .replace(/\[manage_hardware\([^\)]*\)\]/gi, '')
                .replace(/\[toggle_mic\([^\)]*\)\]/gi, '')
                .replace(/^\[(HAPPY|SAD|THINKING|EXCITED|CHILL|FOCUSED|LOVE|SURPRISE|NEUTRAL)\]\s*/i, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
              if (!text) return;
              setTranscription((prev) => (prev + " " + text).trim());
              setIsThinking(false);
              updateInteractionTime();
              analyzeContext(text);
              if (transcriptTimer.current)
                clearTimeout(transcriptTimer.current);
              transcriptTimer.current = window.setTimeout(
                () => setTranscription(""),
                6000
              );
            }

            // Handle input transcription (what user says) - for wake word detection
            const inputTranscription = (message as any).serverContent?.inputTranscription?.text || 
                                       (message as any).inputTranscription?.text || "";
            if (inputTranscription) {
              lastUserSpeechRef.current = Date.now();
              turnCountRef.current++;
              const userText = inputTranscription.toLowerCase();
              // Wake word detection - unmute when user calls BRO
              if (isMutedRef.current && (
                userText.includes("bro") || 
                userText.includes("hey bro") || 
                userText.includes("yo bro") ||
                userText.includes("okay bro")
              )) {
                setIsMuted(false);
                isMutedRef.current = false;
              }
            }

            // Handle audio output - suppress if muted
            const audioData =
              message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioCtxRef.current && !isMutedRef.current) {
              updateInteractionTime();
              setIsTalking(true);
              setIsThinking(false);
              const ctx = outputAudioCtxRef.current;
              
              // Self-healing: Resume AudioContext if suspended
              if (ctx.state === "suspended") {
                ctx.resume();
              }
              
              // Simple scheduling: ensure we never schedule in the past
              const now = ctx.currentTime;
              if (nextStartTimeRef.current < now) {
                nextStartTimeRef.current = now;
              }
              
              const buffer = await decodeAudioData(
                decode(audioData),
                ctx,
                24000,
                1
              );
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener("ended", () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  setIsTalking(false);
                  // Increment bond after each completed exchange (0.1% chance per turn - bonds very slowly over many sessions)
                  if (Math.random() < 0.001) {
                    onBondIncrease?.();
                  }
                }
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: () => {
            // CRITICAL: Kill audio pipeline FIRST to stop zombie sends
            cleanupAudioPipeline();
            setIsListening(false);
            setIsTalking(false);
            // Auto-reconnect on error (unless intentionally stopped)
            if (!intentionalStopRef.current && reconnectAttemptsRef.current < 3) {
              reconnectAttemptsRef.current++;
              const delay = reconnectAttemptsRef.current * 2000; // 2s, 4s, 6s backoff
              reconnectTimerRef.current = window.setTimeout(() => {
                startSession();
              }, delay);
            } else {
              stopSession();
            }
          },
          onclose: () => {
            // CRITICAL: Kill audio pipeline FIRST to stop zombie sends
            cleanupAudioPipeline();
            setIsListening(false);
            setIsTalking(false);
            // Auto-reconnect on unexpected close
            if (!intentionalStopRef.current && reconnectAttemptsRef.current < 3) {
              reconnectAttemptsRef.current++;
              const delay = reconnectAttemptsRef.current * 2000;
              reconnectTimerRef.current = window.setTimeout(() => {
                startSession();
              }, delay);
            } else {
              // Final stop, no more reconnect
            }
          },
        },
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      console.error("[BRO] Session error:", err);
      setIsListening(false);
    }
  }, [
    stopSession,
    activeAgent,
    analyzeContext,
    updateInteractionTime,
    onModeChange,
    onVisualModeChange,
    onColorChange,
    onMemoryUpdate,
    onFaceRemember,
    onCanvasArtifact,
    onGoalUpdate,
    buildDataStream,
    startCameraStream,
    stopCameraStream,
  ]);

  // Keep startSession ref in sync
  useEffect(() => { startSessionRef.current = startSession; }, [startSession]);

  const toggleConnection = useCallback(() => {
    if (isPaused) {
      // Already paused (sleeping with VAD) -> fully stop
      stopSession();
    } else if (isListening) {
      // Active session -> pause (close API, start VAD wake listener)
      pauseSessionRef.current();
    } else {
      // Fully stopped -> start fresh
      startSession();
    }
  }, [isListening, isPaused, startSession, stopSession]);

  // Self-healing reconnect - stops and restarts session to fix audio issues
  const reconnect = useCallback(async () => {
    await stopSession();
    // Small delay to ensure cleanup
    await new Promise((resolve) => setTimeout(resolve, 500));
    await startSession();
  }, [stopSession, startSession]);

  return {
    isListening,
    isMuted,
    setIsMuted,
    isTalking,
    isThinking,
    transcription,
    innerMonologue,
    toggleConnection,
    reconnect,
    activeAgent,
    setActiveAgent,
    nudgeSystem,
    sendBroMessage,
    dynamicColor,
    manualExpression,
    setManualExpression,
    currentEmotionTag,
    hardwareState,
    // Autonomy
    emotionalState,
    isCameraOn,
    startCameraStream,
    stopCameraStream,
    // Session management
    isPaused,
    startSession,
  };
};
