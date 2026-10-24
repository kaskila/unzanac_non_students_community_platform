import { Prose } from "@/components/public/ui";
import { RECTOR_SIZE, rectorSrcSet } from "@/lib/hero";

type Welcome = { title: string; body: string; messageTitle: string; leaderRole: string; leaderName: string };

/**
 * The welcome section under the photo slider (from the congregation's design): the Rector's
 * portrait and name card, the heading, and the framed welcome message. Texts are edited under
 * Admin → Site content → Home page welcome.
 * Contrast: Azure (azure-500) is only used for text of 24px and more; the message is azure-900.
 */
export function WelcomeSection({ welcome, portraitAlt }: { welcome: Welcome; portraitAlt: string }) {
  return (
    <section aria-labelledby="welcome-title" className="mx-auto grid max-w-6xl gap-8 px-4 pb-4 pt-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:px-6">
      <figure className="mx-auto w-full max-w-sm md:max-w-none">
        <div className="overflow-hidden rounded-2xl border-2 border-azure-500 bg-white px-6 pt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero/rector-640.webp"
            srcSet={rectorSrcSet()}
            sizes="(min-width: 768px) 320px, min(320px, 85vw)"
            width={RECTOR_SIZE.width}
            height={RECTOR_SIZE.height}
            alt={portraitAlt}
            loading="lazy"
            decoding="async"
            className="mx-auto h-auto w-full max-w-xs"
          />
        </div>
        <figcaption className="mx-4 rounded-b-lg border-4 border-t-0 border-azure-500 bg-white px-4 py-3 text-center text-2xl shadow-sm">
          <span className="font-bold uppercase text-azure-500">{welcome.leaderRole}:</span>{" "}
          <span className="text-azure-500">{welcome.leaderName}</span>
        </figcaption>
      </figure>

      <div className="space-y-6">
        <div className="text-center">
          <h1 id="welcome-title" className="text-4xl font-bold uppercase leading-tight tracking-tight text-azure-500 sm:text-5xl">
            {welcome.title}
          </h1>
          <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-40 rounded-full bg-azure-500" />
        </div>
        <div className="relative rounded-xl border-[6px] border-azure-500 bg-white px-5 pb-5 pt-12 shadow-sm">
          <h2 className="absolute -top-px left-4 rounded-b-lg border-2 border-t-0 border-white bg-azure-500 px-4 py-1.5 text-2xl font-bold uppercase text-white">
            {welcome.messageTitle}
          </h2>
          <Prose source={welcome.body} className="text-lg text-azure-900" />
        </div>
      </div>
    </section>
  );
}
