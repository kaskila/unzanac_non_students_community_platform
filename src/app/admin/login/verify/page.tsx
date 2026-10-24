import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/admin/auth-card";
import { VerifyForm } from "./verify-form";

export default async function VerifyPage() {
  const t = await getTranslations("Admin.verify");
  return (
    <AuthCard title={t("title")}>
      <VerifyForm />
    </AuthCard>
  );
}
