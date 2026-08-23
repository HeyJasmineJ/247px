import { useCallback, useRef, useState, type MouseEvent } from "react";
import { asset } from "./asset";
import type { Slide } from "./types";

type Props = {
  slides: Slide[];
  label: string;
};

function SlideMedia({ slide, eager }: { slide: Slide; eager: boolean }) {
  if (slide.type === "vimeo") {
    return (
      <iframe
        src={`${slide.src}?title=0&byline=0&portrait=0`}
        title={slide.alt}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        loading={eager ? "eager" : "lazy"}
      />
    );
  }

  if (slide.type === "video") {
    return (
      <video
        src={asset(slide.src)}
        poster={asset(slide.poster)}
        controls
        playsInline
        preload="none"
      />
    );
  }

  return (
    <img
      src={asset(slide.src)}
      alt={slide.alt}
      width={slide.width ?? undefined}
      height={slide.height ?? undefined}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

function Carousel({ slides, label }: Props) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const goTo = useCallback((next: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(count - 1, next));
    const child = el.children[clamped] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    setIndex(clamped);
  }, [count]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    const next = children.reduce(
      (best, child, i) => {
        const dist = Math.abs(child.offsetLeft - el.scrollLeft);
        return dist < best.dist ? { i, dist } : best;
      },
      { i: 0, dist: Number.POSITIVE_INFINITY },
    ).i;
    if (next !== index) setIndex(next);
  };

  const onClickSlide = (event: MouseEvent<HTMLUListElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = event.target as HTMLElement;
    if (target.closest("video, iframe, button")) return;
    const rect = el.getBoundingClientRect();
    const clickedLeft = event.clientX < rect.left + rect.width / 2;
    goTo(clickedLeft ? index - 1 : index + 1);
  };

  return (
    <section className="carousel" aria-roledescription="carousel" aria-label={label}>
      <ul
        ref={scrollerRef}
        className="carousel-track"
        onScroll={onScroll}
        onClick={onClickSlide}
      >
        {slides.map((slide, i) => (
          <li key={`${slide.src}-${i}`} aria-label={`${i + 1} of ${count}`}>
            <div className="slide">
              <SlideMedia slide={slide} eager={i === 0} />
            </div>
          </li>
        ))}
      </ul>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            className={`carousel-btn prev${index === 0 ? " is-disabled" : ""}`}
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          >
            <img src={asset("/icons/arrow-prev.svg")} alt="" width={40} height={40} />
          </button>
          <button
            type="button"
            aria-label="Next"
            className={`carousel-btn next${index === count - 1 ? " is-disabled" : ""}`}
            disabled={index === count - 1}
            onClick={() => goTo(index + 1)}
          >
            <img src={asset("/icons/arrow-next.svg")} alt="" width={40} height={40} />
          </button>
        </>
      )}
    </section>
  );
}

export default Carousel;
