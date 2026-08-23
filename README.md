# 247px

Self-hosted recreation of [247px.com](https://www.247px.com/) — Jasmine Wilson’s photography portfolio.

Live: https://247px.com/

Each stacked image is a clickable / swipeable carousel of photos and videos, imported from the live Framer site.

## Run locally

```bash
npm install
npm run download-media
npm run dev
```

Then open the printed local URL.

## Production build

```bash
npm run build
```

The static files land in `dist/` and can be hosted on any static host (Nginx, Cloudflare Pages, Netlify, GitHub Pages, etc.).

```bash
npm run preview
```

## Add or replace work

Edit `src/data/site.json`. Each gallery is an `id`, a nav `label`, and an ordered `slides` array:

```json
{
  "id": "new-project",
  "label": "New Project",
  "slides": [
    {
      "type": "image",
      "src": "/media/your-file.jpg",
      "width": 2000,
      "height": 3000,
      "aspect": 0.666667,
      "alt": "New Project"
    }
  ]
}
```

Put files in `public/media/` and use `/media/filename.ext` as `src`. Hosted videos use `"type": "video"` and an optional `"poster"`. Vimeo embeds use `"type": "vimeo"` with `src` set to `https://player.vimeo.com/video/{id}`.
