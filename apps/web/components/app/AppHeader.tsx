import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "./UserMenu";

/** Top navigation bar shown on every signed-in page (SevnSoul header: mark + spaced wordmark, mono labels). */
export function AppHeader({ email, name }: { email: string | null; name: string | null }) {
  return (
    <header className="z-30 shrink-0 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Link href="/projects" className="flex items-center gap-3" aria-label="Sevn Studio, ke daftar proyek">
          <Image src="/brand/mark.png" alt="" width={28} height={28} priority unoptimized className="size-7 object-contain" />
          <span className="hidden font-mono text-[10px] font-medium tracking-[0.35em] text-foreground/60 sm:inline">SEVN STUDIO</span>
        </Link>

        <nav aria-label="Menu utama" className="ml-2 flex items-center gap-1 sm:ml-6">
          <Link
            href="/projects"
            className="rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Proyek
          </Link>
        </nav>

        <div className="ml-auto">
          <UserMenu email={email} name={name} />
        </div>
      </div>
    </header>
  );
}
