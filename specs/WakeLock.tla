---------------------------- MODULE WakeLock ----------------------------
\* Keeping the screen awake while presenting or autoplaying
\* (components/use-wake-lock.ts). A request is a promise that resolves later,
\* each effect run has its own `done` flag, and the browser drops every lock
\* when the tab is hidden.

EXTENDS Integers, FiniteSets

CONSTANTS MaxRequests, Fixed

VARIABLES active, visible, inflight, held, kept, requests, run

vars == <<active, visible, inflight, held, kept, requests, run>>

\* inflight: requests not yet resolved, with the effect run that sent them;
\* held: locks the browser holds; kept: the lock this run remembers (0 for none).

Init ==
  /\ active = FALSE
  /\ visible = TRUE
  /\ inflight = {}
  /\ held = {}
  /\ kept = 0
  /\ requests = 0
  /\ run = 0

\* request(): skipped when hidden or a live lock is kept.
CanRequest == requests < MaxRequests /\ (kept = 0 \/ kept \notin held)

Request(r) ==
  IF CanRequest
    THEN /\ requests' = requests + 1
         /\ inflight' = inflight \cup {<<requests + 1, r>>}
    ELSE UNCHANGED <<requests, inflight>>

Start ==
  /\ ~active /\ run < MaxRequests
  /\ active' = TRUE
  /\ run' = run + 1
  /\ IF visible THEN Request(run + 1) ELSE UNCHANGED <<requests, inflight>>
  /\ UNCHANGED <<visible, held, kept>>

\* Effect cleanup releases the kept lock and starts the next run without one.
Stop ==
  /\ active
  /\ active' = FALSE
  /\ held' = held \ {kept}
  /\ kept' = 0
  /\ UNCHANGED <<visible, inflight, requests, run>>

Hide ==
  /\ visible
  /\ visible' = FALSE
  /\ held' = {}
  /\ UNCHANGED <<active, inflight, kept, requests, run>>

Show ==
  /\ ~visible
  /\ visible' = TRUE
  /\ IF active THEN Request(run) ELSE UNCHANGED <<requests, inflight>>
  /\ UNCHANGED <<active, held, kept, run>>

\* A request from an ended run is released at once; a hidden tab gets nothing.
\* Fixed: a lock that arrives while another is kept is released too.
Resolve ==
  \E q \in inflight :
    /\ inflight' = inflight \ {q}
    /\ IF visible /\ active /\ q[2] = run /\ ~(Fixed /\ kept \in held)
         THEN held' = held \cup {q[1]} /\ kept' = q[1]
         ELSE UNCHANGED <<held, kept>>
    /\ UNCHANGED <<active, visible, requests, run>>

Next == Start \/ Stop \/ Hide \/ Show \/ Resolve

Spec == Init /\ [][Next]_vars

\* Once presenting and autoplay stop and every request has resolved, nothing
\* keeps the screen on.
NoLeftoverLock == (~active /\ inflight = {}) => held = {}

\* The hook never holds more than one lock.
OneLock == Cardinality(held) <= 1
=============================================================================
