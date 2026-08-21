/**
 * GRID Studio org roles — foundation for future RBAC.
 *
 * Today: `admin` only in production use (full control).
 * Tomorrow:
 * - Product access: Studio / Cockpit / Data
 * - Studio capabilities: create/manage tasks, games, tickets
 */

export const STUDIO_ORG_ROLES = ["admin", "operator", "editor", "viewer"] as const;

export type StudioOrgRole = (typeof STUDIO_ORG_ROLES)[number];

export type StudioOrgCapabilities = {
  can_access_studio: boolean;
  can_access_cockpit: boolean;
  can_access_data: boolean;
  can_manage_tasks: boolean;
  can_manage_games: boolean;
  can_manage_tickets: boolean;
};

export type StudioOrgMembership = StudioOrgCapabilities & {
  organization_id: string;
  user_id: string;
  role: StudioOrgRole;
};

/** Full control — current Dervis / owner default. */
export const ADMIN_CAPABILITIES: StudioOrgCapabilities = {
  can_access_studio: true,
  can_access_cockpit: true,
  can_access_data: true,
  can_manage_tasks: true,
  can_manage_games: true,
  can_manage_tickets: true,
};

/**
 * Future presets (not enforced yet — documents the destination).
 * operator → run live + see data + use studio
 * editor → author studio content only
 * viewer → read-only across products
 */
export const ROLE_PRESETS: Record<StudioOrgRole, StudioOrgCapabilities> = {
  admin: { ...ADMIN_CAPABILITIES },
  operator: {
    can_access_studio: true,
    can_access_cockpit: true,
    can_access_data: true,
    can_manage_tasks: true,
    can_manage_games: true,
    can_manage_tickets: true,
  },
  editor: {
    can_access_studio: true,
    can_access_cockpit: false,
    can_access_data: false,
    can_manage_tasks: true,
    can_manage_games: true,
    can_manage_tickets: true,
  },
  viewer: {
    can_access_studio: true,
    can_access_cockpit: true,
    can_access_data: true,
    can_manage_tasks: false,
    can_manage_games: false,
    can_manage_tickets: false,
  },
};

export function isStudioAdmin(role: StudioOrgRole): boolean {
  return role === "admin";
}
