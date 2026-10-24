import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";
import { getCommitteeForAdmin } from "@/server/services/committees";
import { requirePermission } from "@/server/session";
import { CommitteeForm } from "../committee-form";

export default async function EditCommitteePage({ params }: PageProps<"/admin/committees/[id]">) {
  await requirePermission("content.manage");
  const { id } = await params;
  const [t, committee] = await Promise.all([getTranslations("Admin.committees"), getCommitteeForAdmin(id)]);
  if (!committee) notFound();
  return (
    <div className="space-y-6">
      <p>
        <Link href="/admin/committees">{t("back")}</Link>
      </p>
      <h1 className={ui.h1}>{committee.name}</h1>
      {committee.isPublic && (
        <p>
          <a href={`/committees/${committee.slug}`}>{t("viewPublic")}</a>
        </p>
      )}
      <CommitteeForm committee={committee} />
    </div>
  );
}
