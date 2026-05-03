import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import privacyMarkdown from "../../../kidschedule-android/store-assets/privacy-policy.md?raw";
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("_")) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={key} className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] text-foreground">
          {token.slice(1, -1)}
        </code>);
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        parts.push(<a key={key} href={linkMatch[2]} className="text-primary underline hover:text-primary" target="_blank" rel="noopener noreferrer">
            {linkMatch[1]}
          </a>);
      }
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}
function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(<h1 key={key++} className="mb-3 text-3xl font-black text-foreground">
          {renderInline(line.slice(2), `h1-${key}`)}
        </h1>);
      i++;
    } else if (line.startsWith("## ")) {
      out.push(<h2 key={key++} className="mt-8 mb-3 text-xl font-bold text-foreground">
          {renderInline(line.slice(3), `h2-${key}`)}
        </h2>);
      i++;
    } else if (line.startsWith("### ")) {
      out.push(<h3 key={key++} className="mt-6 mb-2 text-lg font-semibold text-foreground">
          {renderInline(line.slice(4), `h3-${key}`)}
        </h3>);
      i++;
    } else if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2));
        i++;
      }
      out.push(<blockquote key={key++} className="my-4 border-l-4 border-border bg-muted px-4 py-3 text-sm text-primary">
          {renderInline(buf.join(" "), `bq-${key}`)}
        </blockquote>);
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        let item = lines[i].slice(2);
        i++;
        while (i < lines.length && lines[i].startsWith("  ")) {
          item += " " + lines[i].trim();
          i++;
        }
        items.push(item);
      }
      out.push(<ul key={key++} className="my-3 list-disc space-y-2 pl-6 text-foreground">
          {items.map((it, idx) => <li key={idx}>{renderInline(it, `li-${key}-${idx}`)}</li>)}
        </ul>);
    } else {
      const buf: string[] = [line];
      i++;
      while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith("> ") && !lines[i].startsWith("- ")) {
        buf.push(lines[i]);
        i++;
      }
      out.push(<p key={key++} className="my-3 leading-relaxed text-foreground">
          {renderInline(buf.join(" "), `p-${key}`)}
        </p>);
    }
  }
  return out;
}
export default function PrivacyPolicyPage() {
  const {
    t
  } = useTranslation();
  return <div className="min-h-screen bg-gradient-to-br from-muted via-white to-muted">
      <header className="border-b border-border bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/">
            <span className="flex items-center gap-2 cursor-pointer">
              <img src="/amynest-logo.png" alt={t("pages.privacy.amynest_ai")} className="h-8 w-8 rounded-full" />
              <span className="font-quicksand text-lg font-black" style={{
              background: "linear-gradient(90deg,hsl(var(--brand-purple-500)),hsl(var(--brand-pink-500)),hsl(var(--brand-cyan-500)))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
                {t("pages.privacy.amynest_ai_2")}
              </span>
            </span>
          </Link>
          <Link href="/">
            <span className="text-sm text-foreground hover:text-foreground cursor-pointer">{t("screens.common.home_link")}</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <article data-testid="privacy-policy-content">{renderMarkdown(privacyMarkdown)}</article>
      </main>
      <footer className="border-t border-border bg-white/60 py-6">
        <p className="text-center text-xs text-muted-foreground">{t("screens.common.copyright")}</p>
      </footer>
    </div>;
}