'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { addDays, format, parseISO, startOfWeek, subDays } from 'date-fns';
import { Activity, CalendarRange, CheckCircle2, CircleHelp, Loader2, MonitorPlay, RefreshCw, ScanEye, X, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { recursoService } from '@/services/camaras/recurso.service';
import { logRecursoService } from '@/services/camaras/logRecurso.service';
import { verificacionService } from '@/services/camaras/verificacion.service';
import type { EstadoCamara, LogRecurso, Recurso } from '@/types/camaras';
import { PageHeader } from '@/components/camaras/page-header';
import { RecursoSelect, TODOS } from '@/components/camaras/recurso-select';
import { ResultadoBadge } from '@/components/camaras/estado-badge';
import { FallasHeatmap, claveCelda, type CeldaFallas, type FilaHeatmap, type Granularidad, type Periodo } from '@/components/camaras/fallas-heatmap';
import { codigoFalla, diaDe, esLogGeneral, formatFecha, getErrorMessage, getUsuarioActual } from '@/components/camaras/camaras-utils';

/** Maximo de logs que se traen para el filtro por fechas y el grafico. */
const LIMITE_LOGS = 100000;
/** Dias del grafico cuando no hay rango de fechas. */
const DIAS_GRAFICO_POR_DEFECTO = 30;
/** Resumen general que solo agrega las fallas de los canales: no se cuenta dos veces. */
const CODIGO_RESUMEN_CANALES = 'FALLAN_CANALES';
const CODIGO_DESCONECTADO = 'CANAL_DESCONECTADO';

const hoy = () => format(new Date(), 'yyyy-MM-dd');

type FilaRango = {
  codigo_recurso: number;
  nombre: string;
  ip: string | null;
  verificaciones: number;
  ok: number;
  fallas: number;
  ultimo?: LogRecurso;
};

function Kpi({ titulo, valor, icono: Icono, color }: { titulo: string; valor: number; icono: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{titulo}</p>
          <p className="text-3xl font-semibold tabular-nums">{valor}</p>
        </div>
        <div className={`rounded-full p-3 ${color}`}>
          <Icono className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function TablaLogs({ logs, vacio }: { logs: LogRecurso[]; vacio: string }) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[90px]">Log</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Usuario</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">{vacio}</TableCell>
            </TableRow>
          )}
          {logs.map((h) => (
            <TableRow key={h.codigo_log_recurso}>
              <TableCell className="font-mono text-xs">{h.codigo_log_recurso}</TableCell>
              <TableCell><ResultadoBadge resultado={h.resultado} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatFecha(h.fecha_hora_registro ?? h.fecha_modificacion)}</TableCell>
              <TableCell className="text-sm">{h.usuario_modificacion || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function PanelCamarasPage() {
  const { toast } = useToast();
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [estado, setEstado] = useState<EstadoCamara[]>([]);
  const [logs, setLogs] = useState<LogRecurso[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtro, setFiltro] = useState<string>(TODOS);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [filtroResultado, setFiltroResultado] = useState('');
  const [incluirDesconectados, setIncluirDesconectados] = useState(false);
  const [granularidad, setGranularidad] = useState<Granularidad>('dia');

  const [verificando, setVerificando] = useState<string | null>(null); // TODOS o codigo_recurso

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [respRecursos, respEstado, respLogs] = await Promise.all([
        recursoService.getAll(),
        verificacionService.getEstado(),
        logRecursoService.getAll({ limit: LIMITE_LOGS }),
      ]);
      setRecursos((respRecursos.data ?? []).filter((r) => r.estado !== 'I'));
      setEstado(respEstado.data ?? []);
      setLogs((respLogs.data ?? []).filter((l) => l.estado !== 'I'));
    } catch (error) {
      toast({ title: 'Error al cargar el panel', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => setFiltroResultado(''), [filtro]);

  const conRango = !!(desde || hasta);
  const enRango = useCallback((fecha?: string | null) => {
    const dia = diaDe(fecha);
    return !!dia && (!desde || dia >= desde) && (!hasta || dia <= hasta);
  }, [desde, hasta]);

  const nombreRecurso = useMemo(() => {
    const mapa = new Map(recursos.map((r) => [r.codigo_recurso, r]));
    return (codigo?: number | null) => mapa.get(codigo ?? -1);
  }, [recursos]);

  // Logs del recurso seleccionado (o de todos los activos)
  const logsRecurso = useMemo(() => {
    const activos = new Set(recursos.map((r) => r.codigo_recurso));
    return logs.filter((l) =>
      l.codigo_recurso != null && activos.has(l.codigo_recurso) && (filtro === TODOS || String(l.codigo_recurso) === filtro));
  }, [logs, recursos, filtro]);

  // ---------- Modo "ultima verificacion" (sin fechas) ----------
  const filasEstado = useMemo(
    () => (filtro === TODOS ? estado : estado.filter((e) => String(e.codigo_recurso) === filtro)),
    [estado, filtro],
  );

  /** Logs de la ultima verificacion completa del recurso: comparten la fecha del log general. */
  const ultimaVerificacion = useMemo(() => {
    if (filtro === TODOS) return [];
    const general = logsRecurso
      .filter((l) => esLogGeneral(l.resultado))
      .sort((a, b) => b.codigo_log_recurso - a.codigo_log_recurso)[0];
    if (!general) return [];
    return logsRecurso
      .filter((l) => l.fecha_hora_registro === general.fecha_hora_registro)
      .sort((a, b) => (esLogGeneral(a.resultado) ? -1 : esLogGeneral(b.resultado) ? 1 : a.codigo_log_recurso - b.codigo_log_recurso));
  }, [logsRecurso, filtro]);

  // ---------- Modo rango de fechas ----------
  const filasRango = useMemo<FilaRango[]>(() => {
    if (!conRango) return [];
    const porRecurso = new Map<number, FilaRango>();
    const base = filtro === TODOS ? recursos : recursos.filter((r) => String(r.codigo_recurso) === filtro);
    base.forEach((r) => porRecurso.set(r.codigo_recurso, {
      codigo_recurso: r.codigo_recurso, nombre: r.nombre_recurso || `Recurso ${r.codigo_recurso}`, ip: r.ip_recurso, verificaciones: 0, ok: 0, fallas: 0,
    }));
    logsRecurso.forEach((l) => {
      if (!esLogGeneral(l.resultado) || !enRango(l.fecha_hora_registro)) return;
      const fila = porRecurso.get(l.codigo_recurso!);
      if (!fila) return;
      fila.verificaciones += 1;
      if (l.resultado === 'OK') fila.ok += 1; else fila.fallas += 1;
      if (!fila.ultimo || l.codigo_log_recurso > fila.ultimo.codigo_log_recurso) fila.ultimo = l;
    });
    return Array.from(porRecurso.values());
  }, [conRango, recursos, filtro, logsRecurso, enRango]);

  const logsEnRango = useMemo(() => {
    if (!conRango || filtro === TODOS) return [];
    const texto = filtroResultado.trim().toUpperCase();
    return logsRecurso
      .filter((l) => enRango(l.fecha_hora_registro) && (!texto || l.resultado?.toUpperCase().includes(texto)))
      .sort((a, b) => b.codigo_log_recurso - a.codigo_log_recurso);
  }, [conRango, filtro, logsRecurso, enRango, filtroResultado]);

  const kpis = useMemo(() => {
    if (conRango) {
      return {
        total: filasRango.length,
        ok: filasRango.filter((f) => f.ultimo?.resultado === 'OK').length,
        fallas: filasRango.filter((f) => f.ultimo && f.ultimo.resultado !== 'OK').length,
        sinVerificar: filasRango.filter((f) => !f.ultimo).length,
      };
    }
    return {
      total: filasEstado.length,
      ok: filasEstado.filter((e) => e.ok === true).length,
      fallas: filasEstado.filter((e) => e.ok === false).length,
      sinVerificar: filasEstado.filter((e) => e.ok === null || e.ok === undefined).length,
    };
  }, [conRango, filasRango, filasEstado]);

  // ---------- Grafico: mapa de calor recurso x periodo ----------
  const rangoGrafico = useMemo(() => {
    const fin = hasta || hoy();
    const inicio = desde || format(subDays(parseISO(fin), DIAS_GRAFICO_POR_DEFECTO - 1), 'yyyy-MM-dd');
    return inicio <= fin ? { inicio, fin } : { inicio: fin, fin: inicio };
  }, [desde, hasta]);

  const heatmap = useMemo(() => {
    // Periodos del rango: un dia, o la semana (lunes a domingo) recortada al rango
    const periodos: Periodo[] = [];
    const periodoDeDia = new Map<string, string>();
    for (let d = parseISO(rangoGrafico.inicio); format(d, 'yyyy-MM-dd') <= rangoGrafico.fin; d = addDays(d, 1)) {
      const dia = format(d, 'yyyy-MM-dd');
      const clave = granularidad === 'dia' ? dia : format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const ultimo = periodos[periodos.length - 1];
      if (ultimo?.clave === clave) ultimo.fin = dia; else periodos.push({ clave, inicio: dia, fin: dia });
      periodoDeDia.set(dia, clave);
      if (periodoDeDia.size > 366) break;
    }

    const celdas = new Map<string, CeldaFallas>();
    let total = 0;
    logsRecurso.forEach((l) => {
      const clavePeriodo = periodoDeDia.get(diaDe(l.fecha_hora_registro));
      if (!clavePeriodo) return;
      const clave = claveCelda(l.codigo_recurso!, clavePeriodo);
      const celda = celdas.get(clave) ?? { verificaciones: 0, fallas: 0, codigos: {} };
      celdas.set(clave, celda);
      if (esLogGeneral(l.resultado)) celda.verificaciones += 1;
      const codigo = codigoFalla(l.resultado);
      if (!codigo || codigo === CODIGO_RESUMEN_CANALES) return;
      if (codigo === CODIGO_DESCONECTADO && !incluirDesconectados) return;
      celda.fallas += 1;
      celda.codigos[codigo] = (celda.codigos[codigo] ?? 0) + 1;
      total += 1;
    });

    const filas: FilaHeatmap[] = (filtro === TODOS ? recursos : recursos.filter((r) => String(r.codigo_recurso) === filtro))
      .map((r) => ({ codigo_recurso: r.codigo_recurso, nombre: r.nombre_recurso || `Recurso ${r.codigo_recurso}` }));

    return { periodos, celdas, filas, total };
  }, [logsRecurso, recursos, filtro, rangoGrafico, granularidad, incluirDesconectados]);

  // ---------- Acciones ----------
  const aplicarPreset = (dias: number) => {
    const fin = hoy();
    setHasta(fin);
    setDesde(format(subDays(parseISO(fin), dias - 1), 'yyyy-MM-dd'));
  };

  const limpiarFechas = () => {
    setDesde('');
    setHasta('');
  };

  const verificar = async (codigo: string) => {
    setVerificando(codigo);
    try {
      if (codigo === TODOS) {
        const resp = await verificacionService.verificarTodas(getUsuarioActual());
        toast({ title: 'Verificación completada', description: `${resp.ok} OK · ${resp.fallas} con fallas · ${resp.duracion_s.toFixed(1)} s` });
      } else {
        const { data } = await verificacionService.verificarUna(codigo, getUsuarioActual());
        toast({
          title: `${data.nombre ?? 'Recurso'}: ${data.ok ? 'OK' : data.codigo}`,
          description: data.detalle || `${data.canales_ok}/${data.canales_en_linea} canales OK`,
          variant: data.ok ? 'default' : 'destructive',
        });
      }
      await cargar();
    } catch (error) {
      toast({ title: 'Error en la verificación', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setVerificando(null);
    }
  };

  const recursoSeleccionado = recursos.find((r) => String(r.codigo_recurso) === filtro);
  const textoRango = `${desde ? format(parseISO(desde), 'dd/MM/yyyy') : 'el inicio'} – ${hasta ? format(parseISO(hasta), 'dd/MM/yyyy') : 'hoy'}`;

  const accionesFila = (codigo: number) => (
    <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
      <Button variant="ghost" size="sm" onClick={() => verificar(String(codigo))} disabled={!!verificando} title="Verificar ahora">
        {verificando === String(codigo) ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanEye className="h-4 w-4" />}
        <span className="ml-1 hidden md:inline">Verificar</span>
      </Button>
      <Button variant="ghost" size="sm" asChild title="Ver canales">
        <Link href={`/dashboard/camaras/visor?recurso=${codigo}`}>
          <MonitorPlay className="h-4 w-4" />
          <span className="ml-1 hidden md:inline">Visor</span>
        </Link>
      </Button>
    </TableCell>
  );

  const filaClick = (codigo: number) => ({
    className: filtro === TODOS ? 'cursor-pointer' : '',
    onClick: () => filtro === TODOS && setFiltro(String(codigo)),
  });

  const filaCargando = (cols: number) => (
    <TableRow>
      <TableCell colSpan={cols} className="h-24 text-center text-muted-foreground">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Cargando...
      </TableCell>
    </TableRow>
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Panel de cámaras"
        description={conRango ? `Verificaciones registradas entre ${textoRango}.` : 'Resultado de la última verificación de cada recurso activo.'}
        actions={
          <>
            <Button variant="outline" onClick={cargar} disabled={loading || !!verificando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </Button>
            <Button onClick={() => verificar(filtro)} disabled={loading || !!verificando}>
              {verificando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanEye className="mr-2 h-4 w-4" />}
              {filtro === TODOS ? 'Verificar todos' : 'Verificar recurso'}
            </Button>
          </>
        }
      />

      {/* Filtros en una sola fila */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Recurso</Label>
            <RecursoSelect recursos={recursos} value={filtro} onChange={setFiltro} incluirTodos disabled={loading} />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="desde" className="text-xs text-muted-foreground">Desde</Label>
              <Input id="desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hasta" className="text-xs text-muted-foreground">Hasta</Label>
              <Input id="hasta" type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className="w-[160px]" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => aplicarPreset(1)}>Hoy</Button>
            <Button variant="outline" size="sm" onClick={() => aplicarPreset(7)}>7 días</Button>
            <Button variant="outline" size="sm" onClick={() => aplicarPreset(30)}>30 días</Button>
            {conRango && (
              <Button variant="ghost" size="sm" onClick={limpiarFechas}>
                <X className="mr-1 h-4 w-4" /> Última verificación
              </Button>
            )}
          </div>
          {verificando && (
            <span className="text-xs text-muted-foreground lg:ml-auto">
              Verificando{verificando === TODOS ? ' todos los recursos' : ''}… puede tardar varios segundos por NVR.
            </span>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo={filtro === TODOS ? 'Recursos activos' : 'Recurso'} valor={kpis.total} icono={Activity} color="bg-primary/10 text-primary" />
        <Kpi titulo="Funcionando" valor={kpis.ok} icono={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
        <Kpi titulo="Con fallas" valor={kpis.fallas} icono={XCircle} color="bg-red-50 text-red-600" />
        <Kpi titulo={conRango ? 'Sin verificar en el rango' : 'Sin verificar'} valor={kpis.sinVerificar} icono={CircleHelp} color="bg-slate-100 text-slate-600" />
      </div>

      {/* Grafico */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Fallas por recurso</CardTitle>
              <CardDescription>
                {heatmap.total} fallas · {format(parseISO(rangoGrafico.inicio), 'dd/MM/yyyy')} – {format(parseISO(rangoGrafico.fin), 'dd/MM/yyyy')}
                {filtro !== TODOS && recursoSeleccionado ? ` · ${recursoSeleccionado.nombre_recurso}` : ''}
                {!conRango && ` (últimos ${DIAS_GRAFICO_POR_DEFECTO} días)`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex rounded-md border p-0.5">
                {(['dia', 'semana'] as const).map((g) => (
                  <Button
                    key={g}
                    variant={granularidad === g ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => setGranularidad(g)}
                  >
                    {g === 'dia' ? 'Días' : 'Semanas'}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Switch id="desconectados" checked={incluirDesconectados} onCheckedChange={setIncluirDesconectados} />
                <Label htmlFor="desconectados" className="text-sm">Incluir canales desconectados</Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : (
            <FallasHeatmap
              filas={heatmap.filas}
              periodos={heatmap.periodos}
              celdas={heatmap.celdas}
              granularidad={granularidad}
              onSelectRecurso={(codigo) => setFiltro(String(codigo))}
            />
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Verde: hubo verificaciones y ninguna falla en el período. Rojo: cuenta cada falla de canal, de equipo (sin red, credenciales…) y de consultas parciales; el resumen «FALLAN_CANALES» no se suma para no contar dos veces. Clic en un recurso para filtrarlo.
          </p>
        </CardContent>
      </Card>

      {/* Tabla principal */}
      <Card>
        <CardHeader>
          <CardTitle>{conRango ? 'Verificaciones en el rango' : 'Estado por recurso'}</CardTitle>
          <CardDescription>
            {conRango
              ? `Verificaciones completas entre ${textoRango}; el resultado es el último del rango.`
              : 'Resultado de la última verificación completa (no consulta las cámaras en vivo).'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            {conRango ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Verificaciones</TableHead>
                    <TableHead className="text-right">OK</TableHead>
                    <TableHead className="text-right">Fallas</TableHead>
                    <TableHead>Último resultado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && filaCargando(8)}
                  {!loading && filasRango.map((f) => (
                    <TableRow key={f.codigo_recurso} {...filaClick(f.codigo_recurso)}>
                      <TableCell className="font-medium">{f.nombre}</TableCell>
                      <TableCell className="font-mono text-sm">{f.ip || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{f.verificaciones}</TableCell>
                      <TableCell className="text-right tabular-nums">{f.ok}</TableCell>
                      <TableCell className="text-right tabular-nums">{f.fallas}</TableCell>
                      <TableCell><ResultadoBadge resultado={f.ultimo?.resultado} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatFecha(f.ultimo?.fecha_hora_registro)}</TableCell>
                      {accionesFila(f.codigo_recurso)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Última verificación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && filaCargando(5)}
                  {!loading && filasEstado.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Sin recursos activos.</TableCell>
                    </TableRow>
                  )}
                  {!loading && filasEstado.map((e) => (
                    <TableRow key={e.codigo_recurso} {...filaClick(e.codigo_recurso)}>
                      <TableCell className="font-medium">{e.nombre_recurso || nombreRecurso(e.codigo_recurso)?.nombre_recurso || `Recurso ${e.codigo_recurso}`}</TableCell>
                      <TableCell className="font-mono text-sm">{e.ip_recurso || '—'}</TableCell>
                      <TableCell><ResultadoBadge resultado={e.resultado} ok={e.ok} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatFecha(e.fecha_verificacion)}</TableCell>
                      {accionesFila(e.codigo_recurso)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detalle del recurso seleccionado */}
      {filtro !== TODOS && !loading && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {conRango && <CalendarRange className="h-5 w-5 text-primary" />}
                  {conRango ? 'Historial' : 'Última verificación'} · {recursoSeleccionado?.nombre_recurso ?? `Recurso ${filtro}`}
                </CardTitle>
                <CardDescription>
                  {conRango
                    ? `${logsEnRango.length} registros entre ${textoRango} (por canal, red, captura y grabación).`
                    : ultimaVerificacion.length
                      ? `${formatFecha(ultimaVerificacion[0].fecha_hora_registro)} · resultado general y de cada canal.`
                      : 'Este recurso aún no tiene una verificación completa.'}
                </CardDescription>
              </div>
              {conRango && (
                <Input
                  placeholder="Filtrar resultado (ej. FAIL, CH02)"
                  value={filtroResultado}
                  onChange={(e) => setFiltroResultado(e.target.value)}
                  className="md:w-[260px]"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <TablaLogs
              logs={conRango ? logsEnRango : ultimaVerificacion}
              vacio={conRango ? 'Sin registros en el rango.' : 'Sin verificaciones registradas.'}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
