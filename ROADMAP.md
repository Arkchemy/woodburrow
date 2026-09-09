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

## Open

- [ ] **A timeline view.** The findings feed is chronological but flat; the
      story of a bug — theory, disproof, correction — is more interesting than
      any single entry and is currently invisible.
- [ ] **Retractions shown as retractions.** Several published findings were
      later corrected. Presenting only the corrected version hides the most
      useful part.
- [ ] screenshots or video once anything renders
- [ ] an accessibility pass: focus order, reduced-motion coverage, contrast
      audit against WCAG AA
- [ ] make the roster data browsable rather than only powering other pages
