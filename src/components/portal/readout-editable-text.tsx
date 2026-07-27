"use client";

import { useEffect, useRef } from "react";

/** Inline formatting and list structure we keep; everything else is unwrapped. */
const ALLOWED_TAGS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "BR",
  "UL",
  "OL",
  "LI",
  "DIV",
  "P",
  "SPAN",
]);

/** Tags removed outright, contents and all. */
const DROP_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META"]);

/**
 * Reduce pasted/authored markup to plain formatting. Readout copy is authored
 * by internal admins, but it renders for clients, so nothing executable or
 * externally-loading survives — and no attributes at all, which rules out
 * inline handlers and style injection.
 */
export function sanitizeReadoutHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const holder = document.createElement("div");
  holder.innerHTML = html;
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (DROP_TAGS.has(child.tagName)) {
        child.remove();
        continue;
      }
      walk(child);
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        child.removeAttribute(attr.name);
      }
    }
  };
  walk(holder);
  return holder.innerHTML;
}

interface ReadoutEditableTextProps {
  editing: boolean;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: "p" | "span" | "h1" | "h2";
  /** Exposes the editable node so toolbars can act on the live selection. */
  onElement?: (element: HTMLElement | null) => void;
}

export function ReadoutEditableText({
  editing,
  value,
  onChange,
  className,
  style,
  as: Tag = "p",
  onElement,
}: ReadoutEditableTextProps) {
  const ref = useRef<HTMLElement>(null);
  const focused = useRef(false);

  // Writing innerHTML while focused would collapse the caret, so only sync
  // when the field is idle.
  useEffect(() => {
    if (!ref.current || focused.current) return;
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value ?? "";
    }
  }, [value]);

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        (ref as { current: HTMLElement | null }).current = node;
        onElement?.(node);
      }}
      className={className}
      style={style}
      contentEditable={editing}
      suppressContentEditableWarning
      onFocus={() => {
        focused.current = true;
      }}
      onPaste={(event: React.ClipboardEvent<HTMLElement>) => {
        // Paste as plain text so foreign styling never enters the deck.
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
      onBlur={(event: React.FocusEvent<HTMLElement>) => {
        focused.current = false;
        const next = sanitizeReadoutHtml(event.currentTarget.innerHTML);
        if (next !== value) onChange(next);
      }}
    />
  );
}
