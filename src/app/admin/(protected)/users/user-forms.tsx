"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ui } from "@/components/admin/ui";
import { ADMIN_ROLES, type AdminRole } from "@/server/policy";
import {
  changeRoleAction,
  inviteAction,
  resetLinkAction,
  setActiveAction,
  type LinkState,
  type ResultState,
} from "./actions";

function LinkResult({ state, messageKey }: { state: LinkState; messageKey: "linkReady" | "resetReady" }) {
  const t = useTranslations("Admin.users");
  const [copied, setCopied] = useState(false);
  if (state.error) {
    return (
      <p role="alert" className={ui.error}>
        {t(`errors.${state.error}`)}
      </p>
    );
  }
  if (!state.link) return null;
  return (
    <div role="status" className={`${ui.success} space-y-2`}>
      <p>{t(messageKey, { email: state.email ?? "" })}</p>
      <input readOnly value={state.link} aria-label={t(messageKey, { email: state.email ?? "" })} data-testid="generated-link" className={`${ui.input} font-mono text-sm text-ink`} />
      <button
        type="button"
        className={ui.secondary}
        onClick={async () => {
          await navigator.clipboard.writeText(state.link ?? "");
          setCopied(true);
        }}
      >
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}

export function InviteForm() {
  const t = useTranslations("Admin");
  const [state, action, pending] = useActionState<LinkState, FormData>(inviteAction, {});
  return (
    <form action={action} className="space-y-4">
      <p className={ui.muted}>{t("users.inviteHelp")}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="invite-email" className={ui.label}>
            {t("users.email")}
          </label>
          <input id="invite-email" name="email" type="email" required className={ui.input} />
        </div>
        <div>
          <label htmlFor="invite-name" className={ui.label}>
            {t("users.name")}
          </label>
          <input id="invite-name" name="name" required className={ui.input} />
        </div>
        <div>
          <label htmlFor="invite-role" className={ui.label}>
            {t("users.role")}
          </label>
          <select id="invite-role" name="role" defaultValue="editor" className={ui.input}>
            {ADMIN_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`roles.${role}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" disabled={pending} className={ui.primary}>
        {t("users.createInvite")}
      </button>
      <LinkResult state={state} messageKey="linkReady" />
    </form>
  );
}

export function UserActions({
  userId,
  email,
  name,
  role,
  active,
}: {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
}) {
  const t = useTranslations("Admin");
  const [roleState, roleAction, rolePending] = useActionState<ResultState, FormData>(changeRoleAction, {});
  const [activeState, activeAction, activePending] = useActionState<ResultState, FormData>(setActiveAction, {});
  const [resetState, resetAction, resetPending] = useActionState<LinkState, FormData>(resetLinkAction, {});
  const error = roleState.error ?? activeState.error;

  return (
    <div className="space-y-2">
      <form action={roleAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="userId" value={userId} />
        <div>
          <label htmlFor={`role-${userId}`} className="block text-sm font-semibold">
            {t("users.changeRole")} <span className="sr-only">({name})</span>
          </label>
          <select id={`role-${userId}`} name="role" defaultValue={role} className={ui.input}>
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={rolePending} className={ui.secondary}>
          {t("users.save")}
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        <form action={activeAction}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="active" value={active ? "false" : "true"} />
          <button type="submit" disabled={activePending} className={active ? ui.danger : ui.secondary}>
            {active ? t("users.deactivate") : t("users.reactivate")} <span className="sr-only">{name}</span>
          </button>
        </form>
        <form action={resetAction}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="email" value={email} />
          <button type="submit" disabled={resetPending} className={ui.secondary}>
            {t("users.resetLink")} <span className="sr-only">{name}</span>
          </button>
        </form>
      </div>
      {error && (
        <p role="alert" className={ui.error}>
          {t(`users.errors.${error}`)}
        </p>
      )}
      <LinkResult state={resetState} messageKey="resetReady" />
    </div>
  );
}
