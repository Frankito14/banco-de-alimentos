import { IsNotEmpty, IsString } from 'class-validator';
import { Rol } from '../interfaces/oidc-payload.interface';

export class LoginRequestDto {
  @IsString()
  @IsNotEmpty()
  usuario: string; // Email

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UsuarioPerfilResponseDto {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  depositoAsignadoId?: string | null;
  comedorAsignadoId?: string | null;
}

export class LoginResponseDto {
  token: string;
  tokenType: string;
  expiresIn: number;
  usuario: UsuarioPerfilResponseDto;
}
