---
name: Sphere Prism
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#424754'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#924700'
  on-tertiary: '#ffffff'
  tertiary-container: '#b75b00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: '0'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style
The design system transitions from a dense, nocturnal aesthetic to one of clarity, luminosity, and precision. It targets high-performance professional environments where cognitive load must be minimized. The brand personality is clinical yet sophisticated, evoking the feeling of a well-lit, high-tech laboratory or a premium architectural studio.

The design style is **Modern Corporate** with a heavy emphasis on **Minimalism**. It utilizes expansive white space, razor-sharp typography, and subtle tonal shifts to define hierarchy. The emotional response is one of organized efficiency, transparency, and technical reliability.

## Colors
The palette is anchored by a pure `#ffffff` base to maximize light reflectance and perceived space. Secondary surfaces use a very light grey (`#f8fafc`) to create logical containment without introducing visual weight. 

Text follows a strict hierarchy using Charcoal (`#1e293b`) for primary content to ensure AAA accessibility and Slate (`#64748b`) for supporting metadata. The vibrant blue accent (`#3b82f6`) is used sparingly for primary actions, progress indicators, and active states, providing a singular point of focus against the neutral backdrop.

## Typography
This design system utilizes Geist for its entire typographic scale to maintain a technical, mono-linear aesthetic. The typeface's generous x-height and geometric construction provide exceptional legibility in light mode.

Headlines should utilize tighter letter-spacing and heavier weights to anchor pages. Body text maintains standard spacing for maximum readability. Labels and "overlines" use increased letter-spacing and uppercase styling to differentiate functional UI elements from narrative content.

## Layout & Spacing
The layout relies on a rigorous 8pt grid system. On desktop, a 12-column fluid grid is used within a max-width container of 1280px. Gutters are fixed at 24px to provide significant breathing room between modules.

For mobile, the layout collapses to a single column with 16px side margins. Spacing between vertical sections should be generous (using `xl` or `40px` units) to reinforce the minimalist, premium feel. Content should never feel crowded; when in doubt, increase the white space.

## Elevation & Depth
Depth is communicated through **Ambient Shadows** rather than glows or heavy borders. Surfaces are tiered using the following logic:

- **Level 0 (Base):** Pure white background.
- **Level 1 (Cards/Sections):** Subtle 1px border in `#e2e8f0` or a very soft shadow (0px 1px 3px rgba(0,0,0,0.05)).
- **Level 2 (Dropdowns/Modals):** More pronounced, diffused shadow (0px 10px 15px -3px rgba(0,0,0,0.08)).
- **Interactive States:** On hover, elements may slightly lift (increase shadow spread) or shift to a subtly darker surface tint (`#f1f5f9`).

## Shapes
The shape language is defined by the "Round Eight" philosophy. All standard components—including buttons, input fields, and cards—utilize a 0.5rem (8px) corner radius. This provides a balance between the precision of hard angles and the approachability of organic curves. 

Large containers or modals may scale up to `rounded-xl` (1.5rem/24px) to soften the overall interface composition.

## Components
- **Buttons:** Primary buttons are solid Blue (`#3b82f6`) with white text. Secondary buttons use a white background with a Slate border and Charcoal text. Use 8px padding-x for a compact, technical look.
- **Input Fields:** Use a white fill with a 1px border in `#e2e8f0`. On focus, the border transitions to Blue (`#3b82f6`) with a subtle 2px outer blue ring at 20% opacity.
- **Chips/Tags:** Small, low-contrast elements with a `#f1f5f9` background and `#64748b` text. Corner radius should be consistent at 8px.
- **Cards:** Cards should be borderless with a Level 1 shadow on the pure white base, or bordered with no shadow when placed on a `#f8fafc` surface.
- **Lists:** Use subtle `#e2e8f0` horizontal dividers. Hover states for list items should use a `#f8fafc` background fill.
- **Progress Bars:** Thin 4px tracks in `#f1f5f9` with a solid Blue (`#3b82f6`) indicator.