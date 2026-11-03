import { IsBoolean, IsOptional, IsString } from 'class-validator';

// Forma de RecepcionEntregaRequest del openapi y frontend
export class RecepcionEntregaDto {
  @IsOptional()
  @IsBoolean({ message: 'debe ser true o false' })
  recepcionConforme?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'debe ser true o false' })
  conformidad?: boolean;

  @IsOptional()
  @IsString({ message: 'debe ser un texto' })
  observaciones?: string | null;

  @IsOptional()
  @IsString()
  recibidoPor?: string;

  @IsOptional()
  @IsString()
  fechaRecepcion?: string;

  @IsOptional()
  @IsString()
  horarioRecepcion?: string;
}
