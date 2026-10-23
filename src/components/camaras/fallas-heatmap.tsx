'use client';

import React, { useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, CircleHelp, XCircle } from 'lucide-react';

export type Granularidad = 'dia' | 'semana';

export type Periodo = {
  /** yyyy-MM-dd del dia, o del lunes de la semana */
  clave: string;
  /** Primer y ultimo dia del periodo dentro del rango (yyyy-MM-dd) */
  inicio: string;
  fin: string;
};

export type CeldaFallas = {
  /** Verificaciones completas (log general) en el periodo */
  verificaciones: number;
  fallas: number;
  /** Cantidad por codigo de falla (SIN_RED, IMAGEN_NEGRA...) */
  codigos: Record<string, number>;
};

export type FilaHeatmap = { codigo_recurso: number; nombre: string };

export const claveCelda = (codigoRecurso: number, clavePeriodo: string) => `${codigoRecurso}|${clavePeriodo}`;

/** Niveles de color: sin datos, ok y tres intensidades de falla. */
const NIVELES = [
  { clase: 'bg-muted', etiqueta: 'Sin verificación' },
  { clase: 'bg-emerald-400', etiqueta: 'Sin fallas' },
  { clase: 'bg-red-500', etiqueta: '1–2 fallas' },
  { clase: 'bg-red-700', etiqueta: '3–9 fallas' },
  { clase: 'bg-red-900', etiqueta: '10+ fallas' },
];

function nivel(celda?: CeldaFallas): number {
  if (!celda || (celda.verificaciones === 0 && celda.fallas === 0)) return 0;
  if (celda.fallas === 0) return 1;
  if (celda.fallas <= 2) return 2;
  if (celda.fallas <= 9) return 3;
  return 4;
}

function textoPeriodo(periodo: Periodo, granularidad: Granularidad): string {
  if (granularidad === 'dia') return format(parseISO(periodo.inicio), "EEEE dd 'de' MMMM", { locale: es });
  return `Semana ${format(parseISO(periodo.inicio), 'dd MMM', { locale: es })} – ${format(parseISO(periodo.fin), 'dd MMM', { locale: es })}`;
}

type Hover = { fila: FilaHeatmap; periodo: Periodo; celda?: CeldaFallas; x: number; y: number };

export function FallasHeatmap({
  filas,
  periodos,
  celdas,
  granularidad,
  onSelectRecurso,
}: {
  filas: FilaHeatmap[];
  periodos: Periodo[];
  celdas: Map<string, CeldaFallas>;
  granularidad: Granularidad;
  onSelectRecurso?: (codigo: number) => void;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const mostrarTooltip = (ev: React.MouseEvent<HTMLDivElement>, fila: FilaHeatmap, periodo: Periodo, celda?: CeldaFallas) => {
    const cont = contenedorRef.current?.getBoundingClientRect();
    const rect = ev.currentTarget.getBoundingClientRect();
    if (!cont) return;
    setHover({ fila, periodo, celda, x: rect.left - cont.left + rect.width / 2, y: rect.bottom - cont.top + 6 });
  };

  if (filas.length === 0) {
    return <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">Sin recursos activos.</div>;
  }

  const anchoContenedor = contenedorRef.current?.clientWidth ?? 0;
  const codigosHover = hover?.celda ? Object.entries(hover.celda.codigos).sort((a, b) => b[1] - a[1]) : [];
  const nivelHover = nivel(hover?.celda);

  return (
    <div ref={contenedorRef} className="relative" onMouseLeave={() => setHover(null)}>
      <div className="overflow-x-auto pb-2">
        <div
          className="inline-grid gap-[2px]"
          style={{ gridTemplateColumns: `minmax(120px, 200px) repeat(${periodos.length}, 18px)` }}
        >
          {/* Fila de meses: se muestra en el primer periodo de cada mes */}
          <div className="sticky left-0 z-10 bg-card" />
          {periodos.map((p, i) => {
            const mes = p.inicio.slice(0, 7);
            const nuevoMes = i === 0 || periodos[i - 1].inicio.slice(0, 7) !== mes;
            return (
              <div key={`m-${p.clave}`} className="overflow-visible whitespace-nowrap text-xs capitalize text-muted-foreground">
                {nuevoMes ? format(parseISO(p.inicio), 'MMM', { locale: es }) : ''}
              </div>
            );
          })}

          {/* Fila de dias (o del lunes de cada semana) */}
          <div className="sticky left-0 z-10 bg-card" />
          {periodos.map((p) => (
            <div key={`d-${p.clave}`} className="text-center text-[10px] tabular-nums text-muted-foreground">
              {format(parseISO(granularidad === 'dia' ? p.inicio : p.clave), 'd')}
            </div>
          ))}

          {filas.map((fila) => (
            <React.Fragment key={fila.codigo_recurso}>
              <button
                type="button"
                onClick={() => onSelectRecurso?.(fila.codigo_recurso)}
                className="sticky left-0 z-10 truncate bg-card pr-3 text-left text-xs leading-[18px] text-foreground hover:text-primary hover:underline"
                title={fila.nombre}
              >
                {fila.nombre}
              </button>
              {periodos.map((p) => {
                const celda = celdas.get(claveCelda(fila.codigo_recurso, p.clave));
                const n = nivel(celda);
                return (
                  <div
                    key={p.clave}
                    role="img"
                    aria-label={`${fila.nombre}, ${textoPeriodo(p, granularidad)}: ${NIVELES[n].etiqueta}`}
                    onMouseEnter={(ev) => mostrarTooltip(ev, fila, p, celda)}
                    className={`h-[18px] w-[18px] rounded-[3px] ${NIVELES[n].clase} hover:ring-2 hover:ring-foreground/60`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {NIVELES.map((n) => (
          <span key={n.etiqueta} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-[3px] ${n.clase}`} /> {n.etiqueta}
          </span>
        ))}
      </div>

      {hover && (
        <div
          className="pointer-events-none absolute z-20 min-w-[200px] rounded-lg border bg-background px-3 py-2 text-xs shadow-lg"
          style={{
            top: hover.y,
            left: Math.max(0, Math.min(hover.x - 100, anchoContenedor - 220)),
          }}
        >
          <p className="font-medium text-foreground">{hover.fila.nombre}</p>
          <p className="mb-1.5 text-muted-foreground first-letter:uppercase">{textoPeriodo(hover.periodo, granularidad)}</p>
          <p className="flex items-center gap-1.5 text-foreground">
            {nivelHover === 0 && <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" />}
            {nivelHover === 1 && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
            {nivelHover >= 2 && <XCircle className="h-3.5 w-3.5 text-red-600" />}
            <span>
              {nivelHover === 0 ? 'Sin verificación' : nivelHover === 1 ? 'Todo OK' : `${hover.celda!.fallas} fallas`}
            </span>
          </p>
          {!!hover.celda?.verificaciones && (
            <p className="text-muted-foreground">{hover.celda.verificaciones} verificaciones completas</p>
          )}
          {codigosHover.length > 0 && (
            <div className="mt-1.5 space-y-0.5 border-t pt-1.5 text-muted-foreground">
              {codigosHover.slice(0, 6).map(([codigo, cantidad]) => (
                <p key={codigo} className="flex justify-between gap-4">
                  <span className="font-mono">{codigo}</span>
                  <span className="tabular-nums">{cantidad}</span>
                </p>
              ))}
              {codigosHover.length > 6 && <p>+{codigosHover.length - 6} códigos más</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
