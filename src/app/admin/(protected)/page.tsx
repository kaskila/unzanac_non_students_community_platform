import { getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";
import { requireActor } from "@/server/session";

export default async function DashboardPage() {
  const actor = await requireActor();
  const t = await getTranslations("Admin");
  return (
    <section className="space-y-3">
      <h1 className={ui.h1}>{t("dashboard.welcome", { name: actor.name })}</h1>
      <p>{t("dashboard.role", { role: t(`roles.${actor.role}`) })}</p>
      <p className={ui.muted}>{t("dashboard.next")}</p>
    </section>
  );
}
