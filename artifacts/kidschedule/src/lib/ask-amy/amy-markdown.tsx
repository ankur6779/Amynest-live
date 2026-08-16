/**
 * Safe, small markdown renderer for Amy replies.
 * Does not execute HTML. Presentation only.
 */
import type { ReactNode } from "react";

const URL_RE = /^https?:\/\/[^\s)]+/i;

function linkify(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(https?:\/\/[^\s)]+)/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const href = match[1] ?? "";
    if (URL_RE.test(href)) {
      nodes.push(
        <a
          key={`${keyBase}-u-${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 break-all"
        >
          {href}
        </a>,
      );
    } else {
      nodes.push(href);
    }
    last = match.index + match[0].length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function inline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\((https?:\/\/[^)]+)\))|(`([^`]+)`)|(\*([^*]+)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(...linkify(text.slice(last, match.index), `${keyBase}-pre-${i}`));
    }
    if (match[2]) {
      nodes.push(<strong key={`${keyBase}-b-${i}`}>{match[2]}</strong>);
    } else if (match[4] && match[5] && URL_RE.test(match[5])) {
      nodes.push(
        <a
          key={`${keyBase}-a-${i}`}
          href={match[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 break-all"
        >
          {match[4]}
        </a>,
      );
    } else if (match[7]) {
      nodes.push(
        <code key={`${keyBase}-c-${i}`} className="rounded bg-muted/60 px-1 py-0.5 text-[0.9em]">
          {match[7]}
        </code>,
      );
    } else if (match[9]) {
      nodes.push(<em key={`${keyBase}-i-${i}`}>{match[9]}</em>);
    }
    last = match.index + match[0].length;
    i += 1;
  }
  if (last < text.length) nodes.push(...linkify(text.slice(last), `${keyBase}-tail`));
  return nodes;
}

function headingLevel(line: string): 1 | 2 | 3 | null {
  if (line.startsWith("### ")) return 3;
  if (line.startsWith("## ")) return 2;
  if (line.startsWith("# ")) return 1;
  return null;
}

export function AmyMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const h = headingLevel(line);
    if (h) {
      const content = line.replace(/^#{1,3}\s+/, "");
      const Tag = h === 1 ? "h3" : h === 2 ? "h4" : "h5";
      blocks.push(
        <Tag key={`h-${key++}`} className="mt-3 mb-1 font-semibold text-foreground">
          {inline(content, `h${key}`)}
        </Tag>,
      );
      i += 1;
      continue;
    }

    if (line.trim().startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("> ")) {
        quote.push((lines[i] ?? "").replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={`q-${key++}`}
          className="my-2 border-l-2 border-border pl-3 text-muted-foreground"
        >
          {inline(quote.join(" "), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+/);
    const ul = line.match(/^\s*[-*]\s+/);
    if (ol || ul) {
      const items: string[] = [];
      const ordered = Boolean(ol);
      while (i < lines.length) {
        const cur = lines[i] ?? "";
        const nextOl = cur.match(/^\s*\d+\.\s+/);
        const nextUl = cur.match(/^\s*[-*]\s+/);
        if (ordered ? nextOl : nextUl) {
          items.push(cur.replace(/^\s*(?:\d+\.|[-*])\s+/, ""));
          i += 1;
        } else break;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List
          key={`l-${key++}`}
          className={
            ordered
              ? "my-2 list-decimal space-y-1 pl-5"
              : "my-2 list-disc space-y-1 pl-5"
          }
        >
          {items.map((item, idx) => (
            <li key={`li-${key}-${idx}`}>{inline(item, `li-${key}-${idx}`)}</li>
          ))}
        </List>,
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const cur = lines[i] ?? "";
      if (
        cur.trim() === "" ||
        headingLevel(cur) ||
        cur.trim().startsWith("> ") ||
        /^\s*\d+\.\s+/.test(cur) ||
        /^\s*[-*]\s+/.test(cur)
      ) {
        break;
      }
      para.push(cur);
      i += 1;
    }
    blocks.push(
      <p key={`p-${key++}`} className="my-1.5 leading-relaxed">
        {inline(para.join(" "), `p${key}`)}
      </p>,
    );
  }

  return <div className="amy-md text-sm text-foreground">{blocks}</div>;
}
