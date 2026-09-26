# gabrielcaribe.com

Personal site — blog + project portfolio. Plain HTML, CSS and JavaScript with no
build step, no dependencies and no framework. Open a file, edit it, save it.

```
assets/js/content.js          every project and post, in one list — the file you edit
index.html                    home — hero, featured projects, recent posts, about, contact
projects.html                 the project index (grid of all projects)
projects/*.html               one page per project — the write-up only
projects/project-template.html copy this for each new project
blog.html                     the post index
posts/*.html                  one page per post — the write-up only
posts/post-template.html      copy this for each new post
assets/css/style.css          all styling, including both colour modes
assets/js/site.js             builds the cards and page headers from content.js
assets/js/space.js            the WebGL nebula background
assets/js/main.js             mode toggle, scroll reveals, sticky header
assets/img/favicon.svg        the orange circle
assets/img/                   your images go here
assets/video/                 your videos go here
```

## Running it locally

Double-clicking `index.html` works. For a proper local server:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## The two modes

A `data-mode` attribute on `<html>` switches everything:

- **dark** — deep space. Navy clouds lit with amber, quiet type.
- **fun** — Spider-Verse. Magenta nebula, hot orange highlights, cyan rim
  light, Ben-Day halftone dots and chromatic aberration.

Visitors toggle with the button in the header or by pressing **F**. The choice is
saved to `localStorage` and applied before first paint, so there is no flash on
the next page load.

The layout is deliberately identical in both modes — only colour, glow and a few
flourishes change.

### Changing the colours

Every colour lives in two blocks at the top of `assets/css/style.css`:
`:root, [data-mode='calm']` and `[data-mode='fun']`. Change a value there and it
propagates everywhere.

The background is a fragment shader, so its palette lives separately in
`assets/js/space.js` — look for the `/* palettes */` comment. Each colour is a
`mix(calmColour, funColour, uMode)`, where `uMode` eases from 0 to 1 when the
toggle is flipped.

## Adding a project or a post

Everything that describes a project or a post — its title, date, tags, summary
and card image — lives in **one entry** in `assets/js/content.js`. The home page
card, the `projects.html` / `blog.html` card and the heading on the project's or
post's own page are all built from that entry, so you write each thing once.

**A new blog post**

1. Copy `posts/post-template.html` to `posts/your-slug.html` and write the body.
2. Add an entry to the `posts` list in `assets/js/content.js` with
   `slug: 'your-slug'`.

**A new project**

1. Copy `projects/project-template.html` to `projects/your-slug.html` and write
   the body.
2. Add an entry to the `projects` list in `assets/js/content.js` with
   `slug: 'your-slug'`, and point `image` at a file in `assets/img/`.

The `slug` is the filename without `.html` — that is the only link between the
entry and the page, so they have to match. Leave the `<title>`, the
`<meta name="description">` and the `data-field` placeholders in the template
alone; they get filled in from the entry.

`featured: true` puts an entry in the short lists on the home page. The order of
the entries in `content.js` is the order they appear on the page, newest first —
to reorder, move an entry. Removing an entry takes the item off every list, and
deleting its `.html` file removes the page.

Both lists are rendered into an empty container, so there is nothing to copy and
paste in the page markup:

```html
<!-- projects.html: all of them -->
<div class="grid-projects" data-list="projects"></div>

<!-- index.html: only the featured ones, at most three -->
<div class="grid-projects" data-list="projects" data-featured data-limit="3"></div>
```

Project cards link **straight to the project's own page**. The header "Projects"
link and the "See all" link go to `projects.html`, the full grid.

One trade-off worth knowing: because the cards and headings are assembled in the
browser, a visitor with JavaScript switched off sees the page but not the lists.
Search engines run JavaScript, so this does not affect indexing.

## Filling in the rest

Every remaining placeholder is marked with an `EDIT ME` comment in the HTML.

**Your photo** — in `index.html`, replace the `<div class="orb-placeholder">`
line inside `<figure class="portrait-orb">` with
`<img src="assets/img/me.jpg" alt="Your Name">`. Use a roughly square crop;
a radial mask fades the edges into the nebula, two accent-coloured pools sit
behind it as though the nebula were lighting it, and a hairline ring keeps the
soft edge from reading as a smudge. Don't bother cutting the background out.

**Other images** — drop them in `assets/img/`. The dashed pills marked
`Image 16:10` and `Image 16:9` show the aspect ratio each slot expects.

**A video** — drop the file in `assets/video/` and fill a media slot exactly the
way an image fills one, with `<video>` in place of `<img>`:

```html
<div class="figure-placeholder horizontal">
  <div class="thumb">
    <video src="../assets/video/your-clip.mp4" autoplay loop muted playsinline
           preload="metadata" aria-label="What the clip shows"></video>
  </div>
</div>
```

Pick the orientation with a class on the slot:

- **`horizontal`** — landscape, 16:9, full column width. This is also what you get
  if you leave the class off.
- **`vertical`** — portrait, 9:16, for phone footage. The slot is sized from its
  height (capped at 75% of the viewport or 600px, whichever is smaller) and
  centred in the column, so a tall clip never runs off the screen.

Everything else is identical between the two; only the class changes.

`autoplay loop muted playsinline` is the whole trick: it plays on load, restarts
forever, has no sound, and stays inline instead of going fullscreen on iOS.
Browsers only allow autoplay when the video is muted, so keep `muted` — there are
no controls, so a viewer has no way to unmute anyway. Drop the `../` from the path
on top-level pages like `projects.html`. Use MP4 (H.264); it plays everywhere.

Also worth replacing before you publish: the `<title>` and `<meta name="description">`
on each page, the `og:` tags in `index.html`, the email in the contact section, and
the social links.

## Performance

The background is the only heavy thing on the page, so it is kept cheap:

- The nebula is sampled **once** per pixel. Chromatic aberration comes from
  running the colour ramp three times at slightly offset densities, which is
  pure arithmetic — no extra noise lookups.
- Render resolution adapts to measured frame rate (`quality` in `space.js`),
  so a slower GPU drops resolution instead of dropping frames.
- There is **no `backdrop-filter`** anywhere. It forced the browser to re-blur
  the animating canvas behind every card on each scroll frame. Removing it
  fixed the scroll jank and made the whole design look sharper.

## Notes on the background

- Pauses when the tab is hidden.
- Honours `prefers-reduced-motion` by slowing to a near-still drift.
- Falls back to a static CSS gradient if WebGL is unavailable.

## Deploying

It is a folder of static files, so anything works — GitHub Pages, Netlify, Cloudflare
Pages, Vercel. No build command; publish the repository root.
