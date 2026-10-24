import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/admin/auth-card";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations("Admin.login");
  return (
    <AuthCard title={t("title")}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
