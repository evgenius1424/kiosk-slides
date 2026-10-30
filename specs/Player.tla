----------------------------- MODULE Player -----------------------------
\* The slide you see while editing, stepping and autoplaying
\* (playerReducer in components/workspace/use-player.ts). The player keeps a
\* slide index; the screen shows it clamped to the slides that exist.

EXTENDS Integers

CONSTANTS MaxSlides, Fixed

VARIABLES count, index, playing, loop

vars == <<count, index, playing, loop>>

Min(a, b) == IF a < b THEN a ELSE b
Max(a, b) == IF a > b THEN a ELSE b

Shown(i, n) == Max(0, Min(i, n - 1))
shown == Shown(index, count)

\* Fixed: the player pulls its index back as soon as slides disappear.
Settle(i, n) == IF Fixed /\ n > 0 THEN Min(i, n - 1) ELSE i

Init ==
  /\ count \in 1..MaxSlides
  /\ index \in 0..count - 1
  /\ playing = FALSE
  /\ loop \in BOOLEAN

\* Typing in Edit adds or removes slides; 0 slides is a Markdown error.
Type ==
  /\ \E n \in 0..MaxSlides :
       /\ count' = n
       /\ index' = Settle(index, n)
  /\ UNCHANGED <<playing, loop>>

\* Clicking a slide in the list stops autoplay.
Pick ==
  /\ count > 0
  /\ \E i \in 0..count - 1 : index' = i
  /\ playing' = FALSE
  /\ UNCHANGED <<count, loop>>

\* Moving the cursor in Edit, or Undo and Redo, keeps autoplay going.
Show ==
  /\ count > 0
  /\ \E i \in 0..count - 1 : index' = i
  /\ UNCHANGED <<count, playing, loop>>

Step(delta) ==
  /\ count > 0
  /\ index' = Max(0, Min(count - 1, index + delta))
  /\ playing' = FALSE
  /\ UNCHANGED <<count, loop>>

Toggle ==
  /\ count > 0
  /\ playing' = ~playing
  /\ UNCHANGED <<count, index, loop>>

\* The autoplay timer: playerReducer's tick.
Tick ==
  /\ playing /\ count > 0
  /\ IF index = count - 1 /\ ~loop
       THEN playing' = FALSE /\ index' = index
       ELSE index' = (index + 1) % count /\ playing' = TRUE
  /\ UNCHANGED <<count, loop>>

Next == Type \/ Pick \/ Show \/ Step(1) \/ Step(-1) \/ Toggle \/ Tick

Spec == Init /\ [][Next]_vars

TypeOK == count \in 0..MaxSlides /\ index \in Nat /\ playing \in BOOLEAN

after == Shown(index', count')

\* Arrow keys always move one slide from the slide on screen.
ArrowsMoveOne ==
  [][/\ Step(-1) /\ shown > 0 => after = shown - 1
     /\ Step(1) /\ shown < count - 1 => after = shown + 1]_vars

\* Without Loop, autoplay only goes forward and stops on the last slide.
AutoplayForward ==
  [][Tick /\ ~loop => after > shown \/ (after = shown /\ ~playing')]_vars
=============================================================================
