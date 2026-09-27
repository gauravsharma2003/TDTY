# This Day That Year — UI preview plan

## Design read

A daily history experience for curious readers. Keep the existing cinematic museum character, but make the event easier to read and the path into the date archive obvious. The preview is a visual concept, not an implemented page. Its generated historical imagery is illustrative; production should use verified, credited source images.

## Current UI findings

- The full-screen photograph and serif typography give the site a distinct archival mood.
- The home view displays the same sentence as both subtitle and body when source fields match.
- The link to all events is subdued near the bottom edge, especially in a narrow viewport.
- The tall image overlay makes some content feel cramped, while date browsing is only revealed after following the event link.

## Proposed direction

- **Structure:** concise navigation, one featured event, then a small flat timeline of other events for the same date.
- **Hierarchy:** date → year → title → one-sentence summary → primary archive action. Show the full event text in the archive or an expanded reading view.
- **Visual system:** charcoal `#0B0B0A`, warm ivory `#F1EDE4`, muted brass `#B79A60`; editorial serif for the year and title, restrained sans for date labels and image credits. Keep decoration limited to fine rules.
- **Desktop:** large image on the left and editorial text panel on the right. The timeline appears directly below, without nested cards.
- **Mobile:** image above a solid text panel; title and action remain visible without text crossing the photograph. Timeline becomes a simple vertical list.
- **Motion:** short image and type reveal only; no movement needed to understand the content. Respect reduced-motion settings.
- **Share:** a visible warm-ivory “Share story” button in the top navigation, with a familiar square-and-up-arrow icon. Keep it legible and easy to tap on mobile, while the archive link remains the main event action.

## Implementation sequence

1. Establish shared color, type, spacing, and focus tokens in the existing CSS modules. Keep the site's current routes and data flow.
2. Rework the home layout and header around the featured event. Collapse duplicate subtitle/body text and use a clear “Explore this day” link.
3. Add a small preview of other events from the existing date data, with links into the date archive. Use only verified event titles and images.
4. Align the date archive page with the same visual system and strengthen previous/next day navigation.
5. Test at desktop and narrow mobile widths, keyboard focus, long titles, missing images and locations, reduced motion, and date rollover behavior.

## Review criteria

- The featured event and archive action are clear at first glance on desktop and mobile.
- Text never relies on a photograph for contrast.
- No source sentence appears twice on the same view.
- Historical images are sourced from the project data and credited where displayed.
- The archive, share action, and day navigation still work.

## Preview

`tdty-ui-preview-v2.png` is the current concept mockup, revised with the more prominent Share button. `tdty-ui-preview.png` is the initial version. They are not exact historical depictions or implementation screenshots.

## Build status

The home page, prominent Share action, three-event preview, direct event links, image fallbacks, and archive styling are implemented. The running site uses source images from the event data rather than the generated mockup imagery.
