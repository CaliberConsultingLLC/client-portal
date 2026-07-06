import { PortalPageFrame } from "@/components/portal/portal-page-frame";

interface PortalContentFrameProps {
  children: React.ReactNode;
  leftRail?: React.ReactNode;
  rightRail?: React.ReactNode;
  centerMaxWidthClassName?: string;
}

export function PortalContentFrame({
  children,
  leftRail,
  rightRail,
  centerMaxWidthClassName = "max-w-[1320px]",
}: PortalContentFrameProps) {
  return (
    <PortalPageFrame
      leftRail={leftRail}
      rightRail={rightRail}
      centerMaxWidthClassName={centerMaxWidthClassName}
    >
      {children}
    </PortalPageFrame>
  );
}
