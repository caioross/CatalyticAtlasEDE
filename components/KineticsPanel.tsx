import type { KineticsDoc } from '@/lib/types';
import { formatScientific } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

type Props = {
  kinetics: KineticsDoc;
};

function formatKcat(k?: number): string {
  if (k === undefined || k === null) return '—';
  if (k >= 1000 || k < 0.01) return formatScientific(k);
  return k.toPrecision(3);
}

function formatKm(k?: number): string {
  if (k === undefined || k === null) return '—';
  return k < 0.1 ? k.toPrecision(2) : k.toFixed(2);
}

export default function KineticsPanel({ kinetics }: Props) {
  if (!kinetics.entries?.length) return null;

  return (
    <div className="panel p-5">
      <div className="mb-4">
        <div className="eyebrow">Kinetic parameters</div>
        <div className="mt-1 text-sm text-paper-200">
          Steady-state k<sub>cat</sub>, K<sub>M</sub> and specificity constants from literature.
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-stage-700/60 text-left font-mono uppercase tracking-widest-plus text-paper-400 text-2xs">
              <th className="px-2 py-2 font-normal">Substrate</th>
              <th className="px-2 py-2 text-right font-normal">k<sub>cat</sub> (s⁻¹)</th>
              <th className="px-2 py-2 text-right font-normal">K<sub>M</sub> (mM)</th>
              <th className="px-2 py-2 text-right font-normal">k<sub>cat</sub>/K<sub>M</sub> (M⁻¹s⁻¹)</th>
              <th className="px-2 py-2 text-right font-normal">pH</th>
              <th className="px-2 py-2 text-right font-normal">T (°C)</th>
              <th className="px-2 py-2 font-normal">Source</th>
            </tr>
          </thead>
          <tbody>
            {kinetics.entries.map((e, i) => (
              <tr key={i} className="border-b border-stage-800/60 last:border-0 hover:bg-stage-900/60">
                <td className="px-2 py-2 text-paper-100">{e.substrate}</td>
                <td className="px-2 py-2 text-right font-mono tabular text-paper-200">
                  {formatKcat(e.kcat_s)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular text-paper-200">
                  {formatKm(e.Km_mM)}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular text-catalytic-gold">
                  {e.kcat_over_Km_M_s !== undefined ? formatScientific(e.kcat_over_Km_M_s) : '—'}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular text-paper-300">
                  {e.pH ?? '—'}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular text-paper-300">
                  {e.temperature_C ?? '—'}
                </td>
                <td className="px-2 py-2 text-paper-300">
                  {e.sourceUrl ? (
                    <a
                      href={e.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-paper-300 transition hover:text-catalytic-gold"
                    >
                      {e.source}
                      <ExternalLink size={10} />
                    </a>
                  ) : (
                    e.source
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {kinetics.notes && (
        <div className="mt-4 rounded-md border border-stage-700/60 bg-stage-900/60 p-3 text-xs italic text-paper-200">
          {kinetics.notes}
        </div>
      )}
    </div>
  );
}
