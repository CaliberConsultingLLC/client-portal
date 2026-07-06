import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ReadoutOutro } from "@/types/readout";

interface ReadoutOutroFormProps {
  outro: ReadoutOutro;
  onChange: (nextOutro: ReadoutOutro) => void;
  onSave: () => Promise<void>;
}

export function ReadoutOutroForm({ outro, onChange, onSave }: ReadoutOutroFormProps) {
  function update<K extends keyof ReadoutOutro>(key: K, value: ReadoutOutro[K]) {
    onChange({ ...outro, [key]: value });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <section className="rounded-xl border border-[#D4DAD4] bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7E96]">
            Next steps panel
          </p>
          <div className="space-y-3">
            <Input
              label="Heading label"
              value={outro.nsHead}
              onChange={(event) => update("nsHead", event.target.value)}
              onBlur={onSave}
            />
            <Textarea
              label="Hero text"
              value={outro.nsHero}
              onChange={(event) => update("nsHero", event.target.value)}
              onBlur={onSave}
              className="min-h-[88px]"
            />
            <Input
              label="Step 1"
              value={outro.step1}
              onChange={(event) => update("step1", event.target.value)}
              onBlur={onSave}
            />
            <Input
              label="Step 2"
              value={outro.step2}
              onChange={(event) => update("step2", event.target.value)}
              onBlur={onSave}
            />
            <Input
              label="Step 3"
              value={outro.step3}
              onChange={(event) => update("step3", event.target.value)}
              onBlur={onSave}
            />
          </div>
        </section>

        <section className="rounded-xl border border-[#D4DAD4] bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7E96]">
            Team contact
          </p>
          <div className="space-y-3">
            <Input
              label="Team name"
              value={outro.teamName}
              onChange={(event) => update("teamName", event.target.value)}
              onBlur={onSave}
            />
            <Input
              label="Contact"
              value={outro.teamContact}
              onChange={(event) => update("teamContact", event.target.value)}
              onBlur={onSave}
            />
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border border-[#D4DAD4] bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7E96]">
            Completion panel
          </p>
          <div className="space-y-3">
            <Input
              label="Completion label"
              value={outro.completeLabel}
              onChange={(event) => update("completeLabel", event.target.value)}
              onBlur={onSave}
            />
            <Textarea
              label="Headline"
              value={outro.headline}
              onChange={(event) => update("headline", event.target.value)}
              onBlur={onSave}
              className="min-h-[88px]"
            />
            <Textarea
              label="Body"
              value={outro.body}
              onChange={(event) => update("body", event.target.value)}
              onBlur={onSave}
              className="min-h-[110px]"
            />
          </div>
        </section>

        <section className="rounded-xl border border-[#D4DAD4] bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7E96]">
            Priority cards
          </p>
          <div className="space-y-3">
            <Input
              label="Priority 1 title"
              value={outro.priority1Title}
              onChange={(event) => update("priority1Title", event.target.value)}
              onBlur={onSave}
            />
            <Input
              label="Priority 1 body"
              value={outro.priority1Body}
              onChange={(event) => update("priority1Body", event.target.value)}
              onBlur={onSave}
            />
            <Input
              label="Priority 2 title"
              value={outro.priority2Title}
              onChange={(event) => update("priority2Title", event.target.value)}
              onBlur={onSave}
            />
            <Input
              label="Priority 2 body"
              value={outro.priority2Body}
              onChange={(event) => update("priority2Body", event.target.value)}
              onBlur={onSave}
            />
            <Input
              label="Priority 3 title"
              value={outro.priority3Title}
              onChange={(event) => update("priority3Title", event.target.value)}
              onBlur={onSave}
            />
            <Input
              label="Priority 3 body"
              value={outro.priority3Body}
              onChange={(event) => update("priority3Body", event.target.value)}
              onBlur={onSave}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
