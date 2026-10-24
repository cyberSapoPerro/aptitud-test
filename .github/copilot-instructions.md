# Copilot instructions

## Project overview

This is a browser-only aptitude-test application built with Bun, Vite, and TypeScript; there is no server or backend. `index.html` provides the `#app` mount point and loads `src/main.ts`, while Vite bundles the TypeScript and CSS for the static site.

`src/main.ts` is the application controller and UI layer. It imports four JSON question banks from `src/data/`, validates them at startup, defines the four test sections, randomizes question presentation, renders each screen into `#app`, manages section timing and answer state, calculates section statistics, and generates the downloadable JSON results. `src/style.css` styles the generated start, section-intro, question, and results screens. `public/` contains static assets copied to the site root; `dist/` is generated output and should not be edited as source.

## Commands

Use Bun, as documented in `README.md`:

```bash
bun install
bun run dev       # Start the Vite development server
bun run build     # Run TypeScript checking, then create the production bundle
bun run preview   # Serve the built bundle locally
```

There is no configured test runner, test suite, lint script, or single-test command. For focused validation, run `bun run dev` and exercise the affected screen or section in the browser. Use `bun run build` to catch TypeScript and production-bundling errors.

## Architecture and data flow

- The test is a four-section flow: reasoning, numerical speed, perceptual speed, and word meaning. Each section uses its own imported JSON bank and has a two-minute time limit.
- `sections` is the source of truth for section IDs, titles, descriptions, and question arrays. Do not duplicate that mapping in the renderer.
- `questionOrder` contains shuffled indexes for presentation only. Results, fallback unanswered records, and downloaded output use the original question indexes.
- A section timer is paused while the user reviews an answer and resumed when advancing. `remainingTime`, `sectionActiveSince`, and `timerInterval` must stay consistent; timer callbacks must not update a finished test.
- `questionResults` stores answered questions by section and original question index. Unanswered questions are added as incorrect with `timeMs: null` when the final results are built.
- Screens are rendered by replacing `#app.innerHTML`; event listeners must be attached after each render to the newly created elements.

## Implementation conventions

- Preserve the question data contract: each JSON item has a non-empty `statement`, an `options` array, and a zero-based integer `answer` within that array. Keep validation aligned with this contract.
- Add or change question content in the JSON files under `src/data/`, not in the renderer. If a dataset or section changes, update the relevant import and `sections` entry while retaining the same shape.
- Keep answer buttons disabled after selection, show the correct/incorrect state, and only then enable the navigation button.
- Keep result fields compatible with the download format: `id`, `section`, `correct`, and nullable `timeMs`.
- User-facing copy is Spanish. Keep new visible text in Spanish unless the feature explicitly introduces localization.
- TypeScript uses Vite bundler mode with `noEmit`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and `noFallthroughCasesInSwitch`; new code must satisfy these compiler checks.
