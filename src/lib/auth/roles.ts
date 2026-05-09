export const ROLES = ['owner', 'admin', 'seller', 'basic'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  seller: 'Vendedor',
  basic: 'Básico',
};

export const PERMISSION_MATRIX: Record<Role, readonly string[]> = {
  owner: [
    'Gestiona y elimina cualquier usuario, incluido admin, seller y basic.',
    'Asigna cualquier rol, incluido owner.',
    'Publica landing, sube medios y modifica settings globales.',
    'Configura integraciones globales y gestiona sus propios enlaces OAuth.',
  ],
  admin: [
    'Gestiona y elimina usuarios seller y basic; no puede gestionar owner ni otros admin.',
    'Asigna roles seller y basic; no puede asignar owner ni admin.',
    'Publica landing, sube medios y modifica settings globales.',
    'Configura integraciones globales y gestiona sus propios enlaces OAuth.',
  ],
  seller: [
    'No puede crear, editar ni eliminar usuarios.',
    'No puede publicar landing, subir medios ni modificar settings globales.',
    'Puede consultar contenido protegido y gestionar sus propios enlaces OAuth cuando el endpoint lo permita.',
  ],
  basic: [
    'No puede crear, editar ni eliminar usuarios.',
    'No puede publicar landing, subir medios ni modificar settings globales.',
    'Acceso de solo lectura a contenido protegido cuando el endpoint lo permita.',
  ],
} as const;

const ROLE_LEVEL: Record<Role, number> = {
  owner: 4,
  admin: 3,
  seller: 2,
  basic: 1,
};

export function roleLevel(role: string): number {
  return ROLE_LEVEL[role as Role] ?? 0;
}

/** Can `actorRole` manage (change/delete) `targetRole`? */
export function canManage(actorRole: string, targetRole: string): boolean {
  if (actorRole === 'owner') return true;
  if (actorRole === 'admin') return roleLevel(targetRole) < roleLevel('admin');
  return false;
}

/** Can `actorRole` assign `newRole` to someone? */
export function canAssignRole(actorRole: string, newRole: string): boolean {
  if (actorRole === 'owner') return true;
  // admins can only assign seller/basic
  if (actorRole === 'admin') return roleLevel(newRole) < roleLevel('admin');
  return false;
}

export function isValidRole(role: string): role is Role {
  return ROLES.includes(role as Role);
}
