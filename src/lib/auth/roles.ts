export const ROLES = ['owner', 'admin', 'seller', 'basic'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  seller: 'Vendedor',
  basic: 'Básico',
};

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
