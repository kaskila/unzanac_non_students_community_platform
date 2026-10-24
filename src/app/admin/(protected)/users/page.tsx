import { getFormatter, getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";
import { isAdminRole } from "@/server/policy";
import { listAdmins, listPendingInvites } from "@/server/services/admins";
import { requirePermission } from "@/server/session";
import { revokeInviteAction } from "./actions";
import { InviteForm, UserActions } from "./user-forms";

export default async function UsersPage() {
  const actor = await requirePermission("admin.manage");
  const [t, format, admins, invites] = await Promise.all([
    getTranslations("Admin"),
    getFormatter(),
    listAdmins(),
    listPendingInvites(),
  ]);
  const roleLabel = (role: string | null) => (isAdminRole(role) ? t(`roles.${role}`) : (role ?? ""));

  return (
    <div className="space-y-8">
      <h1 className={ui.h1}>{t("users.title")}</h1>

      <section aria-labelledby="invite-title" className={ui.card}>
        <h2 id="invite-title" className={ui.h2}>
          {t("users.inviteTitle")}
        </h2>
        <div className="mt-3">
          <InviteForm />
        </div>
      </section>

      <section aria-labelledby="admins-title" className="space-y-3">
        <h2 id="admins-title" className={ui.h2}>
          {t("users.listTitle")}
        </h2>
        <ul className="space-y-3">
          {admins.map((admin) => {
            const isSelf = admin.id === actor.id;
            return (
              <li key={admin.id} className={`${ui.card} space-y-3`}>
                <div>
                  <p className="font-bold">
                    {admin.name} {isSelf && <span className="font-normal text-muted">({t("users.you")})</span>}
                  </p>
                  <p className="break-all text-muted">{admin.email}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="font-semibold">{t("users.role")}</dt>
                    <dd>{roleLabel(admin.role)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">{t("users.status")}</dt>
                    <dd className={admin.banned ? "text-danger" : "text-success"}>
                      {admin.banned ? t("users.deactivated") : t("users.active")}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">{t("users.twoFactor")}</dt>
                    <dd>{admin.twoFactorEnabled ? t("users.twoFactorOn") : t("users.twoFactorOff")}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">{t("users.lastSignIn")}</dt>
                    <dd>
                      {admin.lastSignInAt
                        ? format.dateTime(admin.lastSignInAt, { dateStyle: "medium", timeStyle: "short" })
                        : t("users.never")}
                    </dd>
                  </div>
                </dl>
                {!isSelf && isAdminRole(admin.role) && (
                  <UserActions
                    userId={admin.id}
                    email={admin.email}
                    name={admin.name}
                    role={admin.role}
                    active={!admin.banned}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="pending-title" className="space-y-3">
        <h2 id="pending-title" className={ui.h2}>
          {t("users.pendingTitle")}
        </h2>
        {invites.length === 0 ? (
          <p className={ui.muted}>{t("users.noPending")}</p>
        ) : (
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li key={invite.id} className={`${ui.card} flex flex-wrap items-center justify-between gap-3`}>
                <div>
                  <p className="font-semibold">
                    {invite.purpose === "RESET" ? t("users.purposeReset") : t("users.purposeInvite")}: {invite.email}
                  </p>
                  <p className="text-sm text-muted">
                    {roleLabel(invite.role)} · {t("users.expires", { date: format.dateTime(invite.expiresAt, { dateStyle: "medium" }) })}
                  </p>
                </div>
                <form action={revokeInviteAction}>
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <button type="submit" className={ui.danger}>
                    {t("users.revoke")} <span className="sr-only">{invite.email}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
