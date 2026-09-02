export default function ReportsPage() {
  const kinds = [
    { id: "floors", label: "Floors" },
    { id: "tenants", label: "Tenants" },
    { id: "categories", label: "Categories" },
    { id: "users", label: "Users" },
  ];
  const formats = [
    { id: "pdf", label: "PDF" },
    { id: "excel", label: "Excel" },
    { id: "word", label: "Word" },
  ];

  return (
    <div className="text-zinc-900 dark:text-zinc-100">
      <h1 className="text-3xl font-bold">Report generator</h1>
      <p className="mt-1 text-zinc-500 dark:text-zinc-400">Export masterlists as PDF, Excel, or Word.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {kinds.map((k) => (
          <div key={k.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <h2 className="text-lg font-semibold">{k.label}</h2>
            <div className="mt-4 flex gap-2">
              {formats.map((f) => (
                <a
                  key={f.id}
                  href={`/api/reports/${f.id}?kind=${k.id}`}
                  className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  {f.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
