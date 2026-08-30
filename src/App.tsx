import { useEffect, useState } from "react";
import siteData from "./data/site.json";
import Carousel from "./Carousel";
import type { SiteData } from "./types";

const data = siteData as SiteData;

function App() {
  const [activeId, setActiveId] = useState(data.galleries[0]?.id ?? "");

  useEffect(() => {
    const sections = data.galleries
      .map((gallery) => document.getElementById(gallery.id))
      .filter((el): el is HTMLElement => Boolean(el));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.25, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
        setActiveId(id);
      });
    }
  }, []);

  return (
    <div className="page">
      <aside className="sidebar">
        <header className="brand">
          <h1>
            <a href="./">{data.site.name}</a>
          </h1>
          <p className="tagline">{data.site.tagline}</p>
        </header>

        <nav className="project-nav" aria-label="Projects">
          {data.galleries.map((gallery) => (
            <a
              key={gallery.id}
              href={`#${gallery.id}`}
              className={gallery.id === activeId ? "is-active" : undefined}
            >
              <span className="nav-mark" aria-hidden="true" />
              {gallery.label}
            </a>
          ))}
        </nav>

        <footer className="contact">
          {data.site.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              {...(link.href.startsWith("http")
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
            >
              {link.label}
            </a>
          ))}
          {import.meta.env.DEV && (
            <a href="/admin">Add work</a>
          )}
        </footer>
      </aside>

      <div className="fade" aria-hidden="true" />

      <main className="work">
        <p className="hint">{data.site.hint}</p>
        {data.galleries.map((gallery) => (
          <section key={gallery.id} id={gallery.id} className="gallery">
            <Carousel slides={gallery.slides} label={gallery.label} />
          </section>
        ))}
      </main>
    </div>
  );
}

export default App;
