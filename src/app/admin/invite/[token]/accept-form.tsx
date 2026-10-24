"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ui } from "@/components/admin/ui";
import { acceptInviteAction, type AcceptState } from "./actions";

export function AcceptForm({ token, defaultName, isReset }: { token: string; defaultName: string; isReset: boolean }) {
  const t = useTranslations("Admin.invite");
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptInviteAction, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p role="alert" className={ui.error}>
          {t(`errors.${state.error}`)}
        </p>
      )}
      <div>
        <label htmlFor="name" className={ui.label}>
          {t("name")}
        </label>
        <input id="name" name="name" defaultValue={defaultName} autoComplete="name" required className={ui.input} />
      </div>
      <div>
        <label htmlFor="password" className={ui.label}>
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className={ui.input}
        />
      </div>
      <div>
        <label htmlFor="confirm" className={ui.label}>
          {t("confirm")}
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={ui.input} />
      </div>
      <button type="submit" disabled={pending} className={`${ui.primary} w-full`}>
        {isReset ? t("submitReset") : t("submitInvite")}
      </button>
    </form>
  );
}
