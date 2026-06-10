import Link from 'next/link';
import ClientNav from '@/components/ClientNav';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stage-950 text-paper-100">
      <header className="sticky top-0 z-40 border-b border-stage-800/80 bg-stage-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3.5">
          <Link href="/" className="group flex items-center gap-3">
            <Monogram />
            <div className="leading-tight">
              <div className="font-display text-lg tracking-tight text-paper-50 transition group-hover:text-catalytic-gold">
                Catalytic Atlas
              </div>
              <div className="mt-0.5 eyebrow">Enzyme dynamics explorer</div>
            </div>
          </Link>

          <ClientNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>

      <footer className="mt-24 border-t border-stage-800/80 bg-stage-900/30">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Monogram small />
                <span className="font-display text-base text-paper-50">Catalytic Atlas</span>
              </div>
              <p className="max-w-xs font-mono text-2xs uppercase tracking-widest-plus text-paper-400 leading-relaxed">
                Browser-native enzymology · open access · open data
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 font-mono text-2xs uppercase tracking-widest-plus md:grid-cols-3">
              <div className="space-y-2.5">
                <div className="text-paper-300">Explore</div>
                <FooterLink href="/">Catalog</FooterLink>
                <FooterLink href="/workbench">Workbench</FooterLink>
                <FooterLink href="/about">About</FooterLink>
              </div>
              <div className="space-y-2.5">
                <div className="text-paper-300">Data sources</div>
                <FooterExtLink href="https://www.rcsb.org">RCSB PDB</FooterExtLink>
                <FooterExtLink href="https://www.uniprot.org">UniProt</FooterExtLink>
                <FooterExtLink href="https://www.ebi.ac.uk/thornton-srv/m-csa/">M-CSA</FooterExtLink>
                <FooterExtLink href="https://sabiork.h-its.org">SABIO-RK</FooterExtLink>
              </div>
              <div className="space-y-2.5">
                <div className="text-paper-300">Project</div>
                <FooterExtLink href="https://github.com/caioross/CatalyticAtlasEDE">GitHub</FooterExtLink>
                <FooterExtLink href="https://github.com/caioross/CatalyticAtlasEDE/issues">Issues</FooterExtLink>
                <FooterExtLink href="https://github.com/caioross/CatalyticAtlasEDE/blob/main/README.md">Docs</FooterExtLink>
              </div>
            </div>
          </div>

          <div className="rule mt-8" />
          <div className="mt-4 flex flex-col gap-1 font-mono text-2xs uppercase tracking-widest-plus text-paper-500 md:flex-row md:justify-between">
            <span>Code: MIT · Data: CC-BY 4.0 · Structures: RCSB public domain</span>
            <span>Built with Next.js · Mol* · Three.js · ANM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div>
      <Link href={href} className="text-paper-400 transition hover:text-catalytic-gold">
        {children}
      </Link>
    </div>
  );
}

function FooterExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div>
      <a href={href} target="_blank" rel="noreferrer" className="text-paper-400 transition hover:text-catalytic-gold">
        {children}
      </a>
    </div>
  );
}

function Monogram({ small }: { small?: boolean }) {
  const size = small ? 'h-7 w-7' : 'h-9 w-9';
  const iconSize = small ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <div className={`relative flex ${size} shrink-0 items-center justify-center rounded-md border border-catalytic-gold/30 bg-gradient-to-br from-stage-850 to-stage-900 shadow-panel`}>
      <svg viewBox="0 0 24 24" className={`${iconSize} text-catalytic-gold`} fill="none" strokeWidth={1.6} stroke="currentColor" strokeLinecap="round">
        <path d="M5 4 Q12 8 19 4" />
        <path d="M5 10 Q12 14 19 10" />
        <path d="M5 16 Q12 20 19 16" />
        <path d="M6 4 L6 20" className="opacity-50" />
        <path d="M18 4 L18 20" className="opacity-50" />
      </svg>
    </div>
  );
}
