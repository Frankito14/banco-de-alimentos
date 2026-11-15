import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

const NOMBRES_AMIGABLES: Record<string, string> = {
  usuario: 'correo electrónico',
  email: 'correo electrónico',
  password: 'contraseña',
  depositoId: 'depósito',
  comedorId: 'comedor',
  lotes: 'alimentos',
  items: 'alimentos',
  loteId: 'lote',
  cantidad: 'cantidad',
  observaciones: 'observaciones',
  conformidad: 'conformidad',
  recepcionConforme: 'recepción conforme',
};

export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException(errors.flatMap((error) => mensajes(error, '')));
}

function formatearCampo(campo: string): string {
  const match = /^([a-zA-Z0-9_]+)\[(\d+)\]\.(.+)$/.exec(campo);
  if (match) {
    const [, lista, idx, subcampo] = match;
    const subNombre = NOMBRES_AMIGABLES[subcampo] ?? subcampo;
    const prefijo = lista === 'lotes' || lista === 'items' ? 'del alimento' : `de ${NOMBRES_AMIGABLES[lista] ?? lista}`;
    return `${subNombre} ${prefijo} #${Number(idx) + 1}`;
  }
  return NOMBRES_AMIGABLES[campo] ?? campo;
}

function mensajes(error: ValidationError, padre: string): string[] {
  const campo = !padre
    ? error.property
    : /^\d+$/.test(error.property)
      ? `${padre}[${error.property}]`
      : `${padre}.${error.property}`;

  const propios: string[] = [];
  if (error.constraints) {
    const { nestedValidation, ...reglas } = error.constraints;
    const motivoBruto =
      error.value === undefined || error.value === null
        ? 'es obligatorio'
        : (Object.values(reglas).at(-1) ?? nestedValidation ?? 'no es válido');
    const prefijoPropiedad = `${error.property} `;
    const motivo = motivoBruto.startsWith(prefijoPropiedad)
      ? motivoBruto.slice(prefijoPropiedad.length)
      : motivoBruto;
    propios.push(`El campo ${formatearCampo(campo)} ${motivo}.`);
  }

  const hijos = (error.children ?? []).flatMap((hijo) => mensajes(hijo, campo));
  return [...propios, ...hijos];
}
