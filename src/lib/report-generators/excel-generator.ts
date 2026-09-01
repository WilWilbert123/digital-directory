import * as XLSX from "xlsx";
import type { ReportPayload } from "./types";

export function generateExcelBuffer(payload: ReportPayload) {
  const sheet = XLSX.utils.json_to_sheet(
    payload.rows.map((row) => {
      const next: Record<string, string | number> = {};
      for (const col of payload.columns) next[col] = row[col] ?? "";
      return next;
    }),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, payload.title.slice(0, 31));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
