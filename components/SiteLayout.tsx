import Link from 'next/link';
import { Github } from 'lucide-react';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stage-950 text-paper-100">
      <header className="sticky top-0 z-40 border-b border-stage-800/80 bg-stage-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <Monogram />
            <div className="leading-tight">
              <div className="font-display text-lg tracking-tight text-paper-50 transition group-hover:text-catalytic-gold">
                Catalytic Atlas
              </div>
              <div className="mt-0.5 eyebrow">Enzyme dynamics explorer</div>
            </div>
          </Link>

          <nav className="flex items-center gap-0.5 font-mono text-xs">
            <NavLink href="/">Catalog</NavLink>
            <NavLink href="/workbench">Workbench</NavLink>
            <NavLink href="/about">About</NavLink>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="ml-3 rounded-md border border-stage-700/80 p-1.5 text-paper-300 transition hover:border-catalytic-gold/50 hover:text-catalytic-gold"
              aria-label="Source on GitHub"
            >
              <Github size={14} />
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>

      <footer className="mt-24 border-t border-stage-800/80 bg-stage-900/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-2xs font-mono uppercase tracking-widest-plus text-paper-400 md:flex-row md:items-center md:justify-between">
          <div>Catalytic Atlas · browser-native enzymology, open access</div>
          <div>Sources: RCSB PDB · UniProt · M-CSA · BRENDA · peer-reviewed literature</div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 uppercase tracking-widest-plus text-paper-300 transition hover:bg-stage-800/70 hover:text-paper-50"
    >
      {children}
    </Link>
  );
}

function Monogram() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-md border border-catalytic-gold/30 bg-gradient-to-br from-stage-850 to-stage-900 shadow-panel">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-catalytic-gold" fill="none" strokeWidth={1.6} stroke="currentColor" strokeLinecap="round">
        {/* Double-helix stylized monogram */}
        <path d="M5 4 Q12 8 19 4" />
        <path d="M5 10 Q12 14 19 10" />
        <path d="M5 16 Q12 20 19 16" />
        <path d="M6 4 L6 20" className="opacity-50" />
        <path d="M18 4 L18 20" className="opacity-50" />
      </svg>
    </div>
  );
}
