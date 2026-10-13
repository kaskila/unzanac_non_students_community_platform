"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ui } from "@/components/admin/ui";
import { authClient } from "@/lib/auth-client";

export function VerifyForm() {
  const t = useTranslations("Admin.verify");
  const router = useRouter();
  const [mode, setMode] = useState<"app" | "backup">("app");
  const [error, setError] = useState<{ message: string; restart: boolean } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    const { error } =
      mode === "app"
        ? await authClient.twoFactor.verifyTotp({ code })
        : await authClient.twoFactor.verifyBackupCode({ code });
    if (error) {
      setPending(false);
      if (error.code === "INVALID_TWO_FACTOR_COOKIE") setError({ message: t("expired"), restart: true });
      else if (error.code === "ACCOUNT_TEMPORARILY_LOCKED" || error.status === 429)
        setError({ message: t("locked"), restart: true });
      else setError({ message: t("invalid"), restart: false });
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p>{t("body")}</p>
      {error && (
        <p role="alert" className={ui.error}>
          {error.message} {error.restart && <Link href="/admin/login">{t("title")}</Link>}
        </p>
      )}
      <div>
        <label htmlFor="code" className={ui.label}>
          {mode === "app" ? t("code") : t("backupCode")}
        </label>
        <input
          id="code"
          name="code"
          key={mode}
          inputMode={mode === "app" ? "numeric" : "text"}
          autoComplete="one-time-code"
          required
          className={ui.input}
        />
      </div>
      <button type="submit" disabled={pending} className={`${ui.primary} w-full`}>
        {t("submit")}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === "app" ? "backup" : "app")}
        className="min-h-11 text-azure-700 underline"
      >
        {mode === "app" ? t("useBackup") : t("useApp")}
      </button>
    </form>
  );
}
