import { IsBoolean, IsOptional, IsString } from 'class-validator';


// Forma de RecepcionEntregaRequest del openapi
export class RecepcionEntregaDto {
  @IsBoolean({ message: 'debe ser true o false' })
  recepcionConforme!: boolean;

  @IsOptional()
  @IsString({ message: 'debe ser un texto' })
  observaciones?: string | null;
}
