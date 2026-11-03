import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuarioOidc } from '../auth/interfaces/oidc-payload.interface';
import { DatabaseService } from '../common/database/database.service';
import * as seedUsers from './seeds/users.seed.json';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly fallbackUsuarios: UsuarioOidc[];

  constructor(private readonly db: DatabaseService) {
    const raw = (seedUsers as any).default || seedUsers;
    this.fallbackUsuarios = Array.isArray(raw) ? raw : [];
  }

  async findByEmail(email: string): Promise<UsuarioOidc | undefined> {
    if (!email) return undefined;
    try {
      const res = await this.db.query<any>(
        `SELECT id, nombre, email, password_hash as "passwordHash", rol, 
                deposito_asignado_id as "depositoAsignadoId", 
                comedor_asignado_id as "comedorAsignadoId" 
         FROM usuarios 
         WHERE LOWER(email) = LOWER($1) 
         LIMIT 1`,
        [email.trim()]
      );

      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err) {
      this.logger.warn(`Error al consultar usuario por email en DB, usando fallback: ${(err as Error).message}`);
    }

    return this.fallbackUsuarios.find(
      (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
    );
  }

  async findById(id: string): Promise<UsuarioOidc | undefined> {
    if (!id) return undefined;
    try {
      const res = await this.db.query<any>(
        `SELECT id, nombre, email, password_hash as "passwordHash", rol, 
                deposito_asignado_id as "depositoAsignadoId", 
                comedor_asignado_id as "comedorAsignadoId" 
         FROM usuarios 
         WHERE id = $1 
         LIMIT 1`,
        [id]
      );

      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err) {
      this.logger.warn(`Error al consultar usuario por id en DB: ${(err as Error).message}`);
    }

    return this.fallbackUsuarios.find((u) => u.id === id);
  }

  /**
   * Valida la contraseña comparando el texto plano contra el hash criptográfico Bcrypt
   */
  async comparePassword(plainPassword: string, hash: string): Promise<boolean> {
    if (!plainPassword || !hash) return false;
    return bcrypt.compare(plainPassword, hash);
  }
}
