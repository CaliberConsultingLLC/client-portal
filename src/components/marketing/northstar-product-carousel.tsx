"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProductSlide = {
  id: string;
  title: string;
  subtitle: string;
  proof: string;
  imageSrc: string;
  imageAlt: string;
};

const slides: ProductSlide[] = [
  {
    id: "workforce-signal-map",
    title: "Workforce Signal Map",
    subtitle: "See where friction forms before execution slows.",
    proof: "Highlights hidden collaboration drag and relationship pressure points across teams.",
    imageSrc: "/northstar/collaboration-demo.png",
    imageAlt: "Collaboration dashboard showing relationship mapping and score visuals.",
  },
  {
    id: "integration-pulse",
    title: "Integration Pulse View",
    subtitle: "Track people risk and confidence in one read.",
    proof: "Surfaces where sentiment, trust, and leadership alignment diverge by campaign and segment.",
    imageSrc: "/northstar/integration-demo.png",
    imageAlt: "Integration dashboard with longitudinal trends and campaign scoring visuals.",
  },
  {
    id: "action-console",
    title: "Action Priority Console",
    subtitle: "Turn findings into focused leadership moves.",
    proof: "Ranks practical interventions so teams know what to change first and where to monitor impact.",
    imageSrc: "/northstar/portal-preview.png",
    imageAlt: "Portal dashboard directory and management view for action planning.",
  },
];

export function NorthstarProductCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex];
  const progressWidth = useMemo(() => `${((activeIndex + 1) / slides.length) * 100}%`, [activeIndex]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-nsp-orange-100/90">
            Product Carousel
          </p>
          <p className="mt-1 text-sm text-white/85">Hover each card to preview animated dashboard output.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-white/28 bg-white/6 text-white hover:bg-white/14"
            onClick={() => setActiveIndex((current) => (current === 0 ? slides.length - 1 : current - 1))}
            aria-label="Previous product"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-white/28 bg-white/6 text-white hover:bg-white/14"
            onClick={() => setActiveIndex((current) => (current === slides.length - 1 ? 0 : current + 1))}
            aria-label="Next product"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/12">
        <div className="h-full rounded-full bg-nsp-orange-300 transition-all duration-300" style={{ width: progressWidth }} />
      </div>

      <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="nsp-carousel-card group relative min-h-0">
          <div className="nsp-carousel-media-wrap">
            <Image
              src={activeSlide.imageSrc}
              alt={activeSlide.imageAlt}
              fill
              sizes="(min-width: 1280px) 58vw, 100vw"
              className="nsp-carousel-media object-cover object-top"
              priority
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07111b]/90 via-[#07111b]/45 to-transparent px-4 pb-4 pt-14">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-nsp-orange-100/90">
              Live product capture
            </p>
            <p className="mt-1 text-sm font-semibold text-white/92">{activeSlide.title}</p>
          </div>
        </article>

        <aside className="rounded-2xl border border-white/18 bg-white/6 p-4 text-white backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-nsp-orange-100/88">
            {activeIndex + 1}/{slides.length}
          </p>
          <h3 className="mt-2 text-xl font-bold leading-tight">{activeSlide.title}</h3>
          <p className="mt-2 text-sm font-semibold text-nsp-orange-100/95">{activeSlide.subtitle}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/85">{activeSlide.proof}</p>

          <div className="mt-5 space-y-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  index === activeIndex
                    ? "border-nsp-orange-200/80 bg-nsp-orange-100/12 text-white"
                    : "border-white/14 bg-white/4 text-white/72 hover:border-white/28 hover:text-white"
                }`}
              >
                {slide.title}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
