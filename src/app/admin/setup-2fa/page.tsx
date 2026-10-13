import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/admin/auth-card";
import { requireActor } from "@/server/session";
import { TwoFactorSetup } from "./two-factor-setup";

export default async function SetupTwoFactorPage() {
  const t = await getTranslations("Admin");
  return (
    <AuthCard title={t("setup.title")}>
      <Suspense fallback={<p>{t("loading")}</p>}>
        <SetupGate />
      </Suspense>
    </AuthCard>
  );
}

async function SetupGate() {
  const actor = await requireActor({ allowWithoutTwoFactor: true });
  if (actor.twoFactorEnabled) redirect("/admin");
  return <TwoFactorSetup />;
}
