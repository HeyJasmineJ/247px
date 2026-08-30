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

1. In this project folder run `npm install` (once) then `npm run dev`.
2. Open the **localhost** URL printed in the terminal (usually http://localhost:5173/?admin=1). Do not use https://247px.com for uploads.
3. Or open the homepage and click **Open gallery editor** / **Add work**.
4. Create a gallery or pick an existing one, then drop JPG / PNG / WebP / GIF / MP4 / WebM files.
5. Click **Save**. Files land in `public/media/` and the gallery is written into `src/data/site.json` in the same format the homepage already reads.
6. Open http://localhost:5173/ to preview, then commit and push to publish.

`npm run admin` starts the same local server and opens the editor for you.

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
