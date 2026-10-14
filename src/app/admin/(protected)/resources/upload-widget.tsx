"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ui } from "@/components/admin/ui";
import { ACCEPT_ATTRIBUTE } from "@/lib/file-rules";
import { finishUploadAction, startUploadAction } from "./actions";

type Phase = { name: "idle" } | { name: "uploading"; percent: number } | { name: "checking" } | { name: "done" } | { name: "error"; code: string };

/** PUT bytes to the presigned URL with progress (fetch can't report upload progress). */
function put(url: string, headers: Record<string, string>, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

/**
 * Uploads a file straight to storage (docs/PLAN.md §3.2): ask the server for a presigned URL, PUT
 * the file there, then ask the server to check it. The web server never handles the file itself.
 */
export function UploadWidget({ materialId, replacing }: { materialId: string; replacing: boolean }) {
  const t = useTranslations("Admin.resources.upload");
  const te = useTranslations("Admin.form.errors");
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const busy = phase.name === "uploading" || phase.name === "checking";

  async function upload() {
    const file = input.current?.files?.[0];
    if (!file) return setPhase({ name: "error", code: "no_file_chosen" });
    setPhase({ name: "uploading", percent: 0 });
    const start = await startUploadAction(materialId, file.name, file.size);
    if ("error" in start) return setPhase({ name: "error", code: start.error });
    try {
      await put(start.url, start.headers, file, (percent) => setPhase({ name: "uploading", percent }));
    } catch {
      return setPhase({ name: "error", code: "upload_failed" });
    }
    setPhase({ name: "checking" });
    const result = await finishUploadAction(start.uploadId);
    if (result.error) return setPhase({ name: "error", code: result.error });
    setPhase({ name: "done" });
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="upload-file" className={ui.label}>
          {replacing ? t("replaceLabel") : t("label")}
        </label>
        <p id="upload-file-hint" className="mt-1 text-sm text-muted">
          {t("hint")}
        </p>
        <input
          ref={input}
          id="upload-file"
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          aria-describedby="upload-file-hint"
          disabled={busy}
          className="mt-2 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-2 file:border-azure-700 file:bg-white file:px-4 file:font-semibold file:text-azure-700"
        />
      </div>
      <button type="button" onClick={upload} disabled={busy} className={ui.primary}>
        {replacing ? t("replace") : t("submit")}
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
