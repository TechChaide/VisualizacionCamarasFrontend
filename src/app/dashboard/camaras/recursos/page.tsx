'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, Loader2, PlusCircle, RefreshCw, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { recursoService } from '@/services/camaras/recurso.service';
import type { Recurso, RecursoSave } from '@/types/camaras';
import { PageHeader } from '@/components/camaras/page-header';
import { EstadoBadge } from '@/components/camaras/estado-badge';
import { fechaLocalIso, formatFecha, getErrorMessage, getUsuarioActual } from '@/components/camaras/camaras-utils';

type FormState = {
  codigo_recurso: number;
  nombre_recurso: string;
  ip_recurso: string;
  usuario: string;
  passcode: string;
  referencia: string;
  estado: 'A' | 'I';
};

const FORM_VACIO: FormState = {
  codigo_recurso: 0,
  nombre_recurso: '',
  ip_recurso: '',
  usuario: '',
  passcode: '',
  referencia: '',
  estado: 'A',
};

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

function validar(form: FormState): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!form.nombre_recurso.trim()) errores.nombre_recurso = 'El nombre es obligatorio';
  if (!form.ip_recurso.trim()) errores.ip_recurso = 'La IP es obligatoria';
  else if (!IPV4.test(form.ip_recurso.trim())) errores.ip_recurso = 'IP no válida (ej. 192.168.11.245)';
  const referencia = form.referencia.trim();
  if (referencia.startsWith('{')) {
    try {
      JSON.parse(referencia);
    } catch {
      errores.referencia = 'El JSON de opciones no es válido';
    }
  }
  return errores;
}

export default function RecursosPage() {
  const { toast } = useToast();
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const [porDesactivar, setPorDesactivar] = useState<Recurso | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await recursoService.getAll();
      setRecursos(resp.data ?? []);
    } catch (error) {
      toast({ title: 'Error al cargar recursos', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return recursos.filter((r) => {
      if (!verInactivos && r.estado === 'I') return false;
      if (!texto) return true;
      return [r.nombre_recurso, r.ip_recurso, r.usuario, r.referencia, String(r.codigo_recurso)]
        .some((v) => v?.toLowerCase().includes(texto));
    });
  }, [recursos, busqueda, verInactivos]);

  const abrirNuevo = () => {
    setForm(FORM_VACIO);
    setErrores({});
    setDialogOpen(true);
  };

  const abrirEdicion = (r: Recurso) => {
    setForm({
      codigo_recurso: r.codigo_recurso,
      nombre_recurso: r.nombre_recurso ?? '',
      ip_recurso: r.ip_recurso ?? '',
      usuario: r.usuario ?? '',
      passcode: '',
      referencia: r.referencia ?? '',
      estado: r.estado === 'I' ? 'I' : 'A',
    });
    setErrores({});
    setDialogOpen(true);
  };

  const setCampo = <K extends keyof FormState>(campo: K, valor: FormState[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => {
      if (!e[campo]) return e;
      const { [campo]: _, ...resto } = e;
      return resto;
    });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nuevosErrores = validar(form);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length) return;

    const payload: RecursoSave = {
      codigo_recurso: form.codigo_recurso,
      nombre_recurso: form.nombre_recurso.trim(),
      ip_recurso: form.ip_recurso.trim(),
      usuario: form.usuario.trim() || null,
      referencia: form.referencia.trim() || null,
      estado: form.estado,
      fecha_modificacion: fechaLocalIso(),
      usuario_modificacion: getUsuarioActual() ?? null,
    };
    // Sin passcode en una edicion, el backend conserva el guardado
    if (form.passcode) payload.passcode = form.passcode;

    setGuardando(true);
    try {
      await recursoService.save(payload);
      toast({ title: form.codigo_recurso ? 'Recurso actualizado' : 'Recurso creado', description: payload.nombre_recurso ?? '' });
      setDialogOpen(false);
      await cargar();
    } catch (error) {
      toast({ title: 'No se pudo guardar', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setGuardando(false);
    }
  };

  const desactivar = async () => {
    if (!porDesactivar) return;
    try {
      await recursoService.delete(porDesactivar.codigo_recurso);
      toast({ title: 'Recurso desactivado', description: porDesactivar.nombre_recurso ?? '' });
      await cargar();
    } catch (error) {
      toast({ title: 'No se pudo desactivar', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setPorDesactivar(null);
    }
  };

  const reactivar = async (r: Recurso) => {
    try {
      await recursoService.save({
        codigo_recurso: r.codigo_recurso,
        estado: 'A',
        fecha_modificacion: fechaLocalIso(),
        usuario_modificacion: getUsuarioActual() ?? null,
      });
      toast({ title: 'Recurso reactivado', description: r.nombre_recurso ?? '' });
      await cargar();
    } catch (error) {
      toast({ title: 'No se pudo reactivar', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const esEdicion = form.codigo_recurso > 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Recursos"
        description="Cámaras y NVR que se verifican. Los recursos inactivos no se incluyen en la verificación."
        actions={
          <>
            <Button variant="outline" onClick={cargar} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </Button>
            <Button onClick={abrirNuevo}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nuevo recurso
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Listado</CardTitle>
              <CardDescription>{filtrados.length} de {recursos.length} recursos</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, IP, usuario..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-8 sm:w-[280px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ver-inactivos" checked={verInactivos} onCheckedChange={setVerInactivos} />
                <Label htmlFor="ver-inactivos" className="text-sm">Ver inactivos</Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Modificado</TableHead>
                  <TableHead className="w-[110px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Cargando recursos...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No hay recursos que coincidan.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtrados.map((r) => (
                  <TableRow key={r.codigo_recurso} className={r.estado === 'I' ? 'opacity-60' : ''}>
                    <TableCell className="font-mono text-xs">{r.codigo_recurso}</TableCell>
                    <TableCell className="font-medium">{r.nombre_recurso || '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{r.ip_recurso || '—'}</TableCell>
                    <TableCell>{r.usuario || <span className="text-muted-foreground">Por defecto</span>}</TableCell>
                    <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground" title={r.referencia ?? ''}>
                      {r.referencia || '—'}
                    </TableCell>
                    <TableCell>
                      {r.estado === 'I'
                        ? <EstadoBadge tono="falla">Inactivo</EstadoBadge>
                        : <EstadoBadge tono="ok">Activo</EstadoBadge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatFecha(r.fecha_modificacion)}
                      {r.usuario_modificacion && <div>{r.usuario_modificacion}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicion(r)} title="Editar">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      {r.estado === 'I' ? (
                        <Button variant="ghost" size="icon" onClick={() => reactivar(r)} title="Reactivar">
                          <RotateCcw className="h-4 w-4 text-emerald-600" />
                          <span className="sr-only">Reactivar</span>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setPorDesactivar(r)} title="Desactivar">
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Desactivar</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Crear / editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !guardando && setDialogOpen(open)}>
        <DialogContent className="sm:max-w-[560px]">
          <form onSubmit={guardar} noValidate>
            <DialogHeader>
              <DialogTitle>{esEdicion ? `Editar recurso #${form.codigo_recurso}` : 'Nuevo recurso'}</DialogTitle>
              <DialogDescription>
                Cámara IP o NVR Hikvision. Si un NVR tiene varios canales, se revisan todos.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nombre_recurso">Nombre *</Label>
                <Input id="nombre_recurso" maxLength={50} value={form.nombre_recurso} onChange={(e) => setCampo('nombre_recurso', e.target.value)} />
                {errores.nombre_recurso && <p className="text-xs text-destructive">{errores.nombre_recurso}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ip_recurso">IP *</Label>
                <Input id="ip_recurso" maxLength={50} placeholder="192.168.11.245" value={form.ip_recurso} onChange={(e) => setCampo('ip_recurso', e.target.value)} />
                {errores.ip_recurso && <p className="text-xs text-destructive">{errores.ip_recurso}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setCampo('estado', v as 'A' | 'I')}>
                  <SelectTrigger id="estado"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Activo</SelectItem>
                    <SelectItem value="I">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario">Usuario del equipo</Label>
                <Input id="usuario" maxLength={50} autoComplete="off" placeholder="Vacío = usuario por defecto" value={form.usuario} onChange={(e) => setCampo('usuario', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passcode">Contraseña del equipo</Label>
                <Input
                  id="passcode"
                  type="password"
                  maxLength={100}
                  autoComplete="new-password"
                  placeholder={esEdicion ? 'Vacío = conservar la actual' : 'Vacío = contraseña por defecto'}
                  value={form.passcode}
                  onChange={(e) => setCampo('passcode', e.target.value)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="referencia">Referencia / opciones</Label>
                <Textarea
                  id="referencia"
                  maxLength={250}
                  rows={3}
                  className="font-mono text-xs"
                  placeholder='Texto libre, o JSON: {"canal": 3}  {"grabacion": "eventos"}  {"http_port": 8080}'
                  value={form.referencia}
                  onChange={(e) => setCampo('referencia', e.target.value)}
                />
                {errores.referencia
                  ? <p className="text-xs text-destructive">{errores.referencia}</p>
                  : <p className="text-xs text-muted-foreground">Si es JSON, la verificación usa sus opciones (canal, stream, grabacion, http_port, rtsp_port, https, grabador).</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={guardando}>Cancelar</Button>
              <Button type="submit" disabled={guardando}>
                {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar desactivacion */}
      <AlertDialog open={!!porDesactivar} onOpenChange={(open) => !open && setPorDesactivar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar este recurso?</AlertDialogTitle>
            <AlertDialogDescription>
              «{porDesactivar?.nombre_recurso}» ({porDesactivar?.ip_recurso}) dejará de verificarse. Podrás reactivarlo después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={desactivar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
