import Link from "next/link";
import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 md:px-6 md:pt-12">{children}</div>;
}

interface Crumb {
  label: string;
  href?: string;
}

/** SevnSoul-style page hero: mono eyebrow, large tight title, dim description, optional actions on the right. */
export function PageHero({
  eyebrow,
  title,
  description,
  crumbs,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <section className="mb-10 border-b border-border pb-10">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Jejak halaman" className="mb-6 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>/</span>}
              {c.href ? (
                <Link href={c.href} className="transition-colors hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="text-muted-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="sv-eyebrow mb-5">{eyebrow}</div>
          <h1 className="text-[clamp(34px,6vw,64px)] font-normal leading-[0.98] tracking-[-0.05em]">{title}</h1>
          {description && <p className="mt-5 max-w-xl text-[15px] font-light leading-7 text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
    </section>
  );
}

export function SectionTitle({ title, hint, count }: { title: string; hint?: string; count?: number }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-medium tracking-[-0.03em]">{title}</h2>
        {hint && <p className="mt-1 max-w-xl text-sm text-muted-foreground">{hint}</p>}
      </div>
      {typeof count === "number" && <span className="sv-label">{count} item</span>}
    </div>
  );
}
