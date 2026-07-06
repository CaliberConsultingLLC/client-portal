import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminWorkbenchPlaceholderProps {
  section: string;
  title: string;
  description: string;
  backHref: string;
}

export function AdminWorkbenchPlaceholder({
  section,
  title,
  description,
  backHref,
}: AdminWorkbenchPlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold uppercase tracking-[0.24em] text-[#2B2B2B] sm:text-2xl">
            {section}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">{description}</p>
        </div>
        <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-[#2B2B2B]">{title}</CardTitle>
          <CardDescription className="text-sm leading-relaxed text-[#60727D]">
            This workbench entry point is in place so admins can navigate toward create, assign, and
            settings workflows from the directory today. The full product management flow will be
            built on top of this route next.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-[#60727D]">
          The next implementation pass will turn this into the active management surface for this
          product area.
        </CardContent>
      </Card>
    </div>
  );
}
