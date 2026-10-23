'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { tonoResultado } from './camaras-utils';

type Tono = 'ok' | 'falla' | 'neutro';

const TONOS: Record<Tono, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  falla: 'bg-red-50 text-red-700 border-red-200',
  neutro: 'bg-slate-50 text-slate-600 border-slate-200',
};

const ICONOS = { ok: CheckCircle2, falla: XCircle, neutro: CircleHelp };

export function EstadoBadge({ tono, children, className, title }: { tono: Tono; children: React.ReactNode; className?: string; title?: string }) {
  const Icono = ICONOS[tono];
  return (
    <span
      title={title}
      className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', TONOS[tono], className)}
    >
      <Icono className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

/** Badge para un resultado de texto ('OK', 'FAIL SIN_RED', 'FALLAN_CANALES 2/10'...). */
export function ResultadoBadge({ resultado, ok, title }: { resultado?: string | null; ok?: boolean | null; title?: string }) {
  const tono: Tono = ok === true ? 'ok' : ok === false ? 'falla' : tonoResultado(resultado);
  return <EstadoBadge tono={tono} title={title}>{resultado || 'Sin verificar'}</EstadoBadge>;
}

/** Badge Si / No / Sin dato para los indicadores booleanos de la verificacion. */
export function IndicadorBadge({ label, value }: { label: string; value?: boolean | null }) {
  const tono: Tono = value === true ? 'ok' : value === false ? 'falla' : 'neutro';
  const texto = value === true ? 'Sí' : value === false ? 'No' : 'N/D';
  return <EstadoBadge tono={tono}>{label}: {texto}</EstadoBadge>;
}
