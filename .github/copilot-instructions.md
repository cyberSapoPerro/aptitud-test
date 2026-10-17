# Copilot instructions

## Project overview

This is a small client-side aptitude-test application built with Bun, Vite, and TypeScript. The browser entry point is `index.html`, which loads `src/main.ts`; Vite bundles the TypeScript and CSS, and there is no server or backend.

The application currently imports `src/data/reasoning-questions.json` directly from `src/main.ts`. Each question has a `statement`, an `options` array, and an integer `answer` index. `main.ts` validates that shape at startup, shuffles the question order, renders the current screen into `#app`, manages the countdown and answer state, and renders the final score and response-time summary. `src/style.css` contains the presentation for all of those generated views. Other JSON files under `src/data/` are available datasets but are not selected by the current entry point.

## Commands

Use Bun, as documented in `README.md`:

```bash
bun install
bun run dev       # Start the Vite development server
bun run build     # Run TypeScript checking, then create the production bundle
bun run preview   # Serve the built bundle locally
```

There is no configured test runner, test suite, or lint script, so there is no single-test command. For focused validation, use `bun run dev` and exercise the relevant question/timer flow in the browser; use `bun run build` to catch TypeScript and production-bundling errors.

## Implementation conventions

- Keep the current browser-only architecture: UI state lives in `src/main.ts`, and screens are rendered by replacing `#app.innerHTML` and then attaching event listeners to the new elements.
- Preserve the question data contract (`statement`, `options`, zero-based numeric `answer`). Invalid answer indices are intentionally rejected before the test starts.
- Treat `questionOrder` as the randomized presentation order, while score and response-time reporting use the original question indices. Changes to navigation or reporting need to preserve that distinction.
- The timer is global across the whole test, not per question. Answer selection pauses it; moving to the next question resumes it. Timer changes must keep `remainingTime`, `questionActiveSince`, and `timerInterval` consistent and must not update a finished test.
- Keep answer buttons disabled after selection and reveal the correct/incorrect state before enabling the navigation button.
- Add or change question content in the JSON datasets rather than hard-coding it in the renderer. If a different dataset should be active, change the JSON import in `src/main.ts` and keep the same question shape.
- TypeScript is bundled in Vite/bundler mode with `noEmit`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and `noFallthroughCasesInSwitch`; keep new code compatible with those compiler checks.
- The visible application text is currently Spanish. Keep user-facing copy consistent with that language unless the feature explicitly introduces localization.
