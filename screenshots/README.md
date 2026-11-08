# Screenshots

Run `pnpm exec playwright install chromium` once, then `pnpm screenshots` to capture the start screen, preview, settings and editor. The command starts the local site if needed and writes PNGs to `screenshots/generated/`, replacing previous generated images. It uses a fresh browser session, the example presentation, a 1440 × 900 viewport and a 2× pixel scale.

Change the viewport in `playwright.screenshots.config.ts` or the captured screens in `scripts/screenshots/capture.spec.ts` to make other images. If a site is already running on port 3000, the command uses it.
