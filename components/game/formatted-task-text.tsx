"use client";

import type { ReactNode } from "react";

type FormattedTaskTextProps = {
  text: string;
  className?: string;
};

function inlineNodes(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <strong key={`b-${key++}`} className="font-semibold text-[inherit]">
        {match[1]}
      </strong>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const UNORDERED = /^\s*(?:[-*•]|–)\s+(.+)$/;
const ORDERED = /^\s*\d+[.)]\s+(.+)$/;

/**
 * Studio task copy: paragraphs, line breaks, **bold**, and - / 1. lists.
 */
export function FormattedTaskText({ text, className }: FormattedTaskTextProps) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return null;

  const blocks: ReactNode[] = [];
  const lines = normalized.split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    if (lines[i].trim() === "") {
      i += 1;
      continue;
    }

    const ulItems: string[] = [];
    while (i < lines.length) {
      const match = lines[i].match(UNORDERED);
      if (!match) break;
      ulItems.push(match[1]);
      i += 1;
    }
    if (ulItems.length > 0) {
      blocks.push(
        <ul key={key++} className="my-2 list-disc space-y-1 pl-5 text-left">
          {ulItems.map((item, idx) => (
            <li key={idx}>{inlineNodes(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const olItems: string[] = [];
    while (i < lines.length) {
      const match = lines[i].match(ORDERED);
      if (!match) break;
      olItems.push(match[1]);
      i += 1;
    }
    if (olItems.length > 0) {
      blocks.push(
        <ol key={key++} className="my-2 list-decimal space-y-1 pl-5 text-left">
          {olItems.map((item, idx) => (
            <li key={idx}>{inlineNodes(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !UNORDERED.test(lines[i]) &&
      !ORDERED.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={key++}>
        {para.map((line, idx) => (
          <span key={idx}>
            {idx > 0 ? <br /> : null}
            {inlineNodes(line)}
          </span>
        ))}
      </p>
    );
  }

  return <div className={className}>{blocks}</div>;
}
