export type ReportKind = "floors" | "tenants" | "categories" | "users";

export type ReportPayload = {
  title: string;
  generatedAt: string;
  columns: string[];
  rows: Record<string, string | number>[];
};
