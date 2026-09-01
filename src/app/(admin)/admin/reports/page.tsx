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
    <div>
      <h1 className="text-3xl font-bold">Report generator</h1>
      <p className="mt-1 text-slate-400">Export masterlists as PDF, Excel, or Word.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {kinds.map((k) => (
          <div key={k.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">{k.label}</h2>
            <div className="mt-4 flex gap-2">
              {formats.map((f) => (
                <a
                  key={f.id}
                  href={`/api/reports/${f.id}?kind=${k.id}`}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm"
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
