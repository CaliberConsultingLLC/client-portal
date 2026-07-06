import type { Readout, ReadoutIntro } from "@/types/readout";

interface ReadoutIntroProps {
  readout: Readout;
  clientName: string;
  editing: boolean;
  onBegin: () => void;
  onFieldBlur: <K extends keyof ReadoutIntro>(field: K, value: string) => void;
}

export function ReadoutIntroScreen({
  readout,
  clientName,
  editing,
  onBegin,
  onFieldBlur,
}: ReadoutIntroProps) {
  const intro = readout.intro;

  return (
    <div className="flex h-[calc(100vh-var(--app-top-banner-height))] overflow-hidden">
      <section className="flex w-[500px] flex-col justify-center bg-[linear-gradient(160deg,#242424_0%,#22301f_100%)] px-[52px] py-16">
        <div className="mb-10 flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E8CC70]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#E8CC70CC]">
            {clientName} - {intro.dateInfo || "Latest campaign"}
          </span>
        </div>
        <h1
          className="mb-5 font-['Playfair_Display'] text-[40px] leading-[1.12] tracking-[-0.01em] text-white"
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(event) => onFieldBlur("headline", event.currentTarget.innerText)}
        >
          {intro.headline}
        </h1>
        <p
          className="mb-8 text-[15.5px] leading-[1.65] text-white/65"
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(event) => onFieldBlur("body", event.currentTarget.innerText)}
        >
          {intro.body}
        </p>
        <div className="mb-10 space-y-3 text-[13px] text-white/55">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#E8CC7026] text-[11px] font-bold text-[#E8CC70]">
              {readout.findings.filter((finding) => finding.enabled).length}
            </span>
            Findings, ordered by impact
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#E8CC7026] text-[11px] font-bold text-[#E8CC70]">
              ~8
            </span>
            Minutes to read through
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#E8CC7026] text-[13px] text-[#E8CC70]">
              ↗
            </span>
            Live data behind every finding
          </div>
        </div>
        <button
          type="button"
          onClick={onBegin}
          className="inline-flex w-fit items-center gap-2.5 rounded-full bg-[linear-gradient(135deg,#E8CC70,#C99A3C)] px-6 py-3.5 text-sm font-bold text-[#242424] shadow-[0_8px_24px_rgba(201,154,60,0.3)]"
        >
          Begin your readout <span className="text-[15px]">→</span>
        </button>
      </section>

      <section className="flex flex-1 flex-col justify-center overflow-y-auto bg-[#EFF2ED] px-[52px] py-14">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6E7E96]">
          What&apos;s in this readout
        </p>
        <p
          className="mb-7 font-['Playfair_Display'] text-[21px] leading-[1.35] text-[#152238]"
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(event) => onFieldBlur("subHead", event.currentTarget.innerText)}
        >
          {intro.subHead}
        </p>

        <div className="mb-9 space-y-2.5">
          {[
            { dot: "#5E7898", title: intro.section1Title, body: intro.section1Body, titleField: "section1Title", bodyField: "section1Body", border: "#DCE3DD" },
            { dot: "#2F9151", title: intro.section2Title, body: intro.section2Body, titleField: "section2Title", bodyField: "section2Body", border: "#CDE6D5" },
            { dot: "#C96B60", title: intro.section3Title, body: intro.section3Body, titleField: "section3Title", bodyField: "section3Body", border: "#F0D6D2" },
            { dot: "#C99A3C", title: intro.section4Title, body: intro.section4Body, titleField: "section4Title", bodyField: "section4Body", border: "#F0E2B6" },
          ].map((section) => (
            <div
              key={section.titleField}
              className="flex items-start gap-3.5 rounded-[14px] border bg-white px-[18px] py-[15px]"
              style={{ borderColor: section.border }}
            >
              <span className="mt-[5px] h-2 w-2 flex-shrink-0 rounded-full" style={{ background: section.dot }} />
              <div>
                <p
                  className="mb-0.5 text-[12.5px] font-bold text-[#152238]"
                  contentEditable={editing}
                  suppressContentEditableWarning
                  onBlur={(event) =>
                    onFieldBlur(section.titleField as keyof ReadoutIntro, event.currentTarget.innerText)
                  }
                >
                  {section.title}
                </p>
                <p
                  className="text-xs leading-[1.5] text-[#6E7E96]"
                  contentEditable={editing}
                  suppressContentEditableWarning
                  onBlur={(event) =>
                    onFieldBlur(section.bodyField as keyof ReadoutIntro, event.currentTarget.innerText)
                  }
                >
                  {section.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[14px] border border-[#8798AA] bg-white px-5 py-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Prepared by</p>
          <p
            className="mb-0.5 text-sm font-semibold text-[#152238]"
            contentEditable={editing}
            suppressContentEditableWarning
            onBlur={(event) => onFieldBlur("preparedBy", event.currentTarget.innerText)}
          >
            {intro.preparedBy}
          </p>
          <p
            className="text-xs text-[#6E7E96]"
            contentEditable={editing}
            suppressContentEditableWarning
            onBlur={(event) => onFieldBlur("dateInfo", event.currentTarget.innerText)}
          >
            {intro.dateInfo}
          </p>
        </div>
      </section>
    </div>
  );
}
