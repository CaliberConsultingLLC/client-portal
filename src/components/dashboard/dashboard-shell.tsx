"use client";



import { useEffect, useMemo, useRef, useState } from "react";

import { PortalPageFrame } from "@/components/portal/portal-page-frame";

import { Select } from "@/components/ui/select";

import { cn } from "@/lib/utils";



interface DashboardShellOption {

  id: string;

  label: string;

}



interface DashboardRibbonProps {

  title: string;

  categories?: DashboardShellOption[];

  activeCategoryId?: string;

  onCategoryChange?: (id: string) => void;

  perspectives: DashboardShellOption[];

  activePerspectiveId: string;

  onPerspectiveChange: (id: string) => void;

  legend?: React.ReactNode;

  toolbar?: React.ReactNode;

}



function DashboardOptionButtons({

  options,

  activeId,

  onChange,

}: {

  options: DashboardShellOption[];

  activeId?: string;

  onChange?: (id: string) => void;

}) {

  return (

    <div className="flex min-w-0 items-center gap-1 overflow-hidden">

      {options.map((option) => (

        <button

          key={option.id}

          type="button"

          onClick={() => onChange?.(option.id)}

          className={cn(

            "whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold transition-all",

            activeId === option.id

              ? "bg-[#2B2B2B] text-white shadow-sm"

              : "border border-[#D7DDD4] bg-white text-[#59675C] hover:border-[#B9C4B7] hover:text-[#2B2B2B]"

          )}

        >

          {option.label}

        </button>

      ))}

    </div>

  );

}



function ResponsiveOptionGroup({

  label,

  options,

  activeId,

  onChange,

  className,

}: {

  label: string;

  options: DashboardShellOption[];

  activeId?: string;

  onChange?: (id: string) => void;

  className?: string;

}) {

  const containerRef = useRef<HTMLDivElement>(null);

  const measureRef = useRef<HTMLDivElement>(null);

  const [useSelect, setUseSelect] = useState(false);



  useEffect(() => {

    if (!containerRef.current || !measureRef.current || options.length <= 1) {

      return;

    }



    const updateLayout = () => {

      const availableWidth = containerRef.current?.clientWidth ?? 0;

      const requiredWidth = measureRef.current?.scrollWidth ?? 0;

      setUseSelect(requiredWidth > availableWidth);

    };



    updateLayout();



    const resizeObserver = new ResizeObserver(updateLayout);

    resizeObserver.observe(containerRef.current);

    resizeObserver.observe(measureRef.current);

    window.addEventListener("resize", updateLayout);



    return () => {

      resizeObserver.disconnect();

      window.removeEventListener("resize", updateLayout);

    };

  }, [options]);



  if (options.length === 0) {

    return null;

  }



  const shouldUseSelect = options.length > 1 && useSelect;



  return (

    <div className={cn("min-w-0", className)}>

      <div ref={containerRef} className="min-w-0">

        <div

          ref={measureRef}

          aria-hidden="true"

          className="pointer-events-none absolute -z-10 flex h-0 overflow-hidden opacity-0"

        >

          <DashboardOptionButtons options={options} activeId={activeId} onChange={onChange} />

        </div>



        {shouldUseSelect ? (

          <Select

            aria-label={label}

            value={activeId}

            onChange={(event) => onChange?.(event.target.value)}

            className="h-11 w-auto min-w-[220px] rounded-2xl border-[#D7DDD4] bg-white text-sm font-semibold text-[#2B2B2B] shadow-sm"

          >

            {options.map((option) => (

              <option key={option.id} value={option.id}>

                {option.label}

              </option>

            ))}

          </Select>

        ) : (

          <DashboardOptionButtons options={options} activeId={activeId} onChange={onChange} />

        )}

      </div>

    </div>

  );

}



export function DashboardRibbon({

  title,

  categories = [],

  activeCategoryId,

  onCategoryChange,

  perspectives,

  activePerspectiveId,

  onPerspectiveChange,

  legend,

  toolbar,

}: DashboardRibbonProps) {

  const hasCategories = categories.length > 0;

  const visiblePerspectiveOptions = useMemo(() => perspectives, [perspectives]);



  return (

    <div

      className="sticky z-40 -mt-px w-full"

      style={{ top: "var(--app-top-banner-height, 78px)" }}

    >

      <section className="mx-4 overflow-hidden rounded-b-[28px] border-x border-b border-[#D4DAD6] bg-white/96 shadow-sm backdrop-blur sm:mx-6">

        <div className="flex flex-col gap-3 px-5 py-4">

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">

            <div className="flex shrink-0 items-center justify-center text-center xl:w-[270px] xl:px-3">

              <p className="text-[18px] font-semibold uppercase tracking-[0.16em] leading-none text-[#2B2B2B] sm:text-[20px]">

                {title}

              </p>

            </div>



            <div className="hidden h-10 w-px shrink-0 bg-[#D4DAD6] xl:block" />



            {hasCategories ? (

              <ResponsiveOptionGroup

                label="Categories"

                options={categories}

                activeId={activeCategoryId}

                onChange={onCategoryChange}

                className="xl:px-3"

              />

            ) : null}



            {hasCategories ? (

              <div className="hidden h-10 w-px shrink-0 bg-[#D4DAD6] xl:block" />

            ) : null}



            {visiblePerspectiveOptions.length > 0 ? (

              <div className="flex min-w-0 items-center gap-2 xl:px-3">
                <span className="shrink-0 text-sm font-semibold text-[#59675C]">Reports:</span>
                <ResponsiveOptionGroup

                  label="Perspectives"

                  options={visiblePerspectiveOptions}

                  activeId={activePerspectiveId}

                  onChange={onPerspectiveChange}

                  className="min-w-0"

                />
              </div>

            ) : null}



            {legend ? <div className="shrink-0 xl:ml-auto xl:pl-3">{legend}</div> : null}

          </div>



          {toolbar ? (

            <div className="border-t border-[#D4DAD6] bg-[#F3F5F3]/80 px-5 py-4">{toolbar}</div>

          ) : null}

        </div>

      </section>

    </div>

  );

}



interface DashboardCanvasProps {

  children: React.ReactNode;

  className?: string;

  maxWidthClassName?: string;

  leftRail?: React.ReactNode;

  rightRail?: React.ReactNode;

}



export function DashboardCanvas({

  children,

  className,

  maxWidthClassName = "max-w-[1320px]",

  leftRail,

  rightRail,

}: DashboardCanvasProps) {

  return (

    <PortalPageFrame

      leftRail={leftRail}

      rightRail={rightRail}

      centerMaxWidthClassName={cn("min-h-[700px]", maxWidthClassName)}

      centerClassName={className}

    >

      {children}

    </PortalPageFrame>

  );

}


