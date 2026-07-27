"use client";

import { useEffect, useRef } from "react";

interface ReadoutEditableTextProps {
  editing: boolean;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: "p" | "span" | "h1" | "h2";
}

export function ReadoutEditableText({
  editing,
  value,
  onChange,
  className,
  style,
  as: Tag = "p",
}: ReadoutEditableTextProps) {
  const ref = useRef<HTMLElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (!ref.current || focused.current) return;
    if (ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={style}
      contentEditable={editing}
      suppressContentEditableWarning
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={(event) => {
        focused.current = false;
        const next = event.currentTarget.innerText;
        if (next !== value) onChange(next);
      }}
    />
  );
}
