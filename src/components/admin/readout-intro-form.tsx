import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ReadoutIntro } from "@/types/readout";

interface ReadoutIntroFormProps {
  intro: ReadoutIntro;
  onChange: (nextIntro: ReadoutIntro) => void;
  onSave: () => Promise<void>;
}

export function ReadoutIntroForm({ intro, onChange, onSave }: ReadoutIntroFormProps) {
  function update<K extends keyof ReadoutIntro>(key: K, value: ReadoutIntro[K]) {
    onChange({ ...intro, [key]: value });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <section className="rounded-xl border border-[#D4DAD4] bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7E96]">
            Executive address
          </p>
          <div className="space-y-3">
            <Input
              label="First name (used in headline)"
              value={intro.executiveName}
              onChange={(event) => update("executiveName", event.target.value)}
              onBlur={onSave}
            />
            <Input
              label="Role / team"
              value={intro.executiveRole}
              onChange={(event) => update("executiveRole", event.target.value)}
              onBlur={onSave}
            />
          </div>
        </section>

        <section className="rounded-xl border border-[#D4DAD4] bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7E96]">
            Welcome copy
          </p>
          <div className="space-y-3">
            <Textarea
              label="Headline"
              value={intro.headline}
              onChange={(event) => update("headline", event.target.value)}
              onBlur={onSave}
              className="min-h-[88px]"
            />
            <Textarea
              label="Body paragraph"
              value={intro.body}
              onChange={(event) => update("body", event.target.value)}
              onBlur={onSave}
              className="min-h-[120px]"
            />
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border border-[#D4DAD4] bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7E96]">
            Section previews
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1.6fr] gap-2">
              <Input
                value={intro.section1Title}
                onChange={(event) => update("section1Title", event.target.value)}
                onBlur={onSave}
              />
              <Input
                value={intro.section1Body}
                onChange={(event) => update("section1Body", event.target.value)}
                onBlur={onSave}
              />
            </div>
            <div className="grid grid-cols-[1fr_1.6fr] gap-2">
              <Input
                value={intro.section2Title}
                onChange={(event) => update("section2Title", event.target.value)}
                onBlur={onSave}
              />
              <Input
                value={intro.section2Body}
                onChange={(event) => update("section2Body", event.target.value)}
                onBlur={onSave}
              />
            </div>
            <div className="grid grid-cols-[1fr_1.6fr] gap-2">
              <Input
                value={intro.section3Title}
                onChange={(event) => update("section3Title", event.target.value)}
                onBlur={onSave}
              />
              <Input
                value={intro.section3Body}
                onChange={(event) => update("section3Body", event.target.value)}
                onBlur={onSave}
              />
            </div>
            <div className="grid grid-cols-[1fr_1.6fr] gap-2">
              <Input
                value={intro.section4Title}
                onChange={(event) => update("section4Title", event.target.value)}
                onBlur={onSave}
              />
              <Input
                value={intro.section4Body}
                onChange={(event) => update("section4Body", event.target.value)}
                onBlur={onSave}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#D4DAD4] bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7E96]">
            Attribution
          </p>
          <div className="space-y-3">
            <Input
              label="Prepared by"
              value={intro.preparedBy}
              onChange={(event) => update("preparedBy", event.target.value)}
              onBlur={onSave}
            />
            <Input
              label="Date & response stats"
              value={intro.dateInfo}
              onChange={(event) => update("dateInfo", event.target.value)}
              onBlur={onSave}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
