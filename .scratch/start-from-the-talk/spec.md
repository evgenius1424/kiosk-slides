# Spec: start from the talk

Status: ready-for-agent
Blocked by: paste-anywhere (for the hosted flow)
Track: B (editor), step 3

## Problem

A first visit opens on the example presentation, which shows the result but not how to make your own. On the hosted site, the way in is Edit, Help, Copy prompt, then go to an AI, come back, paste and update. The prompt also doesn't know the topic, so the AI's first reply is often questions.

## Decision

A start screen that asks one question: **What's your talk about?**

- **When it shows:** first visit (empty library) and New presentation. Returning visitors land on their last presentation as today. Links at the bottom: "See an example" (opens the example presentation) and "Start blank".
- **Inputs:** one large text box, plus two optional chip rows:
  - Audience: My team, Leadership, Customers, A class, A public screen.
  - Length: Short (5), Standard (8), Long (12).
- **Starters:** Pitch, Weekly update, All-hands, Lesson, Onboarding, Lobby loop. Picking one fills the box with an editable sentence, for example "A pitch for … to … The ask is …".
- **Action depends on where it runs:**
  - Local and signed in: **Make slides** sends the request to Ask AI as the first message and switches to the Ask AI tab, which streams as today.
  - Local, not signed in: **Continue with ChatGPT**, with **Copy prompt** as the second option.
  - Hosted: **Copy prompt** builds the copy prompt with the topic, audience and length appended as the user's request. The screen then says "Paste the answer anywhere on this page", which relies on `paste-anywhere`.
  - If OpenAI later approves the hosted flow, flip the hosted case to the local signed-in behavior. No other change is needed.
- **Prompt:** extend `copyPrompt()` in `lib/chat-prompt.ts` with an optional request, and keep the chat route's suggestions in sync with the starters. The starter sentences live in `messages/en.json`.
- Copy follows the plain-copy rules: no brand or tech names except "ChatGPT" where sign-in needs it.

## Acceptance

- [ ] A fresh browser (cleared storage) opens on the start screen, not the example.
- [ ] On the hosted build, typing a topic and pressing Copy prompt puts a prompt ending in that topic on the clipboard. Pasting the AI's answer creates the presentation.
- [ ] Locally signed in, Make slides starts a chat that produces a new presentation.
- [ ] See an example and Start blank work, and New presentation in the menu opens the start screen.
- [ ] Tests cover the prompt builder with and without audience and length.

## Out of scope

Templates as finished presentations (starters are sentences for the AI), and any hosted AI calls.
