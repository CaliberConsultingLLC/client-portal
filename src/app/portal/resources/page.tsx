import { BookOpen, LifeBuoy, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalAssetsByType } from "@/lib/portal/workspace";

const resourceCards = [
  {
    title: "Portal guidance",
    body: "Helpful notes for navigating the portal and locating the assets assigned to your account.",
    icon: BookOpen,
  },
  {
    title: "Support",
    body: "A place for contact information, access help, and other support references as the portal grows.",
    icon: LifeBuoy,
  },
  {
    title: "Security",
    body: "Access and permissions can expand over time while keeping client materials separated and secure.",
    icon: ShieldCheck,
  },
];

export default function PortalResourcesPage() {
  const resourceAssets = getPortalAssetsByType("resource");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">Resources</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102533]">
          Guidance, references, and support materials
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
          This section is a natural home for onboarding references, support contacts, FAQs, and any
          lightweight client resources you want available in the portal.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {[...resourceCards, ...resourceAssets.map((asset) => ({
          title: asset.title,
          body: asset.description,
          icon: BookOpen,
        }))].map((resource) => (
          <Card key={resource.title} className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#18384E]">
                <resource.icon className="h-5 w-5" />
              </div>
              <CardTitle className="pt-4 text-xl text-[#102533]">{resource.title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed text-[#60727D]">
                {resource.body}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4 text-sm text-[#60727D]">
                This card is ready for client-specific content once resources are added to the portal.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
