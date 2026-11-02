import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuarioOidc } from '../auth/interfaces/oidc-payload.interface';
import * as seedUsers from './seeds/users.seed.json';

@Injectable()
export class UsersService {
  private readonly usuarios: UsuarioOidc[];

  constructor() {
    const raw = (seedUsers as any).default || seedUsers;
    this.usuarios = Array.isArray(raw) ? raw : [];
  }

  async findByEmail(email: string): Promise<UsuarioOidc | undefined> {
    return this.usuarios.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
  }

  async findById(id: string): Promise<UsuarioOidc | undefined> {
    return this.usuarios.find((u) => u.id === id);
  }

  /**
   * Valida la contraseña comparando el texto plano contra el hash criptográfico Bcrypt
   */
  async comparePassword(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
