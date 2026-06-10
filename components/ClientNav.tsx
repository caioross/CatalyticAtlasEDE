'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Github } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Catalog' },
  { href: '/workbench', label: 'Workbench' },
  { href: '/about', label: 'About' },
] as const;

export default function ClientNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 font-mono text-xs">
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive =
          href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={[
              'rounded-md px-3 py-1.5 uppercase tracking-widest-plus transition',
              isActive
                ? 'bg-stage-800/80 text-catalytic-gold'
                : 'text-paper-300 hover:bg-stage-800/70 hover:text-paper-50',
            ].join(' ')}
          >
            {label}
          </Link>
        );
      })}
      <a
        href="https://github.com/caioross/CatalyticAtlasEDE"
        target="_blank"
        rel="noreferrer"
        className="ml-3 rounded-md border border-stage-700/80 p-1.5 text-paper-300 transition hover:border-catalytic-gold/50 hover:text-catalytic-gold"
        aria-label="Source on GitHub"
      >
        <Github size={14} />
      </a>
    </nav>
  );
}
