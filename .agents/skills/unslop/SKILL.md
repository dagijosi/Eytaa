---
name: unslop
description: Transform generic, AI-generated UI designs into intentional, production-grade interfaces with distinct product character.
---

# Unslop UI Design System & Audit Workflow

Based on [heydamir/unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky.

## Core Objective
Strip away "vibecoded" AI slop—generic purple gradients, ambient blur blobs, random emoji badges, shouty marketing copy, bouncy hover scaling, and cookie-cutter cards—and replace them with an intentional, cohesive design language suited to the specific product and platform.

---

## 1. The Anti-Pattern Checklist (What to Kill)
- ❌ Ambient glowing halos / blur balls (`blur-3xl`, `bg-purple-500/20`, `-translate-y-12` background fog)
- ❌ Gradient text (`bg-clip-text text-transparent bg-gradient-to-r...`)
- ❌ Random emojis used as icons or badges (✨, 🚀, 🔥, 🎬)
- ❌ Cliché marketing buzzwords ("Smart Media Center", "Unlock your entertainment", "Next-gen playback")
- ❌ Disorienting hover scaling on functional desktop elements (`hover:scale-105`, `group-hover:scale-110`)
- ❌ Repetitive glass cards (`bg-white/5 border border-white/10 rounded-2xl` stacked without hierarchy)
- ❌ Inconsistent typography (mixing tracking and uppercase arbitrarily)
- ❌ Unrestrained pulse animations (`animate-pulse`) on non-critical elements

---

## 2. Direction Setting for Eytaa (Desktop Media Player)
- **Product**: Premium desktop media player powered by libmpv + Tauri.
- **Character**: Precision cinema tool (like IINA, Infuse, DaVinci Resolve, QuickTime Pro).
- **Aesthetic**: Deep matte obsidian/neutral surfaces, hairline micro-borders (`border-white/[0.08]`), razor-sharp typography, `tabular-nums` for timecodes/metadata, tactile instant feedback (120–150ms transitions), restrained functional accent highlights.

---

## 3. The 9 Sequential Passes
1. **Spacing**: Enforce strict 4px/8px rhythm; compact functional density for player controls, relaxed breathing room for modals.
2. **Color**: Remove decorative blur halos and color fog; keep accent colors purposeful (scrubber, active toggles).
3. **Icons**: Normalize icon sizing (14–18px), optical alignment, stroke weights (1.75–2px), and eliminate emojis.
4. **Copy**: Quiet, confident, human microcopy ("Media Library", "Resume playback", "Open file").
5. **Typography**: Proper font hierarchy, `tabular-nums` for all numbers and timestamps, remove aggressive uppercase tracking from body text.
6. **Layout & Hierarchy**: Anchor controls, eliminate redundant nested card containers, prioritize the media canvas.
7. **Details**: Fine-tune hairline borders, subtle hover tints (`hover:bg-white/[0.06]`), and clean scrollbars.
8. **Visuals**: Ground media artwork with crisp borders and subtle drop-shadows; remove rainbow edge glow.
9. **Motion**: Replace floaty scale-ups with snappy desktop opacity/tint transitions (`duration-150 ease-out active:scale-[0.98]`).

