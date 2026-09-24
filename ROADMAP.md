# woodburrow roadmap

The public site. It exists so the project is legible to people who are not
reading disassembly, and so progress is recorded honestly rather than
optimistically.

## Standing rules

- **Nothing is ever shown as finished.** No category exceeds 95%. Coverage is
  not correctness, and a category that looks done can be hiding bugs.
- **Written for someone who does not know what a stack frame is.** If a finding
  cannot be explained without jargon, the explanation is not finished.
- **Never claim more than was measured.** "The cause is found" and "the stall is
  fixed" are different sentences and the difference matters.

## Done

- five pages, verified from 320px to 1920px
- progress and findings feeds driven by JSON, cache-busted on publish
- rules automation via a Vercel function: posts and edits, never deletes,
  gated on a secret, idempotent, daily cron
- contributors page, Discord integration with embeds
- **the 2026-09 overhaul**: a compact top bar in place of the 170px sky banner
  on every page, a front page built around six stages (never percentages),
  light and dark themes, and one stylesheet instead of two
- **a timeline view** for corrections: grouped by date, newest first, so the
  story of a bug -- theory, disproof, correction -- reads in order
- **retractions shown as retractions**: the original claim kept, struck
  through, next to what replaced it and what believing it cost

## Open

- [ ] screenshots or video once anything renders
- [ ] an accessibility pass by a person using a screen reader. Contrast,
      heading order, 360px reflow and reduced motion are measured (see
      `ASSESSMENT.md`); how the tabs and the roster actually sound is not
- [ ] make the roster data browsable rather than only powering other pages
