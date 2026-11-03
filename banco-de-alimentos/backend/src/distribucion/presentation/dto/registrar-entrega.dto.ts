import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class LoteEntregaDto {
  @IsString()
  @IsNotEmpty({ message: 'loteId es requerido' })
  loteId: string;

  @IsInt({ message: 'debe ser un número entero' })
  @Min(1, { message: 'debe ser mayor o igual a 1' })
  cantidad: number;
}

export class RegistrarEntregaDto {
  @IsString()
  @IsNotEmpty({ message: 'depositoId es requerido' })
  depositoId: string;

  @IsString()
  @IsNotEmpty({ message: 'comedorId es requerido' })
  comedorId: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsArray({ message: 'lotes debe ser una lista' })
  @ValidateNested({ each: true, message: 'debe contener objetos con loteId y cantidad' })
  @Type(() => LoteEntregaDto)
  lotes?: LoteEntregaDto[];

  @IsOptional()
  @IsArray({ message: 'items debe ser una lista' })
  @ValidateNested({ each: true, message: 'debe contener objetos con loteId y cantidad' })
  @Type(() => LoteEntregaDto)
  items?: LoteEntregaDto[];
}
