# Guide: Building Modern 3D "Claymorphic" Characters in React/CSS

This document outlines the principles used to create high-end, Pixar-style 2D characters that feel 3D and tactile using standard web technologies (React + Tailwind CSS).

## 1. The Core Philosophy: "Claymorphism"
Avoid flat design. Claymorphism uses soft shapes, inner shadows, and layered gradients to make objects look like they are made of soft plastic, rubber, or clay.

### Principles:
- **Rounded Everything**: Use `rounded-full` or large `border-radius`. Sharp corners break the toy-like illusion.
- **Inner Shadows**: Use `shadow-inner` and `inset` shadows to create "occlusion" (where light doesn't reach).
- **Subsurface Scattering**: In real 3D, light enters skin and glows. Simulate this with large, blurred, low-opacity radial gradients (e.g., `bg-rose-400/20 blur-2xl`).

## 2. Lighting & Shading
Light should always come from a consistent direction (usually Top-Right or Top-Left).

- **Specular Highlights**: Small, high-opacity white/bright spots at the top of objects (eyes, hair peaks).
- **Ambient Highlights**: Wide, low-opacity blurry shapes that simulate light bouncing off the material's surface.
- **Drop Shadows**: Use multi-layered shadows. A sharp shadow for the object edge + a wide, blurry shadow for the overall silhouette.

## 3. The "Pixar" Eye Formula
Eyes are the window to the character's soul. Flat circles feel "robotic."

1. **The Orbit**: Large white oval with `shadow-inner`.
2. **The Iris**: Gradient circle (`bg-indigo-500` -> `bg-indigo-700`).
3. **The Pupil**: Pure black circle.
4. **The Sparkle**: One large white dot at 11 o'clock, one small dot at 4 o'clock.
5. **The Eyelid**: A gradient layer that uses `scale-y` for blinking.

## 4. Animation: Squash and Stretch
Characters should feel fleshy, not rigid.

- **Squash & Stretch**: When a character speaks or jumps, they shouldn't just scale linearly. If they get taller (Stretch), they must get slightly thinner to preserve volume.
- **Breathe Cycle**: A character is never truly still. Use a slow `translate-y` loop (6 seconds) to simulate life.
- **Overshoot**: When moving (like settings opening), use `cubic-bezier` curves that slightly "overshoot" the destination before settling (e.g., `cubic-bezier(0.34, 1.56, 0.64, 1)`).

## 5. Layering for Depth
Think like a paper crafter.
- **Background Layer**: Back of hair, shadow on the wall.
- **Mid Layer**: Head, main hair body.
- **Top Layer**: Brows, eyes, glasses, accessories.
- Use `z-index` and subtle `translate` variations on mouse move to create a Parallax effect.

## 6. Hair Construction
Hair shouldn't be a single block.
- **Base**: The main silhouette.
- **Shading**: Darker gradient at the bottom/back.
- **Top Gloss**: Lighter gradient or blurry white strip at the top.
- **Framing**: Separate pieces for side-locks or bangs that overlap the face.

---
*Created for the Lumi AI Companion project.*
