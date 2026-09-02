"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveTenantAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/admin/SubmitButton";

interface TenantFormProps {
  editingTenant?: {
    id: string;
    tenantCode: string;
    tenantName: string;
    logoURL: string | null;
    description: string | null;
    categoryId: string;
    floorId: string;
    entranceNodeId: string | null;
    isActive: boolean;
  } | null;
  categories: { id: string; categoryName: string }[];
  floors: { id: string; floorName: string }[];
  nodes: { id: string; nodeName: string }[];
}

export function TenantForm({
  editingTenant,
  categories,
  floors,
  nodes,
}: TenantFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    try {
      setErrorMsg(null);
      await saveTenantAction(formData);

      // Auto clear form inputs after successful save
      formRef.current?.reset();

      const isEdit = !!editingTenant;
      setSuccessMsg(isEdit ? "Tenant updated successfully!" : "Tenant saved and form cleared!");
      setTimeout(() => setSuccessMsg(null), 3500);

      if (isEdit) {
        router.push("/admin/tenants");
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save tenant. Please check inputs.");
    }
  }

  return (
    <div className="space-y-3">
      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
          ⚠ {errorMsg}
        </div>
      )}
      <form
        ref={formRef}
        key={editingTenant?.id ?? "new"}
        action={handleSubmit}
        className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 md:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm"
      >
        {editingTenant && <input type="hidden" name="id" value={editingTenant.id} />}
        <input
          name="tenantCode"
          placeholder="Code"
          defaultValue={editingTenant?.tenantCode ?? ""}
          className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          required
        />
        <input
          name="tenantName"
          placeholder="Name"
          defaultValue={editingTenant?.tenantName ?? ""}
          className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          required
        />
        <input
          name="logoURL"
          placeholder="Logo URL"
          defaultValue={editingTenant?.logoURL ?? ""}
          className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <textarea
          name="description"
          placeholder="Description"
          defaultValue={editingTenant?.description ?? ""}
          className="h-24 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 md:col-span-3 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <select
          name="categoryId"
          defaultValue={editingTenant?.categoryId ?? (categories[0]?.id ?? "")}
          className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.categoryName}
            </option>
          ))}
        </select>
        <select
          name="floorId"
          defaultValue={editingTenant?.floorId ?? (floors[0]?.id ?? "")}
          className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          required
        >
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.floorName}
            </option>
          ))}
        </select>
        <select
          name="entranceNodeId"
          defaultValue={editingTenant?.entranceNodeId ?? ""}
          className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option value="">No entrance node (No directions)</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nodeName}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={editingTenant ? editingTenant.isActive : true}
          />{" "}
          Active
        </label>
        <SubmitButton
          idleText={editingTenant ? "Update tenant" : "Save new tenant"}
          loadingText="Saving..."
          className="h-11 rounded-lg bg-sky-600 font-semibold text-white md:col-span-2 hover:bg-sky-500 transition-colors"
        />
      </form>
    </div>
  );
}
