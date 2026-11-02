import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

export const ROLES_KEY = 'roles';
export { Roles };
export const UsuarioActual = CurrentUser;
