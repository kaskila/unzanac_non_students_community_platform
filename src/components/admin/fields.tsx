// Labelled form fields for admin forms. Plain components without hooks, so they render on the
// server and can be passed into <ActionForm> as children.

import type { ReactNode } from "react";
import { ui } from "@/components/admin/ui";

const idFor = (name: string) => `field-${name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

type Common = { name: string; label: string; hint?: ReactNode; required?: boolean; id?: string };

function Hint({ id, hint }: { id: string; hint?: ReactNode }) {
  return hint ? (
    <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
      {hint}
    </p>
  ) : null;
}

export function TextField({
  id: idProp,
  name,
  label,
  hint,
  required,
  defaultValue,
  type = "text",
  maxLength,
  autoComplete = "off",
  inputMode,
}: Common & {
  defaultValue?: string | number | null;
  type?: "text" | "url" | "tel" | "email" | "number" | "datetime-local" | "date";
  maxLength?: number;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "url" | "numeric";
}) {
  const id = idProp ?? idFor(name);
  return (
    <div>
      <label htmlFor={id} className={ui.label}>
        {label}
      </label>
      <Hint id={id} hint={hint} />
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={ui.input}
      />
    </div>
  );
}

export function TextArea({
  id: idProp,
  name,
  label,
  hint,
  required,
  defaultValue,
  rows = 6,
  maxLength,
}: Common & { defaultValue?: string | null; rows?: number; maxLength?: number }) {
  const id = idProp ?? idFor(name);
  return (
    <div>
      <label htmlFor={id} className={ui.label}>
        {label}
      </label>
      <Hint id={id} hint={hint} />
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ""}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`${ui.input} py-2`}
      />
    </div>
  );
}

export function SelectField({
  id: idProp,
  name,
  label,
  hint,
  options,
  defaultValue,
}: Common & { options: readonly { value: string; label: string }[]; defaultValue?: string | null }) {
  const id = idProp ?? idFor(name);
  return (
    <div>
      <label htmlFor={id} className={ui.label}>
        {label}
      </label>
      <Hint id={id} hint={hint} />
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={ui.input}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CheckboxField({ id: idProp, name, label, hint, defaultChecked }: Common & { defaultChecked?: boolean }) {
  const id = idProp ?? idFor(name);
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1 size-6 shrink-0 accent-azure-700"
      />
      <div>
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <Hint id={id} hint={hint} />
      </div>
    </div>
  );
}

/** Small coloured label for content status. */
export function StatusBadge({ tone, children }: { tone: "live" | "draft" | "muted" | "warning"; children: ReactNode }) {
  const tones = {
    live: "border-success text-success",
    draft: "border-azure-700 text-azure-700",
    muted: "border-muted text-muted",
    warning: "border-warning text-warning",
  };
  return <span className={`inline-block rounded border px-2 py-0.5 text-sm font-semibold ${tones[tone]}`}>{children}</span>;
}
