import { getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";
import { requirePermission } from "@/server/session";

// Placeholder until M3. The permission check is real: Editors get a 403 here.
export default async function RegisterPage() {
  await requirePermission("register.view");
  const t = await getTranslations("Admin.register");
  return (
    <section className="space-y-3">
      <h1 className={ui.h1}>{t("title")}</h1>
      <p className={ui.muted}>{t("next")}</p>
    </section>
  );
}
