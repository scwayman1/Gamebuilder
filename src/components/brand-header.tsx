import { FlaskConical } from "lucide-react";
import Link from "next/link";

export function BrandHeader() {
  return (
    <header className="sticky top-0 z-30 border-primary-100/60 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-main-gradient text-white">
            <FlaskConical className="size-4" />
          </span>
          <span className="text-foreground/90 text-sm">Scott's Experiment</span>
          <span className="hidden text-muted-foreground text-xs sm:inline">
            · AB Studios skunkworks
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-muted-foreground text-xs">
          <Link href="/new" className="hover:text-foreground">
            New module
          </Link>
          <Link href="/runs" className="hover:text-foreground">
            Run history
          </Link>
          <span className="rounded-full border border-primary-100 bg-primary-50 px-2 py-0.5 font-medium text-[10px] text-primary-700 uppercase tracking-wide">
            Internal preview
          </span>
        </nav>
      </div>
    </header>
  );
}
