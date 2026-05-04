# Hosting Comparison

## Recommendation
Use `Vercel` for the first public release.

Why:
- best fit for `Next.js 16`
- lower operational friction for previews and production
- simpler environment variable management
- easier release loop while the product is still evolving

Keep `Firebase App Hosting` as the secondary option if later you want a stronger Google-centric deployment story.

## Vercel
### Pros
- native Next.js support
- fast preview deployments
- simple env var and domain setup
- lower implementation risk for current architecture

### Cons
- less aligned if you later want everything centered in Firebase/GCP
- can become less cost-efficient than a more custom setup at larger scale

## Firebase App Hosting
### Pros
- good long-term fit if you want a Google platform footprint
- can coexist well with other GCP services later
- modern path for hosting Next-style apps in Firebase

### Cons
- more setup uncertainty than Vercel for this codebase today
- higher integration friction for the first release
- weaker day-one ergonomics for rapid preview/release loops

## Decision for this repo
- First release target: `Vercel`
- Secondary documented path: `Firebase App Hosting`
