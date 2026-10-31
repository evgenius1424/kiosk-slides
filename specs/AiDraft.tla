---------------------------- MODULE AiDraft -----------------------------
\* The free AI draft: the start screen asks, the server's Redis gate admits or
\* refuses in one atomic script, then the model writes the presentation
\* (lib/ai-draft/gate.ts, lib/ai-draft/server.ts, components/start-screen.tsx).
\* Time moves in half days; a toy month is two days.

EXTENDS Integers, FiniteSets

CONSTANTS Visitors, DailyLimit, Budget, Reserve, MaxTime, Fixed

VARIABLES now, enabled, usedAt, perDay, reserved, drafts, screen, server, lost

vars == <<now, enabled, usedAt, perDay, reserved, drafts, screen, server, lost>>

Never == -10
Day(t) == t \div 2
Month(t) == t \div 4

Init ==
  /\ now = 0
  /\ enabled = TRUE
  /\ usedAt = [v \in Visitors |-> Never]
  /\ perDay = [d \in 0..Day(MaxTime) |-> 0]
  /\ reserved = [m \in 0..Month(MaxTime) |-> 0]
  /\ drafts = {}
  /\ screen = [v \in Visitors |-> "form"]
  /\ server = [v \in Visitors |-> "idle"]
  /\ lost = FALSE

Tick == now < MaxTime /\ now' = now + 1
  /\ UNCHANGED <<enabled, usedAt, perDay, reserved, drafts, screen, server, lost>>

KillSwitch == enabled' = ~enabled
  /\ UNCHANGED <<now, usedAt, perDay, reserved, drafts, screen, server, lost>>

Ask(v) ==
  /\ screen[v] = "form" /\ server[v] = "idle"
  /\ screen' = [screen EXCEPT ![v] = "waiting"]
  /\ server' = [server EXCEPT ![v] = "gate"]
  /\ UNCHANGED <<now, enabled, usedAt, perDay, reserved, drafts, lost>>

Refuse(v) ==
  /\ server' = [server EXCEPT ![v] = "idle"]
  /\ screen' = IF screen[v] = "waiting" THEN [screen EXCEPT ![v] = "note"] ELSE screen
  /\ UNCHANGED <<usedAt, perDay, reserved>>

\* The Lua script: every check before any write.
Gate(v) ==
  /\ server[v] = "gate"
  /\ IF /\ enabled
        /\ now - usedAt[v] >= 2
        /\ perDay[Day(now)] < DailyLimit
        /\ reserved[Month(now)] + Reserve <= Budget
       THEN /\ usedAt' = [usedAt EXCEPT ![v] = now]
            /\ perDay' = [perDay EXCEPT ![Day(now)] = @ + 1]
            /\ reserved' = [reserved EXCEPT ![Month(now)] = @ + Reserve]
            /\ server' = [server EXCEPT ![v] = "writing"]
            /\ UNCHANGED screen
       ELSE Refuse(v)
  /\ UNCHANGED <<now, enabled, drafts, lost>>

\* A closed start screen never hears back.
Reply(v) ==
  /\ server' = [server EXCEPT ![v] = "idle"]
  /\ screen' = IF screen[v] = "waiting" THEN [screen EXCEPT ![v] = "done"] ELSE screen
  /\ lost' = (lost \/ screen[v] # "waiting")
  /\ UNCHANGED <<now, enabled, perDay, reserved>>

\* A presentation the visitor gets: the day's draft is spent.
Succeed(v) ==
  /\ server[v] = "writing"
  /\ drafts' = drafts \cup {<<v, usedAt[v]>>}
  /\ Reply(v)
  /\ UNCHANGED usedAt

\* A failed check after the repair, a provider error or a crash: the gate
\* deletes the visitor's key so they can try again. The day's count and the
\* month's reserve stay spent.
Fail(v) ==
  /\ server[v] = "writing"
  /\ usedAt' = [usedAt EXCEPT ![v] = Never]
  /\ Reply(v)
  /\ UNCHANGED drafts

\* Back to my presentation, Escape, or pasting a presentation. Fixed: not
\* while the draft is being written.
Close(v) ==
  /\ screen[v] \in {"form", "note", "done"} \/ (screen[v] = "waiting" /\ ~Fixed)
  /\ screen' = [screen EXCEPT ![v] = "closed"]
  /\ UNCHANGED <<now, enabled, usedAt, perDay, reserved, drafts, server, lost>>

Reopen(v) ==
  /\ screen[v] = "closed"
  /\ screen' = [screen EXCEPT ![v] = "form"]
  /\ UNCHANGED <<now, enabled, usedAt, perDay, reserved, drafts, server, lost>>

Next ==
  \/ Tick \/ KillSwitch
  \/ \E v \in Visitors : Ask(v) \/ Gate(v) \/ Succeed(v) \/ Fail(v) \/ Close(v) \/ Reopen(v)

Spec == Init /\ [][Next]_vars

DailyCap == \A d \in DOMAIN perDay : perDay[d] <= DailyLimit

BudgetCap == \A m \in DOMAIN reserved : reserved[m] <= Budget

\* One presentation per visitor per day, counted by when the gate admitted it.
OnePerVisitorPerDay ==
  \A a, b \in drafts : a # b /\ a[1] = b[1] => a[2] - b[2] >= 2 \/ b[2] - a[2] >= 2

OnlyWhenOn == [][\A v \in Visitors : Gate(v) /\ server'[v] = "writing" => enabled]_vars

\* Nobody spends their free draft without seeing what came of it.
NoSilentlyUsedDraft == ~lost
=============================================================================
