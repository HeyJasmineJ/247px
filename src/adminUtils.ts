import type { Gallery, Slide } from "./types";

export function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "gallery"
  );
}

export function uniqueGalleryId(label: string, galleries: Gallery[], keepId?: string): string {
  const base = slugify(label);
  const used = new Set(galleries.map((gallery) => gallery.id).filter((id) => id !== keepId));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function aspectRatio(width: number, height: number): number {
  if (!width || !height) return 0.666667;
  return Number((width / height).toFixed(6));
}

export function makeImageSlide(src: string, width: number, height: number, alt: string): Slide {
  return {
    type: "image",
    src,
    width,
    height,
    aspect: aspectRatio(width, height),
    alt,
  };
}

export function makeVideoSlide(
  src: string,
  width: number | null,
  height: number | null,
  alt: string,
  poster?: string,
): Slide {
  const slide: Slide = {
    type: "video",
    src,
    width,
    height,
    aspect: width && height ? aspectRatio(width, height) : 0.666667,
    alt,
  };
  if (poster) slide.poster = poster;
  return slide;
}

export function parseVimeoSrc(input: string): string | null {
  const trimmed = input.trim();
  const player = trimmed.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (player) return `https://player.vimeo.com/video/${player[1]}`;
  const page = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (page) return `https://player.vimeo.com/video/${page[1]}`;
  if (/^\d+$/.test(trimmed)) return `https://player.vimeo.com/video/${trimmed}`;
  return null;
}

export function makeVimeoSlide(src: string, alt: string): Slide {
  return {
    type: "vimeo",
    src,
    width: 240,
    height: 426,
    aspect: 0.56338,
    alt,
  };
}

export function altFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Untitled";
}

export function fileKind(file: File): "image" | "video" | null {
  const name = file.name.toLowerCase();
  if (/\.(jpe?g|png|webp|gif)$/.test(name)) return "image";
  if (/\.(mp4|webm)$/.test(name)) return "video";
  if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif") {
    return "image";
  }
  if (file.type === "video/mp4" || file.type === "video/webm") return "video";
  return null;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
