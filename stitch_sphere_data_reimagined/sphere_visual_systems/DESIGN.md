---
name: Sphere Visual Systems
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#4fdbc8'
  on-tertiary: '#003731'
  tertiary-container: '#00a392'
  on-tertiary-container: '#00302a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#71f8e4'
  tertiary-fixed-dim: '#4fdbc8'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005048'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

The design system is engineered for high-performance data storytelling, blending the precision of developer-centric tools with the polished aesthetics of premium consumer hardware. The personality is "Quiet Authority"—it stays out of the way until a data point requires focus.

The style is a fusion of **Modern Minimalism** and **Refined Glassmorphism**. It utilizes deep obsidian surfaces to provide a high-contrast stage for vibrant data accents. Visual interest is generated through light—not weight—using subtle border glows, backdrop blurs, and precise typography to create a sense of infinite depth and speed. This is a technical environment that feels creative, avoiding the density of legacy BI tools in favor of expansive whitespace and a clear visual hierarchy.

## Colors

The palette is anchored by **Obsidian (#0A0A0B)** to maximize contrast and reduce eye strain during deep work. 

- **Primary (Electric Blue):** Used for primary actions, active states, and the dominant data series.
- **Secondary (Neon Purple):** Used for secondary data series and premium feature highlights.
- **Tertiary (Soft Teal):** Used for success states and comparative data overlays.
- **Neutrals:** Text scales from pure white for headers to Zinc-400 (#A1A1AA) for secondary metadata. Borders should remain translucent to allow the dark background to feel continuous.

## Typography

This design system utilizes **Geist** for its systematic, technical feel that remains legible at all sizes. It is paired with **JetBrains Mono** for technical labels, data values, and metadata to reinforce the "instrument cluster" aesthetic.

Type scales are aggressive to create clear entry points. Large displays use tight tracking (-0.02em) to feel "machined" and precise. Use `label-caps` for table headers and chart legends to distinguish them from narrative text.

## Layout & Spacing

The layout employs a **4px baseline grid** to ensure mathematical alignment across complex data dashboards. 

- **Desktop:** 12-column fluid grid with 24px gutters. Dashboard widgets should typically span 3, 4, 6, or 12 columns.
- **Margins:** Use wide 40px - 64px external margins on desktop to create a "gallery" feel for the data.
- **Reflow:** On mobile, the grid collapses to 1 column with 16px margins.
- **Whitespace:** Prioritize vertical spacing between sections to prevent "information density fatigue." Use `lg` (40px) or `xl` (64px) for section headers.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** and **Glassmorphism**, rather than traditional heavy shadows.

- **Level 0 (Background):** Pure #0A0A0B.
- **Level 1 (Cards/Widgets):** Semi-transparent background (rgba(255, 255, 255, 0.03)) with a `16px` backdrop-blur. 
- **Borders:** Every elevated element must have a 1px solid border using `rgba(255, 255, 255, 0.08)`. For active states, the border can transition to a primary color gradient.
- **Shadows:** Use a single, ultra-soft "Ambient Glow"—0px 8px 32px rgba(0, 0, 0, 0.8)—to lift cards off the background.

## Shapes

The shape language is "Soft Geometric." 

- **Standard Radius:** 8px (`rounded-md`) for buttons, input fields, and small UI elements.
- **Container Radius:** 16px (`rounded-lg`) for primary data cards and modals.
- **Interactive States:** Use a slight 2px border-radius increase on hover for buttons to provide tactile feedback.
- **Data Points:** In charts, use circular nodes for scatter plots and slightly rounded caps for bar charts to soften the technical edge.

## Components

- **Buttons:** Primary buttons use a solid Electric Blue with white text. Secondary buttons use the glass style (blur + subtle border) with no background fill.
- **Data Cards:** These are the core of the design system. They must include a `label-caps` header, a primary value in `headline-lg`, and a glassmorphic background.
- **Inputs:** Dark backgrounds with 1px borders. The focus state should illuminate the border and add a subtle outer glow (0px 0px 8px) of the primary color.
- **Chips:** Small, pill-shaped indicators with high-saturation backgrounds at 10% opacity and 100% opacity text.
- **Charts:** Use a 2px stroke width for line charts. Apply a subtle gradient fill below lines to add volume.
- **Navigation:** A slim, vertical sidebar using `blur(20px)` and icons with 1.5pt stroke weight.