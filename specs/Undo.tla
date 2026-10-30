----------------------------- MODULE Undo -------------------------------
\* Undo and Redo, from the keyboard or from the Undo button on a notice
\* (components/workspace/kiosk-workspace.tsx, components/workspace/use-versions.ts,
\* lib/history.ts, components/workspace/toast.tsx). Each source is a number;
\* `want` is what the person expects to see, the other variables follow the code.

EXTENDS Integers, Sequences

CONSTANTS Ids, MaxOps, Fixed

VARIABLES src, open, hist, redo, toast, want, wantUndo, wantRedo, ops

vars == <<src, open, hist, redo, toast, want, wantUndo, wantRedo, ops>>

NoToast == "none"

Init ==
  /\ src = [p \in Ids |-> 0]
  /\ open \in Ids
  /\ hist = [p \in Ids |-> <<>>]
  /\ redo = [p \in Ids |-> <<>>]
  /\ toast = NoToast
  /\ want = src
  /\ wantUndo = [p \in Ids |-> <<>>]
  /\ wantRedo = [p \in Ids |-> <<>>]
  /\ ops = 0

Fresh == ops + 1
Step == ops < MaxOps /\ ops' = ops + 1
Top(s) == s[Len(s)]
Pop(s) == SubSeq(s, 1, Len(s) - 1)

\* addVersion: a version equal to the last one is not added again.
Add(h, s) == IF Len(h) > 0 /\ Top(h) = s THEN h ELSE Append(h, s)

\* versions.remember, called by changeSource before every workspace change.
Remember(p) ==
  /\ hist' = [hist EXCEPT ![p] = Add(@, src[p])]
  /\ redo' = [redo EXCEPT ![p] = <<>>]

\* What the person expects from any change: Undo takes it back, Redo is gone.
Expect(p, s) ==
  /\ want' = [want EXCEPT ![p] = s]
  /\ wantUndo' = [wantUndo EXCEPT ![p] = Append(@, want[p])]
  /\ wantRedo' = [wantRedo EXCEPT ![p] = <<>>]

\* Typing in Edit records nothing: it folds into the next checkpoint.
Type ==
  /\ Step
  /\ src' = [src EXCEPT ![open] = Fresh]
  /\ want' = [want EXCEPT ![open] = Fresh]
  /\ wantRedo' = [wantRedo EXCEPT ![open] = <<>>]
  /\ UNCHANGED <<open, hist, redo, toast, wantUndo>>

\* Another tab saves a presentation; the storage event loads it here.
Arrive(p) ==
  /\ Step
  /\ src' = [src EXCEPT ![p] = Fresh]
  /\ want' = [want EXCEPT ![p] = Fresh]
  /\ wantRedo' = [wantRedo EXCEPT ![p] = <<>>]
  /\ UNCHANGED <<open, hist, redo, toast, wantUndo>>

\* Add, delete, duplicate or move a slide, a settings change, a reused AI
\* reply: changeSource, then a notice with Undo for this presentation.
Change ==
  /\ Step
  /\ Remember(open)
  /\ src' = [src EXCEPT ![open] = Fresh]
  /\ toast' = open
  /\ Expect(open, Fresh)
  /\ UNCHANGED open

\* Clean up. Before PR #95 it replaced the source without a checkpoint.
CleanUp ==
  /\ Step
  /\ IF "cleanUp" \in Fixed THEN Remember(open) ELSE UNCHANGED <<hist, redo>>
  /\ src' = [src EXCEPT ![open] = Fresh]
  /\ toast' = open
  /\ Expect(open, Fresh)
  /\ UNCHANGED open

RECURSIVE Strip(_, _)
Strip(h, s) == IF Len(h) > 0 /\ Top(h) = s THEN Strip(Pop(h), s) ELSE h

\* versions.undo: skip versions equal to what is shown, restore the next one.
\* Every outcome posts a notice without Undo, which replaces the old one.
DoUndo(p) ==
  LET h == Strip(hist[p], src[p])
  IN /\ IF Len(h) = 0
          THEN UNCHANGED <<src, hist, redo>>
          ELSE /\ src' = [src EXCEPT ![p] = Top(h)]
               /\ hist' = [hist EXCEPT ![p] = Pop(h)]
               /\ redo' = [redo EXCEPT ![p] = Append(@, [source |-> src[p], from |-> Top(h)])]
     /\ toast' = NoToast

ExpectUndo(p) ==
  IF Len(wantUndo[p]) = 0
    THEN UNCHANGED <<want, wantUndo, wantRedo>>
    ELSE /\ want' = [want EXCEPT ![p] = Top(wantUndo[p])]
         /\ wantUndo' = [wantUndo EXCEPT ![p] = Pop(@)]
         /\ wantRedo' = [wantRedo EXCEPT ![p] = Append(@, want[p])]

Undo == Step /\ DoUndo(open) /\ ExpectUndo(open) /\ UNCHANGED open

\* The Undo button on a notice. Before the fix it undid whichever presentation
\* was open when it was pressed; now it only acts on the one it was posted for.
ToastUndo ==
  /\ Step /\ toast # NoToast
  /\ IF toast = open \/ "toast" \notin Fixed
       THEN DoUndo(open)
       ELSE toast' = NoToast /\ UNCHANGED <<src, hist, redo>>
  /\ IF toast = open THEN ExpectUndo(open) ELSE UNCHANGED <<want, wantUndo, wantRedo>>
  /\ UNCHANGED open

\* versions.redo: only while the source is still what Undo produced.
Redo ==
  /\ Step
  /\ LET r == redo[open]
     IN IF Len(r) = 0 \/ Top(r).from # src[open]
          THEN /\ redo' = [redo EXCEPT ![open] = <<>>]
               /\ UNCHANGED <<src, hist>>
          ELSE /\ src' = [src EXCEPT ![open] = Top(r).source]
               /\ redo' = [redo EXCEPT ![open] = Pop(r)]
               /\ hist' = [hist EXCEPT ![open] = Add(@, src[open])]
  /\ IF Len(wantRedo[open]) = 0
       THEN UNCHANGED <<want, wantUndo, wantRedo>>
       ELSE /\ want' = [want EXCEPT ![open] = Top(wantRedo[open])]
            /\ wantRedo' = [wantRedo EXCEPT ![open] = Pop(@)]
            /\ wantUndo' = [wantUndo EXCEPT ![open] = Append(@, want[open])]
  /\ toast' = NoToast
  /\ UNCHANGED open

\* Opening another presentation from the header leaves the notice up.
Switch(p) ==
  /\ Step /\ p # open
  /\ open' = p
  /\ UNCHANGED <<src, hist, redo, toast, want, wantUndo, wantRedo>>

\* The notice times out after 8 seconds.
Expire ==
  /\ toast # NoToast
  /\ toast' = NoToast
  /\ UNCHANGED <<src, open, hist, redo, want, wantUndo, wantRedo, ops>>

Next ==
  \/ Type \/ Change \/ CleanUp \/ Undo \/ ToastUndo \/ Redo \/ Expire
  \/ \E p \in Ids : Arrive(p) \/ Switch(p)

Spec == Init /\ [][Next]_vars

\* Every presentation shows what the person expects after each change, Undo
\* and Redo: Undo takes back the latest change, Redo puts it back.
UndoTakesBackOneChange == src = want
=============================================================================
