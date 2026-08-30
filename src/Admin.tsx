import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { asset } from "./asset";
import type { Gallery, SiteData, Slide } from "./types";
import {
  altFromFilename,
  fileKind,
  makeImageSlide,
  makeVideoSlide,
  makeVimeoSlide,
  moveItem,
  parseVimeoSrc,
  uniqueGalleryId,
} from "./adminUtils";
import "./admin.css";

type Notice = { kind: "ok" | "err"; text: string };

async function apiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

async function readSite(): Promise<SiteData> {
  let res: Response;
  try {
    res = await fetch("/api/admin/site");
  } catch {
    throw new Error(
      "Could not reach the editor API. Run npm run dev in the 247px folder and open the localhost URL it prints — not 247px.com.",
    );
  }
  const text = await res.text();
  if (!res.ok) {
    let detail = "";
    try {
      detail = (JSON.parse(text) as { error?: string }).error || "";
    } catch {
      detail = "";
    }
    throw new Error(
      detail ||
        `Editor API failed (${res.status}). Run npm run dev in this project folder, then open the localhost URL.`,
    );
  }
  try {
    return JSON.parse(text) as SiteData;
  } catch {
    throw new Error(
      "The editor API did not start. Stop other servers on this port, then run npm run dev again from the 247px folder.",
    );
  }
}

async function writeSite(data: SiteData): Promise<void> {
  const res = await fetch("/api/admin/site", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await apiError(res, "Could not save site.json"));
}

async function uploadMedia(file: File): Promise<string> {
  const res = await fetch(`/api/admin/media?filename=${encodeURIComponent(file.name)}`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream", "X-Filename": file.name },
    body: file,
  });
  if (!res.ok) throw new Error(await apiError(res, `Upload failed for ${file.name}`));
  const body = (await res.json()) as { src: string };
  return body.src;
}

function readImageMeta(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}`));
    };
    img.src = url;
  });
}

function readVideoMeta(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: video.videoWidth || 0, height: video.videoHeight || 0 });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}`));
    };
    video.src = url;
  });
}

function cloneSite(data: SiteData): SiteData {
  return JSON.parse(JSON.stringify(data)) as SiteData;
}

export default function Admin() {
  const [data, setData] = useState<SiteData | null>(null);
  const [saved, setSaved] = useState<SiteData | null>(null);
  const [activeId, setActiveId] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState("");
  const [loadError, setLoadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [vimeoOpen, setVimeoOpen] = useState(false);
  const [vimeoUrl, setVimeoUrl] = useState("");
  const [vimeoAlt, setVimeoAlt] = useState("");
  const [dragSlide, setDragSlide] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);
  const posterIndex = useRef<number | null>(null);

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(saved), [data, saved]);
  const gallery = data?.galleries.find((item) => item.id === activeId) ?? null;

  useEffect(() => {
    readSite()
      .then((site) => {
        setData(site);
        setSaved(cloneSite(site));
        setActiveId(site.galleries[0]?.id ?? "");
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const updateGallery = useCallback(
    (id: string, patch: Partial<Gallery> | ((current: Gallery) => Gallery)) => {
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          galleries: current.galleries.map((item) => {
            if (item.id !== id) return item;
            return typeof patch === "function" ? patch(item) : { ...item, ...patch };
          }),
        };
      });
    },
    [],
  );

  const show = (kind: Notice["kind"], text: string) => {
    setNotice({ kind, text });
  };

  const onDropFiles = async (files: FileList | File[]) => {
    if (!data || !gallery) return;
    const list = Array.from(files);
    if (!list.length) return;

    setBusy("Preparing uploads…");
    const created: Slide[] = [];
    const skipped: string[] = [];

    try {
      for (let i = 0; i < list.length; i += 1) {
        const file = list[i];
        const kind = fileKind(file);
        if (!kind) {
          skipped.push(file.name);
          continue;
        }
        setBusy(`Uploading ${i + 1} of ${list.length} — ${file.name}`);
        const src = await uploadMedia(file);
        const alt = altFromFilename(file.name);
        if (kind === "image") {
          const meta = await readImageMeta(file);
          created.push(makeImageSlide(src, meta.width, meta.height, alt));
        } else {
          const meta = await readVideoMeta(file);
          created.push(makeVideoSlide(src, meta.width || null, meta.height || null, alt));
        }
      }

      if (created.length) {
        updateGallery(gallery.id, (current) => ({
          ...current,
          slides: [...current.slides, ...created],
        }));
      }

      if (skipped.length) {
        show(
          created.length ? "ok" : "err",
          `${created.length} added. Skipped unsupported files (use JPG, PNG, WebP, GIF, MP4, or WebM): ${skipped.join(", ")}`,
        );
      } else if (created.length) {
        show("ok", `Added ${created.length} file${created.length === 1 ? "" : "s"}. Click Save to write them into the site.`);
      }
    } catch (err) {
      show("err", err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy("");
      setDragging(false);
    }
  };

  const addVimeo = () => {
    if (!gallery) return;
    const src = parseVimeoSrc(vimeoUrl);
    if (!src) {
      show("err", "Paste a Vimeo URL or video ID.");
      return;
    }
    updateGallery(gallery.id, (current) => ({
      ...current,
      slides: [...current.slides, makeVimeoSlide(src, vimeoAlt.trim() || gallery.label)],
    }));
    setVimeoUrl("");
    setVimeoAlt("");
    setVimeoOpen(false);
    show("ok", "Vimeo slide added. Click Save when you are ready.");
  };

  const addPoster = async (file: File | undefined) => {
    const index = posterIndex.current;
    posterIndex.current = null;
    if (!gallery || index == null || !file) return;
    if (fileKind(file) !== "image") {
      show("err", "Poster must be a JPG, PNG, WebP, or GIF.");
      return;
    }
    try {
      setBusy(`Uploading poster — ${file.name}`);
      const src = await uploadMedia(file);
      updateGallery(gallery.id, (current) => ({
        ...current,
        slides: current.slides.map((slide, i) => (i === index ? { ...slide, poster: src } : slide)),
      }));
      show("ok", "Poster added. Click Save when you are ready.");
    } catch (err) {
      show("err", err instanceof Error ? err.message : "Poster upload failed");
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    if (!data) return;
    const empty = data.galleries.find((item) => item.slides.length === 0);
    if (empty) {
      show("err", `"${empty.label || "Untitled"}" has no photos yet. Add at least one slide before saving.`);
      return;
    }
    const ids = data.galleries.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      show("err", "Two galleries share the same id. Change one of the titles so the URLs stay unique.");
      return;
    }
    try {
      setBusy("Saving site.json…");
      await writeSite(data);
      setSaved(cloneSite(data));
      show("ok", "Saved. The homepage will pick this up on refresh. Commit and push to publish.");
    } catch (err) {
      show("err", err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy("");
    }
  };

  const createGallery = () => {
    if (!data) return;
    const label = "New gallery";
    const id = uniqueGalleryId(label, data.galleries);
    const next: Gallery = { id, label, slides: [] };
    setData({ ...data, galleries: [next, ...data.galleries] });
    setActiveId(id);
    setVimeoOpen(false);
    show("ok", "New gallery started. Drop photos, then Save.");
  };

  const renameGallery = (label: string) => {
    if (!gallery || !data) return;
    const existing = saved?.galleries.some((item) => item.id === gallery.id);
    const id = existing ? gallery.id : uniqueGalleryId(label, data.galleries, gallery.id);
    setData({
      ...data,
      galleries: data.galleries.map((item) => (item.id === gallery.id ? { ...item, label, id } : item)),
    });
    setActiveId(id);
  };

  const removeGallery = () => {
    if (!data || !gallery) return;
    if (!window.confirm(`Remove “${gallery.label}” from the site? Photo files stay on disk.`)) return;
    const next = data.galleries.filter((item) => item.id !== gallery.id);
    setData({ ...data, galleries: next });
    setActiveId(next[0]?.id ?? "");
  };

  if (loadError) {
    return (
      <div className="admin admin-error">
        <h1>Gallery editor</h1>
        <p>{loadError}</p>
        <p>Run <code>npm run dev</code> in the 247px folder, then open the localhost link it prints. Do not use 247px.com for uploads.</p>
        <a href="/">Back to site</a>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin admin-error">
        <p>Loading galleries…</p>
      </div>
    );
  }

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <header className="admin-brand">
          <h1>
            <a href="/">247px</a>
          </h1>
          <p>Gallery editor</p>
        </header>

        <button type="button" className="admin-primary" onClick={createGallery} disabled={Boolean(busy)}>
          New gallery
        </button>

        <nav className="admin-nav" aria-label="Galleries">
          {data.galleries.map((item, index) => (
            <div key={item.id} className={`admin-nav-row${item.id === activeId ? " is-active" : ""}`}>
              <button type="button" className="admin-nav-item" onClick={() => setActiveId(item.id)}>
                <span className="nav-mark" aria-hidden="true" />
                {item.label || "Untitled"}
                <span className="admin-count">{item.slides.length}</span>
              </button>
              <div className="admin-nav-move">
                <button
                  type="button"
                  aria-label={`Move ${item.label} up`}
                  disabled={index === 0}
                  onClick={() =>
                    setData({ ...data, galleries: moveItem(data.galleries, index, index - 1) })
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${item.label} down`}
                  disabled={index === data.galleries.length - 1}
                  onClick={() =>
                    setData({ ...data, galleries: moveItem(data.galleries, index, index + 1) })
                  }
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </nav>

        <footer className="admin-foot">
          <a href="/">← Back to site</a>
          {dirty && <span>Unsaved changes</span>}
        </footer>
      </aside>

      <main className="admin-main">
        {!gallery ? (
          <p className="admin-empty">Create a gallery to start adding photos.</p>
        ) : (
          <>
            <header className="admin-toolbar">
              <label className="admin-label-field">
                <span>Gallery title</span>
                <input
                  value={gallery.label}
                  onChange={(event) => renameGallery(event.target.value)}
                  placeholder="e.g. SZA"
                />
                <small>#{gallery.id}</small>
              </label>
              <div className="admin-actions">
                <button type="button" className="admin-primary" onClick={save} disabled={Boolean(busy) || !dirty}>
                  Save
                </button>
                <button type="button" className="admin-danger" onClick={removeGallery} disabled={Boolean(busy)}>
                  Remove gallery
                </button>
              </div>
            </header>

            {notice && <p className={`admin-notice is-${notice.kind}`}>{notice.text}</p>}
            {busy && <p className="admin-busy">{busy}</p>}

            <div
              className={`admin-drop${dragging ? " is-over" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                void onDropFiles(event.dataTransfer.files);
              }}
            >
              <p>Drop photos or videos here — same format the site already uses.</p>
              <p className="admin-muted">JPG, PNG, WebP, GIF, MP4, or WebM. Dimensions are read automatically.</p>
              <div className="admin-drop-actions">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>
                  Choose files
                </button>
                <button type="button" onClick={() => setVimeoOpen((open) => !open)} disabled={Boolean(busy)}>
                  Add Vimeo
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                multiple
                hidden
                onChange={(event) => {
                  if (event.target.files) void onDropFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>

            {vimeoOpen && (
              <div className="admin-vimeo">
                <input
                  value={vimeoUrl}
                  onChange={(event) => setVimeoUrl(event.target.value)}
                  placeholder="https://vimeo.com/123456789"
                />
                <input
                  value={vimeoAlt}
                  onChange={(event) => setVimeoAlt(event.target.value)}
                  placeholder="Alt text"
                />
                <button type="button" className="admin-primary" onClick={addVimeo}>
                  Add
                </button>
              </div>
            )}

            <ul className="admin-slides">
              {gallery.slides.map((slide, index) => (
                <li
                  key={`${slide.src}-${index}`}
                  className="admin-slide"
                  draggable
                  onDragStart={() => setDragSlide(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragSlide == null) return;
                    updateGallery(gallery.id, (current) => ({
                      ...current,
                      slides: moveItem(current.slides, dragSlide, index),
                    }));
                    setDragSlide(null);
                  }}
                >
                  <div className="admin-thumb">
                    {slide.type === "image" && <img src={asset(slide.src)} alt="" />}
                    {slide.type === "video" &&
                      (slide.poster ? (
                        <img src={asset(slide.poster)} alt="" />
                      ) : (
                        <video src={asset(slide.src)} muted playsInline preload="metadata" />
                      ))}
                    {slide.type === "vimeo" && <span>Vimeo</span>}
                  </div>
                  <div className="admin-slide-meta">
                    <span className="admin-type">{slide.type}</span>
                    <input
                      value={slide.alt}
                      onChange={(event) =>
                        updateGallery(gallery.id, (current) => ({
                          ...current,
                          slides: current.slides.map((item, i) =>
                            i === index ? { ...item, alt: event.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="Alt text"
                    />
                    <small>
                      {slide.width && slide.height ? `${slide.width} × ${slide.height}` : "size unknown"} · {slide.src}
                    </small>
                    {slide.type === "video" && (
                      <button
                        type="button"
                        className="admin-linkish"
                        onClick={() => {
                          posterIndex.current = index;
                          posterRef.current?.click();
                        }}
                      >
                        {slide.poster ? "Replace poster" : "Add poster"}
                      </button>
                    )}
                  </div>
                  <div className="admin-slide-move">
                    <button
                      type="button"
                      aria-label="Move slide earlier"
                      disabled={index === 0}
                      onClick={() =>
                        updateGallery(gallery.id, (current) => ({
                          ...current,
                          slides: moveItem(current.slides, index, index - 1),
                        }))
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move slide later"
                      disabled={index === gallery.slides.length - 1}
                      onClick={() =>
                        updateGallery(gallery.id, (current) => ({
                          ...current,
                          slides: moveItem(current.slides, index, index + 1),
                        }))
                      }
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="admin-danger"
                      onClick={() =>
                        updateGallery(gallery.id, (current) => ({
                          ...current,
                          slides: current.slides.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {gallery.slides.length === 0 && (
              <p className="admin-empty">This gallery is empty. Drop files above to match the existing carousels.</p>
            )}

            <input
              ref={posterRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => {
                void addPoster(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}
