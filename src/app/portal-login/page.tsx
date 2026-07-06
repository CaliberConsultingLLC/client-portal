import { Suspense } from "react";
import Image from "next/image";
import { PortalSignInForm } from "@/components/portal/portal-sign-in-form";

export default function PortalLoginPage() {
  return (
    <main className="min-h-screen bg-[#EEF2EE]">
      <div className="grid min-h-screen lg:grid-cols-[1.62fr_1fr]">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(215,179,90,0.2),_transparent_32%),linear-gradient(140deg,_#303030_0%,_#242424_58%,_#386B45_140%)] text-white">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,14,22,0.02)_0%,rgba(6,14,22,0.12)_50%,rgba(6,14,22,0.28)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(3,9,15,0.34)_0%,_rgba(3,9,15,0.22)_22%,_rgba(3,9,15,0.1)_36%,_transparent_58%)]" />
          <div className="absolute left-[10%] top-[10%] h-[320px] w-[420px] rounded-full bg-[#386B45]/18 blur-[96px]" />
          <div className="absolute bottom-[18%] right-[8%] h-[280px] w-[360px] rounded-full bg-[#D7B35A]/12 blur-[104px]" />
          <div className="absolute left-[38%] top-[34%] h-[240px] w-[300px] rounded-full bg-white/5 blur-[90px]" />
          <div className="pointer-events-none absolute inset-0">
            <svg
              className="absolute inset-0 h-full w-full opacity-70"
              viewBox="0 0 1000 900"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M -80 670 C 110 470, 360 390, 690 430"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M 20 760 C 210 560, 430 500, 760 540"
                fill="none"
                stroke="rgba(232,204,112,0.11)"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
              <path
                d="M 130 180 C 300 120, 500 140, 700 250"
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
              <path
                d="M 250 -20 C 420 80, 470 210, 430 410"
                fill="none"
                stroke="rgba(232,204,112,0.09)"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <path
                d="M 520 60 C 680 180, 720 330, 650 560"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <path
                d="M 40 520 C 170 320, 360 250, 560 260"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.95"
                strokeLinecap="round"
              />
              <path
                d="M -40 260 C 150 180, 330 180, 520 310"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <path
                d="M 90 840 C 250 650, 470 590, 780 640"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <path
                d="M 310 40 C 420 120, 520 230, 560 370"
                fill="none"
                stroke="rgba(232,204,112,0.1)"
                strokeWidth="0.95"
                strokeLinecap="round"
              />
              <path
                d="M 560 140 C 740 220, 820 360, 835 560"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.95"
                strokeLinecap="round"
              />
              <path
                d="M 110 430 C 220 350, 360 330, 530 360"
                fill="none"
                stroke="rgba(232,204,112,0.08)"
                strokeWidth="0.95"
                strokeLinecap="round"
              />
              <path
                d="M 250 640 C 380 560, 560 550, 740 620"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
              <path
                d="M -30 560 C 120 430, 280 390, 470 420"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.85"
                strokeLinecap="round"
              />
              <path
                d="M 140 110 C 300 70, 470 90, 655 190"
                fill="none"
                stroke="rgba(232,204,112,0.08)"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
              <path
                d="M 420 10 C 560 120, 620 250, 610 430"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.85"
                strokeLinecap="round"
              />
              <path
                d="M 640 170 C 770 280, 820 390, 805 540"
                fill="none"
                stroke="rgba(232,204,112,0.07)"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
              <path
                d="M 180 760 C 320 660, 520 640, 760 700"
                fill="none"
                stroke="rgba(255,255,255,0.045)"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              <path
                d="M 80 350 C 180 270, 340 245, 510 280"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              <path
                d="M 290 560 C 450 470, 640 465, 815 520"
                fill="none"
                stroke="rgba(232,204,112,0.06)"
                strokeWidth="0.82"
                strokeLinecap="round"
              />
              <path
                d="M 500 280 C 590 315, 640 390, 642 500"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.78"
                strokeLinecap="round"
              />
              <path
                d="M 20 120 C 120 160, 180 220, 210 320"
                fill="none"
                stroke="rgba(232,204,112,0.055)"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              <path
                d="M 700 40 C 760 120, 790 210, 785 330"
                fill="none"
                stroke="rgba(255,255,255,0.045)"
                strokeWidth="0.78"
                strokeLinecap="round"
              />
              <path
                d="M 40 120 C 230 40, 430 45, 650 130"
                fill="none"
                stroke="rgba(255,255,255,0.045)"
                strokeWidth="0.72"
                strokeLinecap="round"
              />
              <path
                d="M 610 30 C 760 120, 860 260, 900 430"
                fill="none"
                stroke="rgba(232,204,112,0.065)"
                strokeWidth="0.74"
                strokeLinecap="round"
              />
              <path
                d="M 100 860 C 250 720, 430 665, 650 675"
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.7"
                strokeLinecap="round"
              />
              <path
                d="M -20 410 C 110 350, 250 340, 390 360"
                fill="none"
                stroke="rgba(232,204,112,0.055)"
                strokeWidth="0.72"
                strokeLinecap="round"
              />
              <path
                d="M 330 180 C 450 245, 520 345, 520 470"
                fill="none"
                stroke="rgba(255,255,255,0.042)"
                strokeWidth="0.7"
                strokeLinecap="round"
              />
              <path
                d="M 180 500 C 340 430, 510 430, 690 490"
                fill="none"
                stroke="rgba(255,255,255,0.042)"
                strokeWidth="0.72"
                strokeLinecap="round"
              />
              <path
                d="M 250 300 C 360 270, 470 285, 600 345"
                fill="none"
                stroke="rgba(232,204,112,0.05)"
                strokeWidth="0.68"
                strokeLinecap="round"
              />
              <path
                d="M 420 780 C 560 705, 710 690, 860 730"
                fill="none"
                stroke="rgba(255,255,255,0.038)"
                strokeWidth="0.68"
                strokeLinecap="round"
              />
              <path
                d="M 760 250 C 835 325, 870 410, 868 520"
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.68"
                strokeLinecap="round"
              />
              <path
                d="M 70 640 C 180 560, 305 530, 450 542"
                fill="none"
                stroke="rgba(232,204,112,0.05)"
                strokeWidth="0.7"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute left-[-110px] top-[-80px] h-[320px] w-[320px] rounded-full border border-white/8" />
            <div className="absolute left-[18%] top-[12%] h-[420px] w-[420px] rounded-full border border-[#E8CC70]/10" />
            <div className="absolute bottom-[-120px] right-[12%] h-[340px] w-[340px] rounded-full border border-white/7" />
            <div className="absolute right-[-70px] top-[18%] h-[220px] w-[220px] rounded-full border border-white/6" />
            <div className="absolute left-[8%] bottom-[10%] h-[260px] w-[260px] rounded-full border border-[#E8CC70]/8" />
            <div className="absolute left-[30%] top-[-90px] h-[280px] w-[280px] rounded-full border border-white/6" />
            <div className="absolute right-[18%] bottom-[-140px] h-[300px] w-[300px] rounded-full border border-[#E8CC70]/7" />
            <div className="absolute left-[42%] top-[22%] h-[160px] w-[160px] rounded-full border border-white/5" />
            <div className="absolute left-[56%] top-[48%] h-[210px] w-[210px] rounded-full border border-white/4" />
            <div className="absolute left-[66%] top-[14%] h-[180px] w-[180px] rounded-full border border-white/4" />
            <div className="absolute right-[6%] bottom-[20%] h-[180px] w-[180px] rounded-full border border-white/4" />
            <div className="absolute left-[24%] bottom-[-60px] h-[220px] w-[220px] rounded-full border border-[#E8CC70]/6" />
            <div className="absolute left-[52%] top-[-40px] h-[200px] w-[200px] rounded-full border border-white/5" />
            <div className="absolute left-[4%] top-[30%] h-[140px] w-[140px] rounded-full border border-white/4" />
            <div className="absolute left-[72%] top-[34%] h-[150px] w-[150px] rounded-full border border-[#E8CC70]/5" />
            <div className="absolute right-[22%] top-[6%] h-[130px] w-[130px] rounded-full border border-white/4" />
            <div className="absolute right-[2%] top-[58%] h-[150px] w-[150px] rounded-full border border-white/3" />
            <div className="absolute left-[44%] bottom-[-30px] h-[170px] w-[170px] rounded-full border border-white/4" />
            <div className="absolute left-[14%] top-[78%] h-[120px] w-[120px] rounded-full border border-[#E8CC70]/4" />
            <div className="absolute left-[28%] top-[32%] h-px w-[240px] bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
            <div className="absolute left-[12%] top-[58%] h-px w-[320px] bg-gradient-to-r from-white/0 via-[#E8CC70]/12 to-white/0" />
            <div className="absolute right-[8%] top-[28%] h-px w-[220px] bg-gradient-to-r from-white/0 via-white/8 to-white/0" />
            <div className="absolute left-[18%] top-[18%] h-[160px] w-px bg-gradient-to-b from-white/0 via-white/8 to-white/0" />
            <div className="absolute left-[38%] bottom-[14%] h-[180px] w-px bg-gradient-to-b from-white/0 via-[#E8CC70]/10 to-white/0" />
            <div className="absolute left-[48%] top-[12%] h-[220px] w-px bg-gradient-to-b from-white/0 via-white/6 to-white/0" />
            <div className="absolute right-[16%] top-[54%] h-px w-[180px] bg-gradient-to-r from-white/0 via-[#E8CC70]/10 to-white/0" />
            <div className="absolute left-[22%] top-[72%] h-px w-[210px] bg-gradient-to-r from-white/0 via-white/7 to-white/0" />
            <div className="absolute left-[62%] top-[42%] h-px w-[150px] bg-gradient-to-r from-white/0 via-white/7 to-white/0" />
            <div className="absolute left-[10%] top-[44%] h-px w-[170px] bg-gradient-to-r from-white/0 via-[#E8CC70]/9 to-white/0" />
            <div className="absolute right-[10%] top-[72%] h-px w-[190px] bg-gradient-to-r from-white/0 via-white/6 to-white/0" />
            <div className="absolute left-[30%] top-[8%] h-[120px] w-px bg-gradient-to-b from-white/0 via-white/7 to-white/0" />
            <div className="absolute right-[24%] top-[20%] h-[150px] w-px bg-gradient-to-b from-white/0 via-[#E8CC70]/8 to-white/0" />
            <div className="absolute right-[34%] bottom-[10%] h-[130px] w-px bg-gradient-to-b from-white/0 via-white/6 to-white/0" />
            <div className="absolute left-[58%] top-[8%] h-px w-[120px] bg-gradient-to-r from-white/0 via-white/6 to-white/0" />
            <div className="absolute left-[68%] top-[62%] h-px w-[130px] bg-gradient-to-r from-white/0 via-[#E8CC70]/7 to-white/0" />
            <div className="absolute left-[6%] top-[64%] h-px w-[110px] bg-gradient-to-r from-white/0 via-white/5 to-white/0" />
            <div className="absolute left-[26%] bottom-[24%] h-px w-[140px] bg-gradient-to-r from-white/0 via-white/6 to-white/0" />
            <div className="absolute left-[78%] top-[22%] h-[90px] w-px bg-gradient-to-b from-white/0 via-white/5 to-white/0" />
            <div className="absolute left-[60%] bottom-[6%] h-[110px] w-px bg-gradient-to-b from-white/0 via-[#E8CC70]/7 to-white/0" />
            <div className="absolute right-[8%] bottom-[34%] h-[100px] w-px bg-gradient-to-b from-white/0 via-white/5 to-white/0" />
          </div>
          <div className="pointer-events-none absolute left-0 right-0 top-[76px] z-0 h-[192px] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.006)_18%,rgba(255,255,255,0.038)_34%,rgba(255,255,255,0.14)_50%,rgba(255,255,255,0.038)_66%,rgba(255,255,255,0.006)_82%,rgba(255,255,255,0)_100%),linear-gradient(90deg,rgba(255,255,255,0.01)_0%,rgba(255,255,255,0.05)_16%,rgba(255,255,255,0.11)_50%,rgba(255,255,255,0.05)_84%,rgba(255,255,255,0.01)_100%)] lg:top-[94px] lg:h-[246px]" />
          <div className="relative z-10 flex min-h-[42vh] items-center justify-center px-8 py-10 lg:min-h-screen lg:px-14 lg:py-14">
            <div className="pointer-events-none relative h-[360px] w-[360px] shrink-0 sm:h-[430px] sm:w-[430px] lg:h-[600px] lg:w-[600px]">
                <div className="absolute left-1/2 top-1/2 z-0 h-[372px] w-[372px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,247,210,0.32)_0%,_rgba(232,204,112,0.14)_34%,_rgba(255,255,255,0.05)_55%,_transparent_80%)] blur-[30px] lg:h-[645px] lg:w-[645px]" />
                <div className="absolute left-1/2 top-1/2 z-0 h-[312px] w-[312px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,247,210,0.88)_0%,_rgba(232,204,112,0.52)_24%,_rgba(232,204,112,0.28)_42%,_rgba(255,255,255,0.08)_60%,_transparent_80%)] blur-[24px] lg:h-[560px] lg:w-[560px]" />
                <div className="absolute left-1/2 top-1/2 z-0 h-[235px] w-[235px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,252,232,0.74)_0%,_rgba(255,245,196,0.28)_42%,_transparent_78%)] blur-[12px] lg:h-[420px] lg:w-[420px]" />
                <div className="absolute left-1/2 top-1/2 z-0 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12 lg:h-[470px] lg:w-[470px]" />
                <div className="absolute left-1/2 top-1/2 z-0 h-[332px] w-[332px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#E8CC70]/14 lg:h-[560px] lg:w-[560px]" />
                <div className="absolute left-1/2 top-1/2 z-0 h-[388px] w-[388px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/6 lg:h-[635px] lg:w-[635px]" />
                <Image
                  src="/CClogo3.png"
                  alt="Caliber Consulting LLC logo"
                  fill
                  sizes="(min-width: 1024px) 620px, 390px"
                  className="z-10 object-contain drop-shadow-[0_34px_96px_rgba(0,0,0,0.16)]"
                  priority
                />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.07)_18%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.07)_82%,rgba(255,255,255,0.03)_100%)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08)_0%,_transparent_68%)]" />
            <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 px-8 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-white/70 lg:px-14">
              <span className="text-white/56">© {new Date().getFullYear()} Caliber Consulting LLC</span>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[linear-gradient(180deg,#F7F8F4_0%,#EEF2EE_100%)] px-6 py-10 lg:px-10">
          <div className="w-full max-w-[540px]">
            <Suspense fallback={<div className="w-full max-w-[460px]" />}>
              <PortalSignInForm />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}
