import { getFormatter, getTranslations } from "next-intl/server";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { StatusBadge, TextField } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { expandOccurrences } from "@/lib/recurrence";
import type { Event, EventException } from "@/generated/prisma/client";
import { restoreDateAction, setDateAction } from "./actions";

const DAY_MS = 86_400_000;

/** The next dates of a recurring event, each with "cancel", "move" or "restore". */
export async function EventDates({ event }: { event: Event & { exceptions: EventException[] } }) {
  const [t, format] = await Promise.all([getTranslations("Admin.events.dates"), getFormatter()]);
  const now = new Date();
  const occurrences = expandOccurrences(event, event.exceptions, now, new Date(now.getTime() + 180 * DAY_MS), 10);
  const exceptionByStart = new Map(event.exceptions.map((e) => [e.occurrenceStart.getTime(), e]));
  const setDate = setDateAction.bind(null, event.id);
  const when = (d: Date) => format.dateTime(d, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <section aria-labelledby="dates-title" className="space-y-3">
      <h2 id="dates-title" className={ui.h2}>
        {t("title")}
      </h2>
      <p className={ui.muted}>{t("intro")}</p>
      {occurrences.length === 0 ? (
        <p>{t("none")}</p>
      ) : (
        <ul className="space-y-3">
          {occurrences.map((o, index) => {
            const exception = exceptionByStart.get(o.originalStart.getTime());
            const label = when(o.originalStart);
            const key = o.originalStart.toISOString();
            return (
              <li key={key} className={`${ui.card} space-y-3`} data-testid="event-date">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{label}</span>
                  {o.cancelled && <StatusBadge tone="warning">{t("cancelled")}</StatusBadge>}
                  {o.moved && <StatusBadge tone="warning">{t("movedTo", { date: when(o.start) })}</StatusBadge>}
                  {o.note && <span className="text-sm text-muted">{o.note}</span>}
                </p>
                {exception ? (
                  <form action={restoreDateAction.bind(null, event.id, exception.id)}>
                    <button type="submit" className={ui.secondary}>
                      {t("restore")} <span className="sr-only">{label}</span>
                    </button>
                  </form>
                ) : (
                  <details>
                    <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-azure-700 underline">
                      {t("change")} <span className="sr-only">{label}</span>
                    </summary>
                    <ActionForm action={setDate} className="mt-3 space-y-3">
                      <input type="hidden" name="occurrenceStart" value={key} />
                      <TextField id={`note-${index}`} name="note" label={t("note")} hint={t("noteHint")} maxLength={200} />
                      <SubmitButton name="action" value="cancel" variant="danger">
                        {t("cancel")}
                      </SubmitButton>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField id={`new-start-${index}`} name="newStart" type="datetime-local" label={t("newStart")} />
                        <TextField id={`new-end-${index}`} name="newEnd" type="datetime-local" label={t("newEnd")} hint={t("newEndHint")} />
                      </div>
                      <SubmitButton name="action" value="move" variant="secondary">
                        {t("move")}
                      </SubmitButton>
                    </ActionForm>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
