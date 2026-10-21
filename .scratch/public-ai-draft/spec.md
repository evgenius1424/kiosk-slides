Status: ready-for-agent

# Public AI draft

## Problem Statement

Kiosk Slides currently lets a local user generate or change a presentation with their own approved ChatGPT plan. Hosted visitors instead copy a prompt to another AI and paste the result back. Hosted ChatGPT approval is not available yet.

The project needs a small, public AI experience for a personal, non-monetized launch. It must create a useful first presentation without exposing an API key, turning a short-lived announcement into an open-ended API bill, or weakening the existing local ChatGPT flow. The work must also split cleanly so a backend phase can be completed and tested before a later agent builds the public UI.

## Solution

Add a server-only free-draft provider that uses Anthropic's Claude API directly. It creates one bounded presentation from a short brief. It is disabled by default, has no public UI in phase 1, and uses a durable Upstash Redis gate before any provider request.

The gate admits at most one request per salted-IP hash each day, 20 admitted requests each UTC day, and a conservative $8 application budget each UTC month. It reserves the worst-case cost for one generation plus one format-repair retry before calling the provider. Anthropic's $10 account limit remains a separate emergency cap. A remote kill switch can stop requests without a Vercel redeploy.

Phase 2 adds the public UI, localized copy, privacy and README updates, a production smoke test, and enablement before the LinkedIn announcement. Until hosted ChatGPT approval exists, ChatGPT remains local-only. When that approval lands, it can become the preferred provider without changing the public fallback controls.

## User Stories

1. As a hosted visitor, I want to turn a short brief into a presentation, so that I can start working without leaving the site.
2. As a hosted visitor, I want the free AI draft to have a clear limit, so that I know what I can expect.
3. As a hosted visitor who already used a free draft today, I want a calm editor and copy-prompt path, so that I can keep making progress.
4. As a hosted visitor whose request cannot run, I want the site to remain useful, so that an AI limit does not block me from making slides.
5. As a hosted visitor, I want the generated presentation to follow the site's Markdown format, so that it renders and downloads correctly.
6. As a hosted visitor, I want a failed format check to receive one repair attempt, so that a temporary model formatting mistake does not spoil my first use.
7. As a hosted visitor, I want the site to reject unsafe model-supplied links and images, so that a free draft does not introduce unreviewed external content.
8. As a hosted visitor, I want the site to send my brief only when I choose the optional AI draft, so that ordinary editing remains local to my browser.
9. As a hosted visitor, I want the service not to retain my brief or generated presentation, so that I can try the feature without creating a server-side presentation record.
10. As a local user with an approved ChatGPT plan, I want my existing AI workflow to keep working, so that the public fallback does not change the workflow I already use.
11. As a project owner, I want one small public allowance per browser and network identity, so that casual repeat use does not consume the whole monthly budget.
12. As a project owner, I want concurrent requests to observe one shared allowance, so that parallel browser requests cannot bypass the limits.
13. As a project owner, I want a lower application budget than the provider account limit, so that the application normally stops before the provider emergency limit.
14. As a project owner, I want a daily cap, so that a sudden burst cannot spend the monthly allowance in a few hours.
15. As a project owner, I want to turn off paid generation from the counter service, so that I can react to abuse or a bad prompt without deploying again.
16. As a project owner, I want provider names, model versions, API keys, and spending rules to stay on the server, so that visitors cannot select a more expensive path or recover credentials.
17. As a project owner, I want anonymous aggregate counters and costs, so that I can judge usage without collecting briefs, presentation content, raw IP addresses, or cross-site analytics.
18. As a project owner, I want provider errors to consume the admitted attempt after a request starts, so that uncertain billing outcomes cannot trigger unbounded retries.
19. As a project owner, I want a disabled-by-default backend phase, so that a later UI implementation does not need to make billing and abuse-prevention decisions.
20. As a future UI implementer, I want one documented fallback-generation contract, so that I can build the public experience without learning Redis or provider internals.
21. As a future UI implementer, I want distinct outcomes for disabled, already-used, capacity-limited, invalid-output, and provider-failure states, so that each state can lead to the agreed editor and copy-prompt experience.
22. As a project owner, I want one real production smoke test before the announcement, so that missing environment configuration and provider access appear before visitors arrive.
23. As a reader of the announcement, I want the product to describe this as a limited free AI draft, so that the public promise matches the operating budget.
24. As a project owner, I want a pinned model version and a deliberate upgrade step, so that a provider alias does not change presentation quality or cost without review.

## Implementation Decisions

- Deliver the work in two phases. Phase 1 includes only the server-side fallback, configuration, durable controls, and tests. It adds no public UI and leaves the feature disabled. Phase 2 adds the public UI, localized strings, product copy, privacy disclosure, README updates, production smoke test, and enablement.
- Keep the current approved ChatGPT implementation local-only until hosted approval is available. Do not expose hosted ChatGPT sign-in or plan controls in phase 1 or phase 2. Design the server-side generation boundary so an approved hosted ChatGPT provider can later take precedence over the free-draft provider.
- Add one internal presentation-generation boundary. The caller supplies a bounded public brief and receives a typed outcome for a presentation, a limit state, an invalid result, or a provider failure. The browser never supplies a provider, model name, or cost setting.
- Call Anthropic directly. Use a pinned current Claude Haiku model version set in server configuration. Keep an explicit model-response compatibility check so a version change is deliberate.
- Keep the public request narrow. It accepts one non-empty brief of at most 1,500 characters and produces at most 10 slides. It has fixed input and output token limits, no conversation history, no existing presentation source, no slide actions, no tools, no browsing, and no image generation.
- Give the free-draft provider a compact prompt and format contract. Do not reuse the local ChatGPT chat loop, its large input limits, or its quality-polish retries.
- Validate every provider result through the existing presentation parser. The first invalid result receives one repair prompt that asks only for valid presentation Markdown. The repair may run only after parser validation fails. It must not run after a timeout, abort, provider error, safety refusal, or client cancellation.
- Reserve the maximum cost of both permitted attempts before the first provider call. After a provider call begins, retain the reservation even if the result fails. Record actual aggregate usage when the provider reports it, but never let actual-cost accounting decide whether to admit a request.
- Reject model-supplied external links and image widgets in the free-draft result. The model generates a self-contained text-and-layout presentation at launch. The existing parser and renderer remain the authority for safe Markdown rendering.
- Use a single-region Upstash Redis database through its HTTPS interface. Store only expiring salted-IP hashes, daily counters, monthly budget reservations, a remote enabled value, and anonymous aggregate outcomes. Do not store raw IP addresses, user briefs, generated presentations, ChatGPT data, or provider credentials.
- Derive the per-visitor key from the hosting platform's forwarded client address and a server-only salt. Treat a missing or malformed address as ineligible for paid generation rather than falling back to a shared value.
- Make one atomic durable admission operation check and update all controls together: remote enabled state, daily per-hash limit, daily global limit, and the UTC-monthly reserve. The operation returns an outcome without leaking internal counter values.
- Admit at most one request for a salted-IP hash per rolling 24-hour period. Admit at most 20 free-draft attempts per UTC day. Count a request when the gate admits it, even if the provider later fails. Reset the $8 application reserve at the start of each UTC calendar month.
- Configure Anthropic's account-level limit at $10. This is an emergency cap, not the normal control. The application reserve uses $8 to leave room for accounting delay and configuration mistakes.
- Fail closed for every durable-control error. If the counter service is unavailable, do not call Anthropic. Return the normal fallback outcome without exposing operational details.
- Provide two independent disable controls. A deployment configuration switch keeps the feature off by default. A remotely changeable Redis value is the emergency kill switch while the route is live.
- Keep credentials in Vercel server environment variables only. Use separate secrets for the Anthropic key, Upstash access, and IP-hash salt. Do not send any of them to the browser, write them to logs, or expose them in errors.
- Record only anonymous operational measures: admitted, blocked, invalid, provider-failed, and successful free-draft attempts; aggregate provider token use; and reserved and actual aggregate cost. The records must not include brief text, presentation text, raw IP addresses, or cross-site tracking identifiers.
- Define the later UI states now, even though phase 1 does not render them. A visitor who has used the daily allowance, encounters the global cap, sees the feature disabled, gets invalid output, or hits a provider failure returns to the editor with the agreed copy-prompt option. The normal limit copy is: "You've used today's free AI draft. Keep editing here, or copy the prompt to use your preferred AI."
- In phase 2, label the feature "free AI draft" and disclose that optional generation sends the brief to Anthropic. Remove or revise claims that conflict with this path, including unconditional statements about offline behavior, no server contact, or no cost. The LinkedIn announcement must not promise unlimited or permanent free AI.
- Before enabling the public UI, deploy phase 1 with paid generation disabled. Enable it only for a real end-to-end smoke test using the production Vercel, Upstash, and Anthropic configuration. Check the counters and provider billing dashboard, then enable it shortly before the announcement. Keep the remote kill switch available after launch.

## Testing Decisions

- Test the public fallback-generation route as the highest existing seam. Drive it through its request-to-outcome contract with in-memory provider and durable-control boundaries. Do not test Anthropic or Upstash implementation details through network calls.
- Reuse the existing presentation parser as the behavior oracle for valid generated Markdown. A good generation test proves that the route returns a renderable presentation, not that a prompt contains particular wording.
- Cover a valid first attempt, an invalid first attempt followed by one valid repair, and invalid output after the permitted repair. Assert that the route never performs more than two provider attempts.
- Cover malformed and oversized briefs before admission. These must make no durable-counter change and no provider call.
- Cover disabled, missing client identity, already-used per-hash allowance, daily global allowance, and monthly budget reserve. Assert that each produces the documented public outcome and makes no provider call.
- Cover concurrent requests with the same per-hash identity and with different identities near the daily and monthly limits. Assert that the atomic gate admits no more than the configured allowance.
- Cover durable-control failure. Assert that the route fails closed and never calls the provider.
- Cover provider timeout, cancellation, refusal, and error. Assert that the route does not make a repair call or refund the admitted allowance after provider work starts.
- Cover model output containing an external link or image widget. Assert that the route rejects it and does not return a presentation.
- Cover response and browser boundaries. Assert that API responses, client configuration, logs exposed to tests, and generated presentation content contain no provider credential, Upstash credential, or IP-hash salt.
- Keep the current local ChatGPT route and its tests unchanged in phase 1. Extend the existing hosted start-screen and slide-action tests in phase 2 to prove the public states reach the editor and copy-prompt path.
- Run the repository's full check, production build, and skills build before the phase-1 handoff. Phase 2 also checks localization and product-copy tests after the UI and documentation change.

## Out of Scope

- Hosted ChatGPT approval, hosted ChatGPT sign-in, and use of a visitor's ChatGPT plan.
- Conversational follow-ups, presentation rewrites, slide actions, or generation from an existing presentation in the free route.
- Accounts, email collection, CAPTCHA, payment collection, subscriptions, or monetization.
- A model gateway, multiple public model choices, model switching in the browser, or provider fallbacks.
- Image search, image generation, external image embedding, arbitrary external links, or a URL allowlist for free drafts.
- Persistent storage, sharing, analytics, or moderation of visitor briefs and generated presentations.
- Refund logic after a provider call, multi-region quota replication, and a full fraud-detection system.
- Changes to the Markdown presentation format.

## Further Notes

This is a personal, non-monetized launch. Vercel Hobby permits personal non-commercial use only. Move to an appropriate paid hosting plan before using the project commercially, serving client work, or charging users.

The user supplies the Anthropic account and funds it with $10. The application must remain useful when the free-draft route is unavailable because the editor and copy-prompt workflow are part of the product, not an error screen.

The phase-1 backend contract is deliberately stable before the UI handoff. A phase-2 implementer may change presentation and copy details, but must not weaken the provider, privacy, retry, quota, budget, or kill-switch decisions without a new spec decision.
