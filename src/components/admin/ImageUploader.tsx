"use client";

import { useState } from "react";

export function ImageUploader({ 
  fieldName, 
  label = "Upload Image", 
  initialUrl 
}: { 
  fieldName: string; 
  label?: string; 
  initialUrl?: string | null; 
}) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-3 md:col-span-2">
      <input type="hidden" name={fieldName} value={preview ?? ""} />
      <label className="block rounded-2xl border border-dashed border-slate-600 p-6 text-center hover:bg-slate-800/50 cursor-pointer transition-colors">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setLoading(true);
            const body = new FormData();
            body.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body });
            const json = (await res.json()) as { url?: string; error?: string };
            if (json.url) setPreview(json.url);
            setLoading(false);
          }}
        />
        <span className="text-sm font-medium">
          {loading ? "Uploading..." : label}
        </span>
      </label>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Upload preview" className="mx-auto h-24 rounded-xl object-contain bg-slate-950 p-2" />
      ) : null}
    </div>
  );
}
