"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ui } from "@/components/admin/ui";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const t = useTranslations("Admin.login");
  const router = useRouter();
  const ready = useSearchParams().get("ready") === "1";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    if (!email.includes("@")) {
      setPending(false);
      setError(t("notEmail"));
      return;
    }
    const { data, error } = await authClient.signIn.email({
      email,
      password: String(form.get("password") ?? ""),
    });
    if (error) {
      setPending(false);
      if (error.status === 429) setError(t("tooMany"));
      else if (error.code === "BANNED_USER") setError(t("blocked"));
      else if (error.code === "INVALID_EMAIL_OR_PASSWORD" || error.status === 401) setError(t("invalid"));
      else setError(t("generic"));
      return;
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push("/admin/login/verify");
      return;
    }
    // First sign-in after an invite: no 2FA yet, so the guard sends them to setup.
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {ready && !error && (
        <p role="status" className={ui.success}>
          {t("accountReady")}
        </p>
      )}
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className={ui.label}>
          {t("email")}
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={ui.input} />
      </div>
      <div>
        <label htmlFor="password" className={ui.label}>
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={ui.input}
        />
      </div>
      <button type="submit" disabled={pending} className={`${ui.primary} w-full`}>
        {pending ? t("working") : t("submit")}
      </button>
    </form>
  );
}
