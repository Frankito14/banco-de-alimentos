import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException(errors.flatMap((error) => mensajes(error, '')));
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
    const motivo =
      error.value === undefined || error.value === null
        ? 'es obligatorio'
        : (Object.values(reglas).at(-1) ?? nestedValidation);
    propios.push(`El campo ${campo} ${motivo}.`);
  }

  const hijos = (error.children ?? []).flatMap((hijo) => mensajes(hijo, campo));
  return [...propios, ...hijos];
}
