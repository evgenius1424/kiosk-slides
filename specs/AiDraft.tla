---------------------------- MODULE AiDraft -----------------------------
\* The free AI draft: the start screen asks, the server's Redis gate admits or
\* refuses in one atomic script, then the model writes the presentation
\* (lib/ai-draft/gate.ts, lib/ai-draft/server.ts, components/start-screen.tsx).
\* Time moves in half days; a toy month is two days.

EXTENDS Integers, FiniteSets

CONSTANTS Visitors, DailyLimit, Budget, Reserve, MaxTime, Fixed

VARIABLES now, enabled, usedAt, perDay, reserved, admits, screen, server, lost

vars == <<now, enabled, usedAt, perDay, reserved, admits, screen, server, lost>>

Never == -10
Day(t) == t \div 2
Month(t) == t \div 4

Init ==
  /\ now = 0
  /\ enabled = TRUE
  /\ usedAt = [v \in Visitors |-> Never]
  /\ perDay = [d \in 0..Day(MaxTime) |-> 0]
  /\ reserved = [m \in 0..Month(MaxTime) |-> 0]
  /\ admits = {}
  /\ screen = [v \in Visitors |-> "form"]
  /\ server = [v \in Visitors |-> "idle"]
  /\ lost = FALSE

Tick == now < MaxTime /\ now' = now + 1
  /\ UNCHANGED <<enabled, usedAt, perDay, reserved, admits, screen, server, lost>>

KillSwitch == enabled' = ~enabled
  /\ UNCHANGED <<now, usedAt, perDay, reserved, admits, screen, server, lost>>

Ask(v) ==
  /\ screen[v] = "form" /\ server[v] = "idle"
  /\ screen' = [screen EXCEPT ![v] = "waiting"]
  /\ server' = [server EXCEPT ![v] = "gate"]
  /\ UNCHANGED <<now, enabled, usedAt, perDay, reserved, admits, lost>>

Refuse(v) ==
  /\ server' = [server EXCEPT ![v] = "idle"]
  /\ screen' = IF screen[v] = "waiting" THEN [screen EXCEPT ![v] = "note"] ELSE screen
  /\ UNCHANGED <<usedAt, perDay, reserved, admits>>

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
            /\ admits' = admits \cup {<<v, now>>}
            /\ server' = [server EXCEPT ![v] = "writing"]
            /\ UNCHANGED screen
       ELSE Refuse(v)
  /\ UNCHANGED <<now, enabled, lost>>

\* Success, a failed check after the repair, or a provider error. All of them
\* keep the visitor's allowance. A closed start screen never hears back.
Answer(v) ==
  /\ server[v] = "writing"
  /\ server' = [server EXCEPT ![v] = "idle"]
  /\ screen' = IF screen[v] = "waiting" THEN [screen EXCEPT ![v] = "done"] ELSE screen
  /\ lost' = (lost \/ screen[v] # "waiting")
  /\ UNCHANGED <<now, enabled, usedAt, perDay, reserved, admits>>

\* Back to my presentation, Escape, or pasting a presentation. Fixed: not
\* while the draft is being written.
Close(v) ==
  /\ screen[v] \in {"form", "note", "done"} \/ (screen[v] = "waiting" /\ ~Fixed)
  /\ screen' = [screen EXCEPT ![v] = "closed"]
  /\ UNCHANGED <<now, enabled, usedAt, perDay, reserved, admits, server, lost>>

Reopen(v) ==
  /\ screen[v] = "closed"
  /\ screen' = [screen EXCEPT ![v] = "form"]
  /\ UNCHANGED <<now, enabled, usedAt, perDay, reserved, admits, server, lost>>

Next ==
  \/ Tick \/ KillSwitch
  \/ \E v \in Visitors : Ask(v) \/ Gate(v) \/ Answer(v) \/ Close(v) \/ Reopen(v)

Spec == Init /\ [][Next]_vars

DailyCap == \A d \in DOMAIN perDay : perDay[d] <= DailyLimit

BudgetCap == \A m \in DOMAIN reserved : reserved[m] <= Budget

OnePerVisitorPerDay ==
  \A a, b \in admits : a # b /\ a[1] = b[1] => a[2] - b[2] >= 2 \/ b[2] - a[2] >= 2

OnlyWhenOn == [][\A v \in Visitors : Gate(v) /\ server'[v] = "writing" => enabled]_vars

\* Nobody spends their free draft without seeing what came of it.
NoSilentlyUsedDraft == ~lost
=============================================================================
