---------------------------- MODULE Settings ----------------------------
\* Settings live in each presentation's front matter; the style chosen last
\* (theme, color, font, text size) starts new and pasted presentations
\* (components/workspace/settings-panel.tsx, lib/last-style.ts,
\* components/workspace/use-library.ts). `want` is what the person expects to
\* see; the actions change `doc` the way the code does.

EXTENDS Integers, Sequences

CONSTANTS MaxOps, Fixed

Ids == {"a", "b", "new"}
Tones == {"t0", "t1", "t2"}
Fonts == {"f0", "f1"}
Example == 9
Blank == 0

VARIABLES doc, want, named, open, last, wantLast, pending, history, undos, shared, ops

vars == <<doc, want, named, open, last, wantLast, pending, history, undos, shared, ops>>

\* A presentation is <<text, color, font>>; text 0 is the untouched blank one.
Gone == <<-1, "t0", "f0">>
None == [for |-> "none", font |-> "f0", prev |-> "f0", seen |-> Gone]
Style(p) == <<p[2], p[3]>>
With(p, i, v) == [p EXCEPT ![i] = v]

Init ==
  /\ doc = [i \in Ids |-> CASE i = "a" -> <<Blank, "t0", "f0">>
                            [] i = "b" -> <<1, "t1", "f0">>
                            [] OTHER -> Gone]
  /\ want = doc
  /\ named = [i \in Ids |-> i = "b"]
  /\ open = "a"
  /\ last = <<"t0", "f0">>
  /\ wantLast = last
  /\ pending = None
  /\ history = [i \in Ids |-> <<>>]
  /\ undos = [i \in Ids |-> <<>>]
  /\ shared = FALSE
  /\ ops = 0

Step == ops < MaxOps /\ ops' = ops + 1

\* What the person sees: a picked font shows once the fonts load.
Shown(p) == IF pending.for = p THEN With(want[p], 3, pending.prev) ELSE want[p]

\* Ideally every settings change is a step that Undo takes back. Old code:
\* settings changes never reached the undo history.
Remember(p, version, wanted) ==
  /\ history' = IF Fixed THEN [history EXCEPT ![p] = Append(@, version)] ELSE history
  /\ undos' = [undos EXCEPT ![p] = Append(@, wanted)]

PickColor(t) ==
  /\ Step /\ ~shared
  /\ doc' = [doc EXCEPT ![open] = With(@, 2, t)]
  /\ want' = [want EXCEPT ![open] = With(@, 2, t)]
  /\ last' = Style(doc'[open])
  /\ wantLast' = Style(want'[open])
  /\ Remember(open, doc[open], Shown(open))
  /\ UNCHANGED <<named, open, pending, shared>>

\* Picking a font waits for the fonts to load before it writes anything.
PickFont(f) ==
  /\ Step /\ ~shared /\ pending = None
  /\ pending' = [for |-> open, font |-> f, prev |-> want[open][3], seen |-> doc[open]]
  /\ want' = [want EXCEPT ![open] = With(@, 3, f)]
  /\ wantLast' = Style(want'[open])
  /\ UNCHANGED <<doc, named, open, last, history, undos, shared>>

\* A pick for a presentation that is no longer open is dropped.
Drop(w) == [w EXCEPT ![pending.for] = With(@, 3, doc[pending.for][3])]

\* Old code: writes the presentation as it was at the click, plus the font,
\* into whichever presentation is open now. Fixed: adds the font to the
\* latest version, and only if the same presentation is still open.
FontsLoaded ==
  /\ pending # None
  /\ pending' = None
  /\ LET here == open = pending.for
         written == IF Fixed THEN With(doc[open], 3, pending.font)
                    ELSE With(pending.seen, 3, pending.font)
     IN /\ doc' = IF Fixed /\ ~here THEN doc ELSE [doc EXCEPT ![open] = written]
        /\ IF Fixed /\ ~here
              THEN UNCHANGED <<history, undos>>
              ELSE Remember(open, doc[open], With(want[open], 3, pending.prev))
        /\ last' = IF Fixed /\ ~here THEN last ELSE Style(written)
        /\ want' = IF here THEN want ELSE Drop(want)
        /\ wantLast' = IF here THEN Style(want[open]) ELSE last
  /\ UNCHANGED <<named, open, shared, ops>>

Switch(p) ==
  /\ Step /\ ~shared /\ p # open /\ doc[p] # Gone
  /\ open' = p
  /\ UNCHANGED <<doc, want, named, last, wantLast, pending, history, undos, shared>>

\* Pasting a presentation (or the free AI draft) starts it in the last style.
Paste ==
  /\ Step /\ doc["new"] = Gone
  /\ LET pasted == <<5, last[1], last[2]>>
     IN /\ doc' = [doc EXCEPT !["new"] = pasted]
        /\ want' = [want EXCEPT !["new"] = pasted]
  /\ open' = "new"
  /\ shared' = FALSE
  /\ UNCHANGED <<named, last, wantLast, pending, history, undos>>

Rename(p) ==
  /\ Step /\ doc[p] # Gone /\ ~named[p]
  /\ named' = [named EXCEPT ![p] = TRUE]
  /\ UNCHANGED <<doc, want, open, last, wantLast, pending, history, undos, shared>>

\* Reloading the page on a shared link. Old code: the open presentation was
\* saved over with the example before the link was read.
OpenSharedLink ==
  /\ Step /\ ~shared
  /\ shared' = TRUE
  /\ pending' = None
  /\ doc' = IF Fixed THEN doc ELSE [doc EXCEPT ![open] = <<Example, @[2], @[3]>>]
  /\ want' = IF pending = None THEN want ELSE Drop(want)
  /\ wantLast' = IF pending = None THEN wantLast ELSE last
  /\ UNCHANGED <<named, open, last, history, undos>>

\* Keep a copy: the shared presentation keeps its own style, and only an
\* untouched blank one that was never renamed makes way for it.
Keep ==
  /\ Step /\ shared /\ doc["new"] = Gone
  /\ LET kept == <<7, "t2", "f1">>
         Tidy(d) == [i \in Ids |->
                       IF i = "new" THEN kept
                       ELSE IF d[i][1] = Blank /\ (~named[i] \/ ~Fixed) THEN Gone ELSE d[i]]
         Ideal(d) == [i \in Ids |->
                       IF i = "new" THEN kept
                       ELSE IF d[i][1] = Blank /\ ~named[i] THEN Gone ELSE d[i]]
     IN /\ doc' = Tidy(doc)
        /\ want' = Ideal(want)
  /\ open' = "new"
  /\ shared' = FALSE
  /\ UNCHANGED <<named, last, wantLast, pending, history, undos>>

Undo ==
  /\ Step /\ ~shared /\ pending = None
  /\ Len(history[open]) > 0 \/ Len(undos[open]) > 0
  /\ doc' = IF Len(history[open]) > 0
            THEN [doc EXCEPT ![open] = history[open][Len(history[open])]] ELSE doc
  /\ want' = IF Len(undos[open]) > 0
             THEN [want EXCEPT ![open] = undos[open][Len(undos[open])]] ELSE want
  /\ history' = [history EXCEPT ![open] = IF @ = <<>> THEN @ ELSE SubSeq(@, 1, Len(@) - 1)]
  /\ undos' = [undos EXCEPT ![open] = IF @ = <<>> THEN @ ELSE SubSeq(@, 1, Len(@) - 1)]
  /\ UNCHANGED <<named, open, last, wantLast, pending, shared>>

Next ==
  \/ \E t \in Tones : PickColor(t)
  \/ \E f \in Fonts : PickFont(f)
  \/ FontsLoaded
  \/ \E p \in Ids : Switch(p) \/ Rename(p)
  \/ Paste \/ OpenSharedLink \/ Keep \/ Undo

Spec == Init /\ [][Next]_vars

\* Once no font is loading, every presentation is what the person made it.
NothingLostOrMixedUp == pending = None => doc = want

\* New presentations start in the style the person chose last.
LastStyleIsLastChoice == pending = None => last = wantLast
=============================================================================
