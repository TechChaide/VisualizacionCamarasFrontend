'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Camera, Cctv, Download, ImageOff, Images, Loader2, Maximize2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { recursoService } from '@/services/camaras/recurso.service';
import { verificacionService } from '@/services/camaras/verificacion.service';
import type { CanalResumido, EstadoResumido, Recurso } from '@/types/camaras';
import { PageHeader } from '@/components/camaras/page-header';
import { RecursoSelect } from '@/components/camaras/recurso-select';
import { IndicadorBadge, ResultadoBadge } from '@/components/camaras/estado-badge';
import { formatFecha, getErrorMessage } from '@/components/camaras/camaras-utils';

/** Capturas simultaneas al pulsar "Capturar todas" (no saturar el NVR). */
const CAPTURAS_EN_PARALELO = 3;

type Captura = { url?: string; fecha?: Date; loading: boolean; error?: string };

/** Una camara IP directa no trae canales: se muestra como un unico canal. */
function canalesDe(resultado: EstadoResumido): (CanalResumido & { directo?: boolean })[] {
  if (resultado.canales.length) return resultado.canales;
  return [{
    canal: 1,
    directo: true,
    nombre: resultado.nombre,
    disponibilidad: resultado.disponibilidad,
    devuelve_imagen: resultado.devuelve_imagen,
    graba_disco: resultado.graba_disco,
    resultado: resultado.resultado,
    detalle: resultado.detalle,
  }];
}

function VisorCamaras() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [recursosLoading, setRecursosLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState<string>(searchParams.get('recurso') ?? '');

  const [resultado, setResultado] = useState<EstadoResumido | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [capturas, setCapturas] = useState<Record<number, Captura>>({});
  const [capturandoTodas, setCapturandoTodas] = useState(false);
  const [ampliada, setAmpliada] = useState<{ canal: CanalResumido; url: string; fecha?: Date } | null>(null);

  const consultaActual = useRef(0);
  const urlsCreadas = useRef<Set<string>>(new Set());

  const liberarUrl = (url?: string) => {
    if (url && urlsCreadas.current.has(url)) {
      URL.revokeObjectURL(url);
      urlsCreadas.current.delete(url);
    }
  };

  const limpiarCapturas = useCallback(() => {
    urlsCreadas.current.forEach((url) => URL.revokeObjectURL(url));
    urlsCreadas.current.clear();
    setCapturas({});
  }, []);

  useEffect(() => () => {
    urlsCreadas.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const resp = await recursoService.getAll();
        setRecursos((resp.data ?? []).filter((r) => r.estado !== 'I'));
      } catch (err) {
        toast({ title: 'Error al cargar recursos', description: getErrorMessage(err), variant: 'destructive' });
      } finally {
        setRecursosLoading(false);
      }
    })();
  }, [toast]);

  /** Captura un canal; se descarta si mientras tanto se consulto otro recurso. */
  const capturar = useCallback(async (codigo: string, canal: CanalResumido & { directo?: boolean }) => {
    const id = consultaActual.current;
    setCapturas((prev) => ({ ...prev, [canal.canal]: { ...prev[canal.canal], loading: true, error: undefined } }));
    try {
      const blob = await verificacionService.getCaptura(codigo, canal.directo ? undefined : canal.canal);
      if (id !== consultaActual.current) return;
      const url = URL.createObjectURL(blob);
      urlsCreadas.current.add(url);
      setCapturas((prev) => {
        liberarUrl(prev[canal.canal]?.url);
        return { ...prev, [canal.canal]: { url, fecha: new Date(), loading: false } };
      });
    } catch (err) {
      if (id !== consultaActual.current) return;
      setCapturas((prev) => ({ ...prev, [canal.canal]: { ...prev[canal.canal], loading: false, error: getErrorMessage(err, 'Sin imagen') } }));
    }
  }, []);

  const capturarTodas = useCallback(async (codigo: string, consulta: EstadoResumido) => {
    const id = consultaActual.current;
    const pendientes = canalesDe(consulta).filter((c) => c.disponibilidad !== false);
    setCapturandoTodas(true);
    const trabajador = async () => {
      let canal = pendientes.shift();
      while (canal && id === consultaActual.current) {
        await capturar(codigo, canal);
        canal = pendientes.shift();
      }
    };
    await Promise.all(Array.from({ length: CAPTURAS_EN_PARALELO }, trabajador));
    if (id === consultaActual.current) setCapturandoTodas(false);
  }, [capturar]);

  /** Consulta el recurso y, al terminar, captura automaticamente todos sus canales en linea. */
  const consultar = useCallback(async (codigo: string) => {
    if (!codigo) return;
    const id = ++consultaActual.current;
    setConsultando(true);
    setCapturandoTodas(false);
    setError(null);
    setResultado(null);
    limpiarCapturas();
    let data: EstadoResumido | null = null;
    try {
      data = (await verificacionService.getCamara(codigo)).data;
      if (id === consultaActual.current) setResultado(data);
    } catch (err) {
      if (id === consultaActual.current) setError(getErrorMessage(err, 'No se pudo consultar el recurso'));
    } finally {
      if (id === consultaActual.current) setConsultando(false);
    }
    if (data && id === consultaActual.current) capturarTodas(codigo, data);
  }, [limpiarCapturas, capturarTodas]);

  useEffect(() => {
    if (seleccionado) consultar(seleccionado);
  }, [seleccionado, consultar]);

  const cambiarRecurso = (codigo: string) => {
    setSeleccionado(codigo);
    const params = new URLSearchParams(searchParams.toString());
    params.set('recurso', codigo);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const recurso = recursos.find((r) => String(r.codigo_recurso) === seleccionado);
  const canales = resultado ? canalesDe(resultado) : [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Visor de cámaras"
        description="Elige un recurso para consultar sus canales en vivo; se captura automáticamente una imagen de cada cámara en línea."
        actions={
          <>
            <Button variant="outline" onClick={() => consultar(seleccionado)} disabled={!seleccionado || consultando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${consultando ? 'animate-spin' : ''}`} /> Reconsultar
            </Button>
            <Button onClick={() => resultado && capturarTodas(seleccionado, resultado)} disabled={!resultado || consultando || capturandoTodas}>
              {capturandoTodas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Images className="mr-2 h-4 w-4" />}
              Capturar todas
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="text-sm font-medium">Recurso:</span>
        <RecursoSelect
          recursos={recursos}
          value={seleccionado}
          onChange={cambiarRecurso}
          disabled={recursosLoading}
          placeholder={recursosLoading ? 'Cargando recursos...' : 'Selecciona un recurso'}
        />
      </div>

      {!seleccionado && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Cctv className="h-12 w-12" />
            <p>Selecciona un recurso para ver sus canales.</p>
          </CardContent>
        </Card>
      )}

      {seleccionado && consultando && (
        <>
          <Card>
            <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Consultando {recurso?.nombre_recurso ?? 'el recurso'}: se revisa la red, la imagen y la grabación de cada canal. Puede tardar varios segundos.
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-video w-full rounded-lg" />)}
          </div>
        </>
      )}

      {seleccionado && !consultando && error && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ImageOff className="h-10 w-10 text-destructive" />
            <p className="font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={() => consultar(seleccionado)}>Reintentar</Button>
          </CardContent>
        </Card>
      )}

      {resultado && !consultando && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cctv className="h-5 w-5 text-primary" />
                    {resultado.nombre ?? recurso?.nombre_recurso}
                  </CardTitle>
                  <CardDescription className="font-mono">{resultado.ip} · consultado {formatFecha(resultado.fecha)}</CardDescription>
                </div>
                <ResultadoBadge resultado={resultado.resultado} ok={resultado.resultado === 'OK'} title={resultado.detalle} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <IndicadorBadge label="En red" value={resultado.disponibilidad} />
              <IndicadorBadge label="Imagen" value={resultado.devuelve_imagen} />
              <IndicadorBadge label="Graba" value={resultado.graba_disco} />
              <span className="ml-auto text-sm text-muted-foreground">
                {resultado.canales.length
                  ? <>{resultado.canales_en_linea} en línea · {resultado.canales_ok} OK · {resultado.canales_desconectados} desconectados</>
                  : 'Cámara directa (un solo canal)'}
              </span>
              {resultado.detalle && <p className="w-full text-sm text-muted-foreground">{resultado.detalle}</p>}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {canales.map((canal) => {
              const captura = capturas[canal.canal];
              const desconectado = canal.disponibilidad === false;
              return (
                <Card key={canal.canal} className={desconectado ? 'opacity-70' : ''}>
                  <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-slate-900">
                    {captura?.url ? (
                      <button
                        type="button"
                        className="group h-full w-full"
                        onClick={() => setAmpliada({ canal, url: captura.url!, fecha: captura.fecha })}
                        title="Ampliar"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={captura.url} alt={`Canal ${canal.canal}`} className="h-full w-full object-cover" />
                        <Maximize2 className="absolute right-2 top-2 h-5 w-5 text-white opacity-0 drop-shadow transition group-hover:opacity-100" />
                      </button>
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-slate-400">
                        {captura?.error ? <ImageOff className="h-8 w-8 text-red-400" /> : <Camera className="h-8 w-8" />}
                        <span className="text-xs">{captura?.error ?? (desconectado ? 'Canal desconectado' : 'Sin captura')}</span>
                      </div>
                    )}
                    {captura?.loading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 font-mono text-xs text-white">
                      CH{String(canal.canal).padStart(2, '0')}
                    </span>
                  </div>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium" title={canal.nombre ?? ''}>{canal.nombre || `Canal ${canal.canal}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {captura?.fecha ? `Captura ${formatFecha(captura.fecha.toISOString())}` : canal.detalle || ' '}
                        </p>
                      </div>
                      <ResultadoBadge resultado={canal.resultado} ok={canal.resultado === 'OK'} title={canal.detalle} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <IndicadorBadge label="En línea" value={canal.disponibilidad} />
                      <IndicadorBadge label="Imagen" value={canal.devuelve_imagen} />
                      <IndicadorBadge label="Graba" value={canal.graba_disco} />
                    </div>
                    <Button
                      variant={captura?.url ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => capturar(seleccionado, canal)}
                      disabled={captura?.loading || desconectado}
                    >
                      {captura?.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                      {captura?.url ? 'Capturar de nuevo' : 'Capturar imagen'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={!!ampliada} onOpenChange={(open) => !open && setAmpliada(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              CH{String(ampliada?.canal.canal ?? '').padStart(2, '0')} · {ampliada?.canal.nombre || resultado?.nombre}
            </DialogTitle>
            <DialogDescription>
              {resultado?.ip} · {ampliada?.fecha ? formatFecha(ampliada.fecha.toISOString()) : ''}
            </DialogDescription>
          </DialogHeader>
          {ampliada && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ampliada.url} alt="Captura ampliada" className="max-h-[75vh] w-full rounded-md object-contain bg-black" />
              <div className="flex justify-end">
                <Button variant="outline" asChild>
                  <a href={ampliada.url} download={`captura_${resultado?.ip}_CH${String(ampliada.canal.canal).padStart(2, '0')}.jpg`}>
                    <Download className="mr-2 h-4 w-4" /> Descargar
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function VisorCamarasPage() {
  // useSearchParams requiere un limite de Suspense en Next 15
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando visor...</div>}>
      <VisorCamaras />
    </Suspense>
  );
}
