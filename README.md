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

The live site is static, so new photos are added on your computer and then published with a commit.

1. Run `npm run dev` and open the printed local URL.
2. Click **Add work** in the sidebar (or go to `/admin`).
3. Create a gallery or pick an existing one, then drop JPG / PNG / WebP / GIF / MP4 / WebM files.
4. Click **Save**. Files land in `public/media/` and the gallery is written into `src/data/site.json` in the same format the homepage already reads.
5. Refresh the homepage to preview, then commit and push to publish.

The editor only writes files while Vite is running locally. It is not available on the deployed GitHub Pages site.

You can still edit `src/data/site.json` by hand. Each gallery is an `id`, a nav `label`, and an ordered `slides` array:

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
