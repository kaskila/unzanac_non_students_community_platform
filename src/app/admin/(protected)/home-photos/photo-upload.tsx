"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { putWithProgress } from "@/components/admin/direct-upload";
import { ui } from "@/components/admin/ui";
import { finishSlideUploadAction, startSlideUploadAction } from "./actions";

type Phase = { name: "idle" } | { name: "uploading"; percent: number } | { name: "checking" } | { name: "done" } | { name: "error"; code: string };

/** Upload a home page photo with its description: presigned PUT, then the server resizes it. */
export function PhotoUpload() {
  const t = useTranslations("Admin.homePhotos.upload");
  const te = useTranslations("Admin.form.errors");
  const fileInput = useRef<HTMLInputElement>(null);
  const altInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const busy = phase.name === "uploading" || phase.name === "checking";

  async function upload() {
    const file = fileInput.current?.files?.[0];
    const alt = altInput.current?.value.trim() ?? "";
    if (!alt) return setPhase({ name: "error", code: "alt_required" });
    if (!file) return setPhase({ name: "error", code: "no_file_chosen" });
    setPhase({ name: "uploading", percent: 0 });
    const start = await startSlideUploadAction(alt, file.name, file.size);
    if ("error" in start) return setPhase({ name: "error", code: start.error });
    try {
      await putWithProgress(start.url, start.headers, file, (percent) => setPhase({ name: "uploading", percent }));
    } catch {
      return setPhase({ name: "error", code: "upload_failed" });
    }
    setPhase({ name: "checking" });
    const result = await finishSlideUploadAction(start.uploadId);
    if (result.error) return setPhase({ name: "error", code: result.error });
    setPhase({ name: "done" });
    if (fileInput.current) fileInput.current.value = "";
    if (altInput.current) altInput.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="photo-alt" className={ui.label}>
          {t("alt")}
        </label>
        <p id="photo-alt-hint" className="mt-1 text-sm text-muted">
          {t("altHint")}
        </p>
        <input ref={altInput} id="photo-alt" maxLength={200} aria-describedby="photo-alt-hint" disabled={busy} className={ui.input} />
      </div>
      <div>
        <label htmlFor="photo-file" className={ui.label}>
          {t("file")}
        </label>
        <p id="photo-file-hint" className="mt-1 text-sm text-muted">
          {t("fileHint")}
        </p>
        <input
          ref={fileInput}
          id="photo-file"
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          aria-describedby="photo-file-hint"
          disabled={busy}
          className="mt-2 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-2 file:border-azure-700 file:bg-white file:px-4 file:font-semibold file:text-azure-700"
        />
      </div>
      <button type="button" onClick={upload} disabled={busy} className={ui.primary}>
        {t("submit")}
      </button>
      <div aria-live="polite">
        {phase.name === "uploading" && (
          <div className="space-y-1">
            <p>{t("uploading", { percent: phase.percent })}</p>
            <progress max={100} value={phase.percent} className="h-3 w-full accent-azure-700" aria-label={t("progress")} />
          </div>
        )}
        {phase.name === "checking" && <p>{t("checking")}</p>}
        {phase.name === "done" && (
          <p role="status" className={ui.success}>
            {t("done")}
          </p>
        )}
      </div>
      {phase.name === "error" && (
        <p role="alert" className={ui.error}>
          {te.has(phase.code) ? te(phase.code) : te("generic")}
        </p>
      )}
    </div>
  );
}
