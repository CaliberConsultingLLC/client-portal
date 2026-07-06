import type { Readout, ReadoutOutro } from "@/types/readout";

interface ReadoutOutroProps {
  readout: Readout;
  editing: boolean;
  onFieldBlur: <K extends keyof ReadoutOutro>(field: K, value: string) => void;
  onReviewFindings: () => void;
}

export function ReadoutOutroScreen({
  readout,
  editing,
  onFieldBlur,
  onReviewFindings,
}: ReadoutOutroProps) {
  const outro = readout.outro;

  return (
    <div className="flex h-[calc(100vh-var(--app-top-banner-height))] overflow-hidden">
      <section className="flex w-[420px] flex-col justify-center bg-[linear-gradient(160deg,#242424_0%,#22301f_100%)] px-12 py-14">
        <p
          className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#E8CC70CC]"
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(event) => onFieldBlur("nsHead", event.currentTarget.innerText)}
        >
          {outro.nsHead}
        </p>
        <p
          className="mb-7 font-['Playfair_Display'] text-xl leading-[1.4] text-white"
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(event) => onFieldBlur("nsHero", event.currentTarget.innerText)}
        >
          {outro.nsHero}
        </p>
        <div className="mb-9 space-y-3">
          {[outro.step1, outro.step2, outro.step3].map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-[#E8CC7026] text-[11px] font-bold text-[#E8CC70]">
                {index + 1}
              </span>
              <p
                className="text-[13.5px] leading-[1.55] text-white/65"
                contentEditable={editing}
                suppressContentEditableWarning
                onBlur={(event) =>
                  onFieldBlur((`step${index + 1}` as keyof ReadoutOutro), event.currentTarget.innerText)
                }
              >
                {step}
              </p>
            </div>
          ))}
        </div>
        <div className="mb-5 rounded-[14px] border border-white/10 bg-white/5 px-4 py-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
            Your Caliber team
          </p>
          <p
            className="mb-0.5 text-sm font-semibold text-white"
            contentEditable={editing}
            suppressContentEditableWarning
            onBlur={(event) => onFieldBlur("teamName", event.currentTarget.innerText)}
          >
            {outro.teamName}
          </p>
          <p
            className="text-xs text-white/55"
            contentEditable={editing}
            suppressContentEditableWarning
            onBlur={(event) => onFieldBlur("teamContact", event.currentTarget.innerText)}
          >
            {outro.teamContact}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex w-fit items-center gap-2.5 rounded-full bg-[linear-gradient(135deg,#E8CC70,#C99A3C)] px-5 py-3 text-[13.5px] font-bold text-[#242424] shadow-[0_8px_24px_rgba(201,154,60,0.28)]"
        >
          Schedule a debrief →
        </button>
      </section>

      <section className="flex flex-1 flex-col justify-center overflow-y-auto bg-[#EFF2ED] px-[52px] py-14">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[#2F9151]" />
          <span
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2F9151]"
            contentEditable={editing}
            suppressContentEditableWarning
            onBlur={(event) => onFieldBlur("completeLabel", event.currentTarget.innerText)}
          >
            {outro.completeLabel}
          </span>
        </div>
        <h1
          className="mb-2.5 font-['Playfair_Display'] text-[38px] leading-[1.12] tracking-[-0.01em] text-[#152238]"
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(event) => onFieldBlur("headline", event.currentTarget.innerText)}
        >
          {outro.headline}
        </h1>
        <p
          className="mb-8 text-[15.5px] leading-[1.6] text-[#3B4B63]"
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(event) => onFieldBlur("body", event.currentTarget.innerText)}
        >
          {outro.body}
        </p>

        <div className="mb-8 space-y-2.5">
          {[
            { bg: "#FCF1EF", border: "#F0D6D2", bubble: "#FBEBE9", color: "#C96B60", title: outro.priority1Title, body: outro.priority1Body, titleField: "priority1Title", bodyField: "priority1Body" },
            { bg: "#F1F8F3", border: "#CDE6D5", bubble: "#E7F2EB", color: "#2F9151", title: outro.priority2Title, body: outro.priority2Body, titleField: "priority2Title", bodyField: "priority2Body" },
            { bg: "#FCF1EF", border: "#F0D6D2", bubble: "#FBEBE9", color: "#C96B60", title: outro.priority3Title, body: outro.priority3Body, titleField: "priority3Title", bodyField: "priority3Body" },
          ].map((priority, index) => (
            <div
              key={priority.titleField}
              className="flex items-start gap-4 rounded-[14px] border px-5 py-[18px]"
              style={{ background: priority.bg, borderColor: priority.border }}
            >
              <span
                className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                style={{ background: priority.bubble, color: priority.color }}
              >
                {index + 1}
              </span>
              <div>
                <p
                  className="mb-1 text-[15px] font-bold text-[#152238]"
                  contentEditable={editing}
                  suppressContentEditableWarning
                  onBlur={(event) =>
                    onFieldBlur(priority.titleField as keyof ReadoutOutro, event.currentTarget.innerText)
                  }
                >
                  {priority.title}
                </p>
                <p
                  className="text-[13px] leading-[1.5] text-[#3B4B63]"
                  contentEditable={editing}
                  suppressContentEditableWarning
                  onBlur={(event) =>
                    onFieldBlur(priority.bodyField as keyof ReadoutOutro, event.currentTarget.innerText)
                  }
                >
                  {priority.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onReviewFindings}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#CBD4CC] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#3B4B63]"
        >
          ← Review findings again
        </button>
      </section>
    </div>
  );
}
