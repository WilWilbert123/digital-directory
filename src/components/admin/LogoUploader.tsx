"use client";

import { useState } from "react";

export function LogoUploader({ name = "file", initialUrl }: { name?: string; initialUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);

  return (
    <div className="space-y-3">
      <input type="hidden" name="logoURL" value={preview ?? ""} />
      <label className="block rounded-2xl border border-dashed border-slate-600 p-6 text-center">
        <input
          type="file"
          name={name}
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const body = new FormData();
            body.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body });
            const json = (await res.json()) as { url?: string; error?: string };
            if (json.url) setPreview(json.url);
          }}
        />
        <span className="text-sm font-medium">Tap to upload tenant logo</span>
      </label>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Logo preview" className="mx-auto h-24 w-24 rounded-xl object-contain bg-white p-2" />
      ) : null}
    </div>
  );
}
