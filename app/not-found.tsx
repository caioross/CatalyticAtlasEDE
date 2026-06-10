import Link from 'next/link';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { listEnzymes } from '@/lib/enzymes';

export const metadata = {
  title: 'Not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  const enzymes = listEnzymes().slice(0, 3);
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
      <div className="relative mb-8">
        <FlaskConical size={56} className="text-catalytic-gold/30" strokeWidth={1} />
        <span className="absolute -right-2 -top-1 font-display text-2xl italic text-catalytic-terra">
          ∅
        </span>
      </div>

      <div className="eyebrow text-catalytic-gold">Error 404 · No such structure</div>
      <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight text-paper-50 text-balance md:text-5xl">
        This page hasn&apos;t been <span className="italic text-catalytic-gold">crystallised</span> yet.
      </h1>
      <p className="mt-5 max-w-md text-paper-200 text-pretty">
        The address you followed doesn&apos;t resolve to any enzyme or tool in the atlas.
        It may have moved, or the deep-link may be malformed.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-primary">
          <ArrowLeft size={14} />
          Back to the catalog
        </Link>
        <Link href="/workbench" className="btn">
          Open the workbench
        </Link>
      </div>

      <div className="mt-12 w-full border-t border-stage-800/70 pt-8">
        <div className="eyebrow mb-4">Or start from a classic</div>
        <div className="flex flex-wrap justify-center gap-2">
          {enzymes.map((e) => (
            <Link
              key={e.id}
              href={`/enzyme/${e.id}`}
              className="kicker transition hover:border-catalytic-gold/60 hover:text-catalytic-gold"
            >
              {e.shortName ?? e.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
