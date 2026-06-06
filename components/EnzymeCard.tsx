import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { EnzymeMeta } from '@/lib/types';

type Props = {
  enzyme: EnzymeMeta;
};

export default function EnzymeCard({ enzyme }: Props) {
  return (
    <Link
      href={`/enzyme/${enzyme.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-stage-700/70 bg-stage-900/70 p-5 shadow-panel transition hover:-translate-y-[1px] hover:border-catalytic-gold/50 hover:bg-stage-850/80 hover:shadow-lift"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow text-catalytic-gold">EC {enzyme.ecNumber}</div>
          <h3 className="mt-1 font-display text-xl leading-tight text-paper-50 text-balance">
            {enzyme.shortName ?? enzyme.name}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1 font-mono text-xs text-paper-400">
          <span className="tabular">{enzyme.pdbId}</span>
          <ArrowUpRight size={12} className="transition group-hover:text-catalytic-gold" />
        </div>
      </div>

      <div className="mt-1 font-mono text-xs italic text-paper-300">{enzyme.organism}</div>

      <p className="mt-3 text-sm leading-relaxed text-paper-200 text-pretty line-clamp-3">
        {enzyme.summary}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {enzyme.tags.slice(0, 4).map((t) => (
          <span key={t} className="kicker">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-stage-700/70 pt-3 font-mono text-2xs uppercase tracking-widest-plus text-paper-400">
        <span className="truncate">{enzyme.class}</span>
        <span className="tabular">
          {enzyme.residuesTotal} aa · {enzyme.chains.length} chain{enzyme.chains.length > 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
}
