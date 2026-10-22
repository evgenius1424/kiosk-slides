---------------------------- MODULE Library ----------------------------
\* Saved presentations live in one localStorage key that every open tab
\* rewrites in full (components/workspace/use-library.ts). Two tabs, two
\* presentations, each value a version number, 0 meaning "not in the library".

EXTENDS Integers

CONSTANTS Tabs, Ids, MaxOps, Fixed

Absent == 0
NoOp == -1

VARIABLES store, open, view, base, dirty, heard, ops, last

vars == <<store, open, view, base, dirty, heard, ops, last>>

Library == [Ids -> Nat]

Init ==
  /\ store = [i \in Ids |-> Absent]
  /\ open = [t \in Tabs |-> FALSE]
  /\ view = [t \in Tabs |-> [i \in Ids |-> Absent]]
  /\ base = [t \in Tabs |-> [i \in Ids |-> Absent]]
  /\ dirty = [t \in Tabs |-> FALSE]
  /\ heard = [t \in Tabs |-> FALSE]
  /\ ops = 0
  /\ last = [t \in Tabs |-> [i \in Ids |-> NoOp]]

Merge(b, ours, theirs) == [i \in Ids |-> IF ours[i] = b[i] THEN theirs[i] ELSE ours[i]]

\* A tab opens (a new tab, or a shared link) and saves what it loaded.
Open(t) ==
  /\ ~open[t]
  /\ open' = [open EXCEPT ![t] = TRUE]
  /\ view' = [view EXCEPT ![t] = store]
  /\ base' = [base EXCEPT ![t] = store]
  /\ dirty' = [dirty EXCEPT ![t] = TRUE]
  /\ UNCHANGED <<store, heard, ops, last>>

Change(t, i, value) ==
  /\ ops < MaxOps
  /\ view' = [view EXCEPT ![t][i] = value]
  /\ dirty' = [dirty EXCEPT ![t] = TRUE]
  /\ last' = [last EXCEPT ![t][i] = value]
  /\ ops' = ops + 1
  /\ UNCHANGED <<store, open, base, heard>>

\* New presentation, Keep a copy of a shared link, paste, AI draft.
Create(t, i) ==
  /\ open[t] /\ view[t][i] = Absent
  /\ \A u \in Tabs : last[u][i] = NoOp
  /\ Change(t, i, ops + 1)

\* Typing, settings, AI reply, rename. Can happen in a background tab too.
Edit(t, i) == open[t] /\ view[t][i] # Absent /\ Change(t, i, ops + 1)

Delete(t, i) == open[t] /\ view[t][i] # Absent /\ Change(t, i, Absent)

\* The save effect runs after render, so other tabs can act in between.
Save(t) ==
  /\ dirty[t]
  /\ LET written == IF Fixed THEN Merge(base[t], view[t], store) ELSE view[t]
     IN /\ store' = written
        /\ view' = IF Fixed THEN [view EXCEPT ![t] = written] ELSE view
        /\ base' = [base EXCEPT ![t] = written]
        /\ heard' = [u \in Tabs |-> IF u = t \/ ~open[u] THEN heard[u] ELSE TRUE]
  /\ dirty' = [dirty EXCEPT ![t] = FALSE]
  /\ UNCHANGED <<open, ops, last>>

\* The browser's storage event in the other tabs.
Hear(t) ==
  /\ heard[t]
  /\ heard' = [heard EXCEPT ![t] = FALSE]
  /\ IF Fixed
       THEN /\ view' = [view EXCEPT ![t] = Merge(base[t], view[t], store)]
            /\ base' = [base EXCEPT ![t] = store]
       ELSE UNCHANGED <<view, base>>
  /\ UNCHANGED <<store, open, dirty, ops, last>>

Next ==
  \/ \E t \in Tabs :
       \/ Open(t) \/ Save(t) \/ Hear(t)
       \/ \E i \in Ids : Create(t, i) \/ Edit(t, i) \/ Delete(t, i)

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ store \in Library
  /\ \A t \in Tabs : view[t] \in Library /\ base[t] \in Library

Settled == \A t \in Tabs : ~dirty[t] /\ ~heard[t]

\* Once every tab has saved and heard the others, each presentation holds the
\* last thing some tab did to it: nothing created is lost, nothing deleted returns.
NothingLost ==
  Settled =>
    \A i \in Ids :
      \/ \A t \in Tabs : last[t][i] = NoOp
      \/ \E t \in Tabs : last[t][i] # NoOp /\ store[i] = last[t][i]

\* Every open tab shows what is saved.
TabsAgree == Settled => \A t \in Tabs : open[t] => view[t] = store

=============================================================================
