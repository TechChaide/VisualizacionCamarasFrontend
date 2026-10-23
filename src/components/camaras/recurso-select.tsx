'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Recurso } from '@/types/camaras';

export const TODOS = 'todos';

interface RecursoSelectProps {
  recursos: Recurso[];
  value: string;
  onChange: (value: string) => void;
  /** Agrega la opcion "Todos los recursos" */
  incluirTodos?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function RecursoSelect({ recursos, value, onChange, incluirTodos, disabled, placeholder = 'Selecciona un recurso', className }: RecursoSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className ?? 'w-full sm:w-[320px]'}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {incluirTodos && <SelectItem value={TODOS}>Todos los recursos</SelectItem>}
        {recursos.map((r) => (
          <SelectItem key={r.codigo_recurso} value={String(r.codigo_recurso)}>
            {r.nombre_recurso || `Recurso ${r.codigo_recurso}`}
            {r.ip_recurso ? <span className="text-muted-foreground"> · {r.ip_recurso}</span> : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
