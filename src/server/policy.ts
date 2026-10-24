// Every access rule in the platform lives here (docs/PLAN.md §2).
// Server actions and pages call `can` / `requirePermission` before touching data.

export const ADMIN_ROLES = ["owner", "register_officer", "editor"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ACTIONS = [
  "content.manage", // announcements, events, committees
  "media.manage", // videos and resources: upload, replace, archive
  "resource.delete", // permanent delete of a resource
  "site.edit", // home, visit, contacts, privacy notice
  "register.view", // name, contact, committees
  "register.viewSensitive", // sacraments, family, remarks
  "review.manage", // approve or reject submissions
  "campaign.manage", // campaigns and update links
  "register.import",
  "register.export",
  "member.archive",
  "member.erase", // removal requests
  "admin.manage", // admin users and roles
  "audit.view",
] as const;
export type Action = (typeof ACTIONS)[number];

const ALL: readonly AdminRole[] = ADMIN_ROLES;
const OWNER_AND_REGISTER: readonly AdminRole[] = ["owner", "register_officer"];
const OWNER: readonly AdminRole[] = ["owner"];

const MATRIX: Record<Action, readonly AdminRole[]> = {
  "content.manage": ALL,
  "media.manage": ALL,
  "resource.delete": OWNER,
  "site.edit": OWNER_AND_REGISTER,
  "register.view": OWNER_AND_REGISTER,
  "register.viewSensitive": OWNER_AND_REGISTER,
  "review.manage": OWNER_AND_REGISTER,
  "campaign.manage": OWNER_AND_REGISTER,
  "register.import": OWNER_AND_REGISTER,
  "register.export": OWNER,
  "member.archive": OWNER_AND_REGISTER,
  "member.erase": OWNER,
  "admin.manage": OWNER,
  "audit.view": OWNER,
};

export type Actor = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function can(actor: Pick<Actor, "role"> | null | undefined, action: Action): boolean {
  return !!actor && MATRIX[action].includes(actor.role);
}
