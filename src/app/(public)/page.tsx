import { getTranslations } from "next-intl/server";
import { COMMITTEES } from "@/lib/committees";
import { SOCIAL_LINKS } from "@/lib/site";

// M0 shell of the home page (docs/PLAN.md §3). Sections are wired to the database from M2.
export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <>
      <section className="bg-azure-500">
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-10">
          {/* White on azure-500 is 3.27:1, so this title must stay >= 24px (text-3xl = 30px). */}
          <h1 className="text-3xl font-bold text-white">{t("heroTitle")}</h1>
          <div className="mt-5 rounded-lg bg-white p-5 shadow-sm">
            <p>{t("heroBody")}</p>
            <h2 className="mt-4 text-lg font-bold text-azure-900">{t("nextServiceTitle")}</h2>
            <p className="text-muted">{t("nextServicePending")}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="committees-title" className="mx-auto max-w-3xl px-4 pt-10">
        <h2 id="committees-title" className="text-2xl font-bold text-azure-900">
          {t("committeesTitle")}
        </h2>
        <p className="mt-1 text-muted">{t("committeesIntro")}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {COMMITTEES.map((committee) => (
            <li key={committee.slug} className="rounded-lg border border-line bg-white px-4 py-3 font-semibold">
              {committee.name}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="watch-title" className="mx-auto max-w-3xl px-4 pt-10">
        <h2 id="watch-title" className="text-2xl font-bold text-azure-900">
          {t("watchTitle")}
        </h2>
        <p className="mt-1">{t("watchBody")}</p>
        <a
          href={SOCIAL_LINKS.youtube}
          rel="noopener"
          className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-azure-700 px-5 font-semibold text-white no-underline hover:bg-azure-900"
        >
          {t("watchLink")}
        </a>
      </section>
    </>
  );
}
