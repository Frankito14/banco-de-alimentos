import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';


export class LoteEntregaDto {
  @IsUUID('all', { message: 'debe ser un UUID válido' })
  loteId: string;

  @IsInt({ message: 'debe ser un número entero' })
  @Min(1, { message: 'debe ser mayor o igual a 1' })
  cantidad: number;
}

export class RegistrarEntregaDto {
  @IsUUID('all', { message: 'debe ser un UUID válido' })
  depositoId: string;

  @IsUUID('all', { message: 'debe ser un UUID válido' })
  comedorId: string;

  @IsArray({ message: 'debe ser una lista' })
  @ArrayMinSize(1, { message: 'debe tener al menos un lote' })
  @ArrayUnique((lote: LoteEntregaDto) => lote.loteId, { message: 'no puede tener lotes repetidos' })
  @ValidateNested({ each: true, message: 'debe contener objetos con loteId y cantidad' })
  @Type(() => LoteEntregaDto)
  lotes: LoteEntregaDto[];
}
