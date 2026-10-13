"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { ui } from "@/components/admin/ui";
import { authClient } from "@/lib/auth-client";

type Enrolment = { qr: string; key: string; backupCodes: string[] };

export function TwoFactorSetup() {
  const t = useTranslations("Admin.setup");
  const router = useRouter();
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const { data, error } = await authClient.twoFactor.enable({ password });
    setPending(false);
    if (error || !data || !("totpURI" in data) || !data.totpURI) {
      setError(t("invalidPassword"));
      return;
    }
    const key = new URL(data.totpURI).searchParams.get("secret") ?? "";
    const qr = await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 });
    setEnrolment({ qr, key, backupCodes: data.backupCodes ?? [] });
  }

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    if (error) {
      setPending(false);
      setError(t("invalidCode"));
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  if (!enrolment) {
    return (
      <form onSubmit={start} className="space-y-4" noValidate>
        <p>{t("intro")}</p>
        {error && (
          <p role="alert" className={ui.error}>
            {error}
          </p>
        )}
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
          {t("start")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={finish} className="space-y-5" noValidate>
      <p>{t("scan")}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enrolment.qr} width={220} height={220} alt={t("qrAlt")} className="mx-auto" />
      <div>
        <p>{t("manualKey")}</p>
        <code data-testid="totp-key" className="mt-1 block break-all rounded bg-azure-50 p-2 font-mono text-sm">
          {enrolment.key}
        </code>
      </div>
      <div>
        <h2 className="font-bold text-azure-900">{t("backupTitle")}</h2>
        <p className="text-muted">{t("backupBody")}</p>
        <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
          {enrolment.backupCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
      </div>
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
      <div>
        <label htmlFor="code" className={ui.label}>
          {t("code")}
        </label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required className={ui.input} />
      </div>
      <button type="submit" disabled={pending} className={`${ui.primary} w-full`}>
        {t("finish")}
      </button>
    </form>
  );
}
