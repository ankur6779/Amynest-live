import type { ReactNode } from "react";
import { Link } from "wouter";
import { buildCanonicalUrl } from "@/lib/marketing/canonical-seo";
import { getEeatAuthor, getEeatReviewer } from "@/lib/marketing/eeat-authors";

type BreadcrumbItem = { name: string; path: string };

type BreadcrumbNavProps = {
  items: BreadcrumbItem[];
  className?: string;
};

/** Visual breadcrumb navigation — JSON-LD emitted at page level via schema-builders. */
export function BreadcrumbNav({ items, className = "" }: BreadcrumbNavProps) {
  return (
    <nav aria-label="Breadcrumb" className={`text-sm text-white/55 ${className}`}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden>/</span>}
              {isLast ? (
                <span className="text-white/80" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="hover:text-white underline-offset-2 hover:underline">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SeoJsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

type SeoImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

export function SeoImage({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
}: SeoImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}

type RelatedContentPanelProps = {
  title: string;
  children: ReactNode;
};

export function RelatedContentPanel({ title, children }: RelatedContentPanelProps) {
  return (
    <section className="py-8 border-t border-white/10">
      <h2 className="mb-4 font-quicksand text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function RelatedLinkList({ links }: { links: { href: string; label: string }[] }) {
  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href}>
            <span className="text-purple-300 hover:text-purple-200 underline-offset-2 hover:underline">
              {link.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function buildGuideBreadcrumbs(guideTitle: string, slug: string): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: guideTitle, path: `/guides/${slug}` },
  ];
}

export function buildFeatureBreadcrumbs(accent: string, slug: string): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Features", path: "/get-app" },
    { name: accent, path: `/features/${slug}` },
  ];
}

export function EeatByline({
  authorId,
  reviewedById,
  updatedAt,
}: {
  authorId?: string;
  reviewedById?: string;
  updatedAt?: string;
}) {
  const author = authorId ? getEeatAuthor(authorId) : undefined;
  const reviewer = reviewedById ? getEeatReviewer(reviewedById) : undefined;
  if (!author && !reviewer) return null;

  return (
    <p className="mb-6 text-xs text-white/45 leading-relaxed">
      {author ? <>Written by {author.name} · </> : null}
      {reviewer ? <>Reviewed by {reviewer.name}, {reviewer.credentials} · </> : null}
      Updated {updatedAt ?? "2026-06-15"}
    </p>
  );
}

export function guideCanonical(slug: string): string {
  return buildCanonicalUrl(`/guides/${slug}`);
}
