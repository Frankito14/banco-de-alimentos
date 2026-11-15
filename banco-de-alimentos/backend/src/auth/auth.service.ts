import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';
import { ProblemDetailsException } from '../common/exceptions/problem-details.exception';
import { Rol } from './interfaces/oidc-payload.interface';
import { DatabaseService } from '../common/database/database.service';

export interface UsuarioDemoDto {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  depositoAsignadoId: string | null;
  depositoNombre: string | null;
  comedorAsignadoId: string | null;
  comedorNombre: string | null;
}

interface RawOidcUser {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  depositoAsignadoId: string | null;
  comedorAsignadoId: string | null;
}

const ROLES_VALIDOS: Rol[] = ['Coordinador', 'ReferenteComedor', 'Voluntario'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Autenticación delegada en el Identity Provider OIDC (Keycloak).
   * La aplicación no gestiona contraseñas ni hashes propios.
   */
  async login(loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    const keycloakInternalUrl = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080';
    const realm = process.env.KEYCLOAK_REALM || 'banco-de-alimentos';
    const clientId = process.env.KEYCLOAK_CLIENT_ID || 'banco-alimentos-client';
    const tokenUrl = `${keycloakInternalUrl}/realms/${realm}/protocol/openid-connect/token`;

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', clientId);
      params.append('username', loginDto.usuario);
      params.append('password', loginDto.password);

      this.logger.log(`Delegando autenticación a Keycloak IdP: ${loginDto.usuario}`);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Keycloak rechazó credenciales para ${loginDto.usuario}: ${errorText}`);
        throw new ProblemDetailsException({
          status: 401,
          title: 'Credenciales incorrectas',
          detail: 'El correo electrónico o la contraseña ingresados no son válidos. Verificá los datos e intentá nuevamente.',
          type: 'https://bancodealimentos.gob.ar/errores/credenciales-invalidas',
        });
      }

      const tokenData = await response.json();
      const accessToken = tokenData.access_token;

      // Decodificar claims del token emitido por Keycloak
      const decoded: any = this.jwtService.decode(accessToken) || {};
      const realmRoles: string[] = decoded.realm_access?.roles || decoded.roles || [];
      const rol = this.resolverRol(decoded.rol, realmRoles);

      const nombre = decoded.nombre || decoded.name || decoded.preferred_username || loginDto.usuario;

      return {
        token: accessToken,
        tokenType: 'Bearer',
        expiresIn: tokenData.expires_in || 3600,
        usuario: {
          id: decoded.sub,
          nombre,
          email: decoded.email || loginDto.usuario,
          rol,
          depositoAsignadoId: decoded.depositoAsignadoId || null,
          comedorAsignadoId: decoded.comedorAsignadoId || null,
        },
      };
    } catch (err) {
      if (err instanceof ProblemDetailsException) throw err;
      this.logger.error(`Error de conexión con Keycloak: ${(err as Error).message}`);
      throw new ProblemDetailsException({
        status: 503,
        title: 'Servicio de autenticación no disponible',
        detail: 'No pudimos conectar con el servicio de inicio de sesión en este momento. Intentá nuevamente en unos segundos.',
        type: 'https://bancodealimentos.gob.ar/errores/idp-no-disponible',
      });
    }
  }

  /**
   * Endpoint de configuración OIDC Discovery 1.0 apuntando al IdP Keycloak
   */
  getOpenIdConfiguration() {
    const keycloakPublicUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    const realm = process.env.KEYCLOAK_REALM || 'banco-de-alimentos';
    const baseUrl = `${keycloakPublicUrl}/realms/${realm}`;

    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/protocol/openid-connect/auth`,
      token_endpoint: `${baseUrl}/protocol/openid-connect/token`,
      userinfo_endpoint: `${baseUrl}/protocol/openid-connect/userinfo`,
      jwks_uri: `${baseUrl}/protocol/openid-connect/certs`,
      response_types_supported: ['code', 'none', 'id_token', 'token', 'id_token token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'profile', 'email', 'roles'],
      claims_supported: ['sub', 'iss', 'aud', 'email', 'name', 'roles', 'depositoAsignadoId', 'comedorAsignadoId'],
    };
  }

  /**
   * Obtiene los usuarios configurados en Keycloak (o realm-export.json) enriquecidos
   * con los nombres reales de depósitos y comedores desde PostgreSQL.
   */
  async obtenerUsuariosDemo(): Promise<UsuarioDemoDto[]> {
    if (process.env.DEMO_LOGIN_ENABLED === 'false') {
      return [];
    }

    const rawUsers = (await this.obtenerUsuariosDeKeycloak()) ?? this.obtenerUsuariosDeRealmExport();
    if (rawUsers.length === 0) {
      return [];
    }

    const { depositosMap, comedoresMap } = await this.obtenerMapasAsignaciones();

    return rawUsers.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      depositoAsignadoId: u.depositoAsignadoId,
      depositoNombre: u.depositoAsignadoId ? depositosMap.get(String(u.depositoAsignadoId)) ?? null : null,
      comedorAsignadoId: u.comedorAsignadoId,
      comedorNombre: u.comedorAsignadoId ? comedoresMap.get(String(u.comedorAsignadoId)) ?? null : null,
    }));
  }

  /**
   * Inicia sesión para un usuario demo seleccionado sin exponer credenciales en el frontend.
   */
  async loginDemo(email: string): Promise<LoginResponseDto> {
    if (process.env.DEMO_LOGIN_ENABLED === 'false') {
      throw new ProblemDetailsException({
        status: 403,
        title: 'Acceso rápido no disponible',
        detail: 'El acceso rápido de demostración no está habilitado en este entorno.',
        type: 'https://bancodealimentos.gob.ar/errores/demo-deshabilitado',
      });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail) {
      throw new ProblemDetailsException({
        status: 400,
        title: 'Correo electrónico requerido',
        detail: 'Ingresá o seleccioná un usuario válido para continuar.',
        type: 'https://bancodealimentos.gob.ar/errores/parametro-invalido',
      });
    }

    const usuarios = await this.obtenerUsuariosDemo();
    const matched = usuarios.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!matched) {
      throw new ProblemDetailsException({
        status: 401,
        title: 'Usuario no habilitado',
        detail: 'El usuario seleccionado no se encuentra habilitado para ingresar al sistema.',
        type: 'https://bancodealimentos.gob.ar/errores/credenciales-invalidas',
      });
    }

    const password = this.resolverPasswordDemo(matched.email);
    return this.login({ usuario: matched.email, password });
  }

  private resolverRol(attrRol?: string | null, rolesList: string[] = []): Rol {
    if (attrRol && ROLES_VALIDOS.includes(attrRol as Rol)) {
      return attrRol as Rol;
    }
    const found = ROLES_VALIDOS.find((r) => rolesList.includes(r));
    return found ?? 'Voluntario';
  }

  private async obtenerUsuariosDeKeycloak(): Promise<RawOidcUser[] | null> {
    const keycloakInternalUrl = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080';
    const realm = process.env.KEYCLOAK_REALM || 'banco-de-alimentos';
    const adminUser = process.env.KEYCLOAK_ADMIN || 'admin';
    const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';

    try {
      const tokenParams = new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: adminUser,
        password: adminPassword,
      });

      const tokenRes = await fetch(`${keycloakInternalUrl}/realms/master/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
        signal: AbortSignal.timeout(3000),
      });
      if (!tokenRes.ok) return null;

      const tokenJson: any = await tokenRes.json();
      const adminToken = tokenJson.access_token;
      if (!adminToken) return null;

      const usersRes = await fetch(`${keycloakInternalUrl}/admin/realms/${realm}/users?max=100`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(3000),
      });
      if (!usersRes.ok) return null;

      const kcUsers: any[] = await usersRes.json();
      const enabledUsers = kcUsers.filter((u) => u.enabled !== false);

      return Promise.all(
        enabledUsers.map(async (u) => {
          const attrRol = u.attributes?.rol?.[0];
          let roleNames: string[] = [];
          if (!attrRol && u.id) {
            roleNames = await this.obtenerRolesUsuarioKeycloak(keycloakInternalUrl, realm, u.id, adminToken);
          }
          const nombre = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username;
          return {
            id: String(u.id),
            nombre,
            email: String(u.email || u.username),
            rol: this.resolverRol(attrRol, roleNames),
            depositoAsignadoId: u.attributes?.depositoAsignadoId?.[0] || null,
            comedorAsignadoId: u.attributes?.comedorAsignadoId?.[0] || null,
          };
        }),
      );
    } catch (err) {
      this.logger.warn(`No se pudo consultar Keycloak Admin API para usuarios demo: ${(err as Error).message}`);
      return null;
    }
  }

  private async obtenerRolesUsuarioKeycloak(
    keycloakInternalUrl: string,
    realm: string,
    userId: string,
    adminToken: string,
  ): Promise<string[]> {
    try {
      const res = await fetch(`${keycloakInternalUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return [];
      const roles: any[] = await res.json();
      return roles.map((r) => r.name);
    } catch {
      return [];
    }
  }

  private leerRealmExport(): any | null {
    const candidatePaths = [
      path.resolve(process.cwd(), '../keycloak/realm-export.json'),
      path.resolve(process.cwd(), 'keycloak/realm-export.json'),
      path.resolve(__dirname, '../../../keycloak/realm-export.json'),
      path.resolve(__dirname, '../../../../keycloak/realm-export.json'),
    ];
    for (const filePath of candidatePaths) {
      try {
        if (fs.existsSync(filePath)) {
          return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
      } catch (err) {
        this.logger.warn(`Error al leer realm-export en ${filePath}: ${(err as Error).message}`);
      }
    }
    return null;
  }

  private obtenerUsuariosDeRealmExport(): RawOidcUser[] {
    const realmData = this.leerRealmExport();
    if (!Array.isArray(realmData?.users)) return [];

    return realmData.users
      .filter((u: any) => u.enabled !== false)
      .map((u: any) => ({
        id: String(u.id),
        nombre: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username,
        email: String(u.email || u.username),
        rol: this.resolverRol(u.attributes?.rol?.[0], u.realmRoles || []),
        depositoAsignadoId: u.attributes?.depositoAsignadoId?.[0] || null,
        comedorAsignadoId: u.attributes?.comedorAsignadoId?.[0] || null,
      }));
  }

  private resolverPasswordDemo(email: string): string {
    const realmData = this.leerRealmExport();
    if (Array.isArray(realmData?.users)) {
      const user = realmData.users.find(
        (u: any) => String(u.email || u.username).toLowerCase() === email.toLowerCase(),
      );
      const pwd = user?.credentials?.find((c: any) => c.type === 'password')?.value;
      if (pwd) return String(pwd);
    }
    return process.env.DEMO_USER_PASSWORD || 'PasswordSegura123!';
  }

  private async obtenerMapasAsignaciones(): Promise<{
    depositosMap: Map<string, string>;
    comedoresMap: Map<string, string>;
  }> {
    const depositosMap = new Map<string, string>();
    const comedoresMap = new Map<string, string>();

    try {
      const [depRes, comRes] = await Promise.all([
        this.db.query<{ id: string; nombre: string }>('SELECT id, nombre FROM depositos'),
        this.db.query<{ id: string; nombre: string }>('SELECT id, nombre FROM comedores'),
      ]);
      for (const row of depRes.rows) {
        depositosMap.set(String(row.id), row.nombre);
      }
      for (const row of comRes.rows) {
        comedoresMap.set(String(row.id), row.nombre);
      }
    } catch (err) {
      this.logger.warn(`No se pudieron cargar depositos/comedores desde PostgreSQL: ${(err as Error).message}`);
    }

    return { depositosMap, comedoresMap };
  }
}
