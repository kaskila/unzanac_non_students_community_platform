import { describe, expect, it } from "vitest";
import { ACTIONS, ADMIN_ROLES, can, isAdminRole, type Action, type AdminRole } from "@/server/policy";

// The permission matrix from docs/PLAN.md §2, written out in full on purpose:
// a change to policy.ts must be matched by a deliberate change here.
const EXPECTED: Record<Action, Record<AdminRole, boolean>> = {
  "content.manage": { owner: true, register_officer: true, editor: true },
  "media.manage": { owner: true, register_officer: true, editor: true },
  "resource.delete": { owner: true, register_officer: false, editor: false },
  "site.edit": { owner: true, register_officer: true, editor: false },
  "register.view": { owner: true, register_officer: true, editor: false },
  "register.viewSensitive": { owner: true, register_officer: true, editor: false },
  "review.manage": { owner: true, register_officer: true, editor: false },
  "campaign.manage": { owner: true, register_officer: true, editor: false },
  "register.import": { owner: true, register_officer: true, editor: false },
  "register.export": { owner: true, register_officer: false, editor: false },
  "member.archive": { owner: true, register_officer: true, editor: false },
  "member.erase": { owner: true, register_officer: false, editor: false },
  "admin.manage": { owner: true, register_officer: false, editor: false },
  "audit.view": { owner: true, register_officer: false, editor: false },
};

describe("permission matrix", () => {
  it("covers every action", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...ACTIONS].sort());
  });

  const cases = ACTIONS.flatMap((action) =>
    ADMIN_ROLES.map((role) => ({ action, role, allowed: EXPECTED[action][role] })),
  );

  it.each(cases)("$role → $action: $allowed", ({ action, role, allowed }) => {
    expect(can({ role }, action)).toBe(allowed);
  });

  it("denies everything without a signed-in admin", () => {
    for (const action of ACTIONS) {
      expect(can(null, action)).toBe(false);
      expect(can(undefined, action)).toBe(false);
    }
  });
});

describe("isAdminRole", () => {
  it("accepts only known roles", () => {
    expect(isAdminRole("owner")).toBe(true);
    expect(isAdminRole("editor")).toBe(true);
    expect(isAdminRole("admin")).toBe(false);
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});
