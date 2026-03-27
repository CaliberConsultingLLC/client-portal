import { ShieldCheck, ArrowRight } from "lucide-react";
import { PortalSignInForm } from "@/components/portal/portal-sign-in-form";
import { CaliberLogo } from "@/components/shared/caliber-logo";

const portalHighlights = [
  "Secure client-specific dashboard access",
  "Reports, documents, and resources in one place",
  "Role-ready foundation for future permissions",
];

export default function PortalLoginPage() {
  return (
    <main className="min-h-screen bg-[#EEF2F4]">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(232,204,112,0.2),_transparent_34%),linear-gradient(135deg,_#344954_0%,_#18384E_58%,_#0F2433_100%)] px-8 py-10 text-white lg:px-12 lg:py-12">
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <CaliberLogo variant="light" size="default" />
              <div className="mt-16 max-w-[520px]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8CC70]">
                  Secure Client Access
                </p>
                <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-tight text-white">
                  A clean portal for dashboards, reports, and client materials.
                </h1>
                <p className="mt-6 max-w-[460px] text-base leading-relaxed text-white/78">
                  Designed to give each client a focused, private entry point into their work with
                  Caliber Consulting, with room to expand into role-based access and more tailored
                  experiences over time.
                </p>
              </div>
            </div>

            <div className="grid max-w-[540px] gap-4 sm:grid-cols-3">
              {portalHighlights.map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8CC70]/18 text-[#E8CC70]">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-relaxed text-white/82">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute -left-24 top-14 h-[420px] w-[420px] rounded-full border border-[#E8CC70]/20" />
            <div className="absolute left-20 top-20 h-[520px] w-[520px] rounded-full border border-white/10" />
            <div className="absolute bottom-10 right-[-120px] h-[360px] w-[360px] rounded-full border border-[#E8CC70]/16" />
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 lg:px-10">
          <div className="w-full max-w-[520px]">
            <PortalSignInForm />
            <div className="mt-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#60727D]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#D9B85C]" />
              Protected by Supabase authentication
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
