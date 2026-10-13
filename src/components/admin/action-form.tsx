"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ui } from "@/components/admin/ui";
import type { FormState } from "@/server/forms";

type Problem = { href: string | null; text: string };

/**
 * Wraps a server action form for the admin area. Fields are passed in as (server-rendered)
 * children. On failure it shows an error summary at the top that links to each field and marks
 * the fields aria-invalid. Typed values are kept: the form is submitted without React's
 * automatic reset, so a validation error never wipes what the admin wrote.
 */
export function ActionForm({
  action,
  children,
  className = "space-y-4",
  savedMessage,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  savedMessage?: string;
}) {
  const t = useTranslations("Admin.form");
  const [state, dispatch, pending] = useActionState<FormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [problems, setProblems] = useState<Problem[]>([]);

  const message = (code: string) => (t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.generic"));

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    for (const el of form.querySelectorAll("[aria-invalid]")) el.removeAttribute("aria-invalid");

    const list: Problem[] = [];
    for (const [name, code] of Object.entries(state.fieldErrors ?? {})) {
      const field = form.querySelector<HTMLInputElement>(`[name="${CSS.escape(name)}"]`);
      field?.setAttribute("aria-invalid", "true");
      const label = field?.labels?.[0]?.textContent?.trim();
      list.push({ href: field?.id ? `#${field.id}` : null, text: label ? `${label}: ${message(code)}` : message(code) });
    }
    setProblems(list);
    if (state.error) summaryRef.current?.focus();
    // `message` only depends on the translations, which don't change while the form is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const formData = new FormData(event.currentTarget, submitter);
        startTransition(() => dispatch(formData));
      }}
      noValidate
      aria-busy={pending}
    >
      {state.error && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className={ui.error}>
          <p className="font-semibold">{message(state.error)}</p>
          {problems.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {problems.map((p) => (
                <li key={p.text}>{p.href ? <a href={p.href}>{p.text}</a> : p.text}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {children}
      {state.ok && !pending && (
        <p role="status" className={ui.success}>
          {savedMessage ?? t("saved")}
        </p>
      )}
    </form>
  );
}

/** Submit button that is disabled while its form is being saved. */
export function SubmitButton({
  children,
  name,
  value,
  variant = "primary",
}: {
  children: ReactNode;
  name?: string;
  value?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button type="submit" name={name} value={value} className={ui[variant]}>
      {children}
    </button>
  );
}

/** Copies text to the clipboard, e.g. the WhatsApp text of an announcement. */
export function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={ui.secondary}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }}
    >
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
