# Kiosk Slides

The shared language for the presentation format, the site, and the agent skill. Use these terms in anything people or AIs read.

## Language

### Presentation and storage

**Presentation**:
An editable, presentable artifact made of slides and presentation-wide settings. A presentation can be saved, shared, downloaded, or presented.
_Avoid_: Deck, slide deck

**Presentation source**:
The editable Markdown representation of a presentation.
_Avoid_: Deck source

**Front matter**:
The optional block at the start of presentation source that holds presentation-wide settings.

**Presentation title**:
The title in a presentation's front matter. It belongs to the whole presentation, not an individual slide.
_Avoid_: Presentation name, slide title

**Saved presentation**:
An editable presentation persisted locally in the browser.
_Avoid_: Download

**Presentation library**:
The browser-local collection of saved presentations.
_Avoid_: File list

**Presentation name**:
The user-editable name that identifies a saved presentation in the presentation library.
_Avoid_: Presentation title

### Slide structure

**Slide**:
One readable screen within a presentation.

**Slide settings**:
The optional source comment directly before a slide heading. It contains the slide title, label, footer, and optionally a slide-specific duration.

**Slide title**:
The text at the top left of a slide that identifies its section or context.
_Avoid_: Presentation title

**Label**:
The short text at the top right of a slide that names what the slide shows.

**Heading**:
The main claim or idea on a slide, shown in the largest type.
_Avoid_: Title

**Body**:
Optional plain paragraph text that supports a slide's heading.

**Footer**:
The short supporting text at the bottom left of a slide.

**Widget**:
The one optional supported Markdown structure that provides a slide's structured supporting content. Lists, quotes, code, images, tables, charts, metrics, flows, and buttons are widgets.

**Message slide**:
A slide with a heading and optional body but no widget.

**Annotation**:
A source comment directly above a Markdown block that selects or configures a widget when its shape alone is not enough.

### Look

**Look**:
The visual settings of a presentation: theme, tone, font, scale, and brand.
_Avoid_: Layout

**Theme**:
The presentation's overall stage style, including its background and surfaces.

**Tone**:
The accent color used for the background glow and highlighted heading words.
_Avoid_: Theme, brand color

**Font**:
The typeface used to render a presentation.

**Scale**:
The presentation-wide text-size setting.
_Avoid_: Zoom

**Brand**:
The text shown at the bottom right of every slide, or nothing when it is hidden.

### Playback and delivery

**Present**:
Show a presentation fullscreen in presentation mode.
_Avoid_: Play

**Transition**:
The motion or cut between slides.

**Autoplay**:
Timed automatic advancement through slides.
_Avoid_: Present

**Duration**:
The default autoplay time for each slide, unless the slide sets its own duration.

**Loop**:
Restarting autoplay at the first slide after the last slide.

**Screen-share safe**:
The playback mode that replaces transitions with a quick flat fade for clear screen sharing.

**Share link**:
A self-contained URL that reopens a snapshot of a presentation in the browser without uploading it. It is not a saved presentation until someone keeps it.
_Avoid_: Shared presentation

**Download**:
A local copy of a presentation created as a standalone HTML file or a PDF.
_Avoid_: Export

**Render**:
The creation of a presentable HTML representation from presentation source.
_Avoid_: Download

**Credit**:
The optional "Made with Kiosk Slides" line added after a downloaded HTML presentation and in a share link, never on a slide.
