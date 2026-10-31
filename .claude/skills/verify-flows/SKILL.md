---
name: verify-flows
description: Model-check Kiosk Slides' risky user flows with TLA+ (specs/, pnpm check:flows). Use before merging any change to saved presentations, two-tab sync, settings, last style, Undo and Redo, notices with Undo, the player, the wake lock or the free AI draft.
---

# Verify the user flows

`specs/` holds one TLA+ model per risky flow. Each model is a small copy of what the code does, plus the promise it makes to the person using the site, and TLC checks every order of steps up to the bounds below. A test checks the orders someone thought of; the models check all of them.

## Does your change touch a model?

Look up every file you changed in the coverage table. If a function you changed is listed, or your new code writes the same state (the library in `localStorage`, the open presentation's source, the undo history, the player's index, the wake lock, the AI draft gate), the model needs a look in the same change.

**Library**: once every tab has saved and heard the others, each presentation holds the last thing some tab did to it (`NothingLost`), and every tab shows what is saved (`TabsAgree`). Harm: two open tabs erase each other's presentations. Code: the save effect and storage listener in `use-library.ts`; `mergeLibrary`, `saveLibrary` and `refreshLibrary` in `lib/presentations.ts`. Bounds: 2 tabs, 2 presentations, 4 changes.

**Settings**: once no font is loading, every presentation is what the person made it (`NothingLostOrMixedUp`), and new presentations start in the style chosen last (`LastStyleIsLastChoice`). Harm: a font pick lands in another presentation, or opening a share link overwrites the open presentation. Code: `set` and `setFont` in `settings-panel.tsx`; `load-fonts.ts`; `lib/last-style.ts`; the first load, `paste` and `keep` in `use-library.ts`. Bounds: 3 presentations, 6 steps.

**Undo**: Undo, from the keyboard or a notice, takes back the latest change of the open presentation, and Redo puts it back (`UndoTakesBackOneChange`). Harm: Undo loses typed text, or changes a presentation the person is not looking at. Code: `changeSource`, `undo`, `redo`, `undoAction` and `tidy` in `kiosk-workspace.tsx`; `use-versions.ts`; `addVersion` and `takeVersion` in `lib/history.ts`; the notice timeout in `toast.tsx`. Bounds: 2 presentations, 6 steps.

**Player**: the arrows always move one slide from the slide on screen (`ArrowsMoveOne`), and without Loop autoplay only goes forward and stops on the last slide (`AutoplayForward`). Harm: arrows skip slides after slides are deleted. Code: `playerReducer` and the autoplay timer in `use-player.ts`. Bounds: up to 4 slides.

**WakeLock**: the hook holds at most one lock (`OneLock`), and none once presenting and autoplay stop (`NoLeftoverLock`). Harm: the screen stays awake after presenting. Code: `components/use-wake-lock.ts`. Bounds: 4 requests.

**AiDraft**: the daily limit, the monthly budget, one presentation per visitor per day (a failed draft gives the visitor's try back) and the off switch hold (`DailyCap`, `BudgetCap`, `OnePerVisitorPerDay`, `OnlyWhenOn`), and nobody spends their draft without seeing it (`NoSilentlyUsedDraft`). Harm: over-spending, or a visitor loses the day's draft. Code: the Lua script in `lib/ai-draft/gate.ts`, `lib/ai-draft/server.ts`, and `makeDraft` with the Escape, paste and button holds in `start-screen.tsx`. Bounds: 3 visitors, 2.5 days, a daily limit of 2.

Last confirmed against the code at commit `4e7023f` (Let Undo take back Clean up), together with the notice Undo fix that added the `Undo` model. Move this commit forward only after you have read every change to the covered code since it and confirmed each model still describes it.

Not covered: the undo history shared between two tabs through `localStorage` (each tab writes its own copy over the other's), Ask AI replies, slide AI actions (behind `SLIDE_AI`), the offline service worker, downloads, and anything a model leaves out of its comment at the top.

## Run

```sh
pnpm check:flows          # every model
pnpm check:flows Undo     # one model and its Before configs
VERBOSE=1 pnpm check:flows Undo
```

It needs Java 11 or later. The first run downloads `tla2tools.jar` 1.8.0 into `node_modules/.cache/tla`. Every model runs in under a minute.

`<Name>.cfg` checks the current code and must hold. Each `<Name>Before*.cfg` replays a bug that was fixed, through the model's `Fixed` constant, and must still fail: that proves the property can fail. `✗` on either kind fails the run.

## Read a failure

Read the counterexample with the pstack `/statechart` skill by Lauren Tan (cursor/plugins, mirrored at backnotprop/pstack). It tells the shortest path to the broken rule in plain words and draws the flow when the rule holds. Without it, run with `VERBOSE=1` and read TLC's trace state by state.

Then replay the path against the real code, one action per step:

- **A step cannot happen in the code.** The model is wrong. Fix the model to match the code and say what was wrong.
- **Every step can happen.** It is a bug. Write a failing test that walks the same steps (most flows have one in `components/workspace/flows.test.tsx`, `settings.test.tsx` or `use-player.test.tsx`), fix the code, add the fix to the model behind `Fixed`, and keep a `<Name>Before<Bug>.cfg` that leaves it out.

Never weaken an invariant or shrink the model to make it pass.

## Update a model

Write the update from the code before you rerun. One React event handler or one effect run is one TLA+ action; an `await` splits it in two. Change a promise only when the change is intended, and say where that is shown (the commit, the tests, the PR). After a model passes, break the code the way the property guards against, in the model or in a scratch edit, and confirm the check catches it. Then update the coverage table and the sync commit above.

For drift that built up across many commits, use pstack's `/maintain-formal-verification-skill`. For a new flow, use `/create-formal-verification-skill`.
