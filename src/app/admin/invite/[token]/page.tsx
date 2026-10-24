import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/admin/auth-card";
import { ui } from "@/components/admin/ui";
import { isAdminRole } from "@/server/policy";
import { findUsableInvite } from "@/server/services/admins";
import { AcceptForm } from "./accept-form";

export default async function InvitePage({ params }: PageProps<"/admin/invite/[token]">) {
  const t = await getTranslations("Admin");
  return (
    <Suspense fallback={<AuthCard title={t("title")}>{t("loading")}</AuthCard>}>
      <Invite params={params} />
    </Suspense>
  );
}

async function Invite({ params }: { params: PageProps<"/admin/invite/[token]">["params"] }) {
  const { token } = await params;
  const t = await getTranslations("Admin");
  const invite = await findUsableInvite(token);

  if (!invite) {
    return (
      <AuthCard title={t("invite.titleInvite")}>
        <p role="alert" className={ui.error}>
          {t("invite.invalidLink")}
        </p>
      </AuthCard>
    );
  }

  const isReset = invite.purpose === "RESET";
  const role = isAdminRole(invite.role) ? t(`roles.${invite.role}`) : invite.role;
  return (
    <AuthCard title={isReset ? t("invite.titleReset") : t("invite.titleInvite")}>
      <p className="mb-4">
        {isReset ? t("invite.resetIntro", { email: invite.email }) : t("invite.intro", { role, email: invite.email })}
      </p>
      <AcceptForm token={token} defaultName={invite.name ?? ""} isReset={isReset} />
    </AuthCard>
  );
}
