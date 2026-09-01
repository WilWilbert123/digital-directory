import prisma from "@/lib/prisma";
import type { ReportKind, ReportPayload } from "./types";

export async function buildReportPayload(kind: ReportKind): Promise<ReportPayload> {
  const generatedAt = new Date().toISOString();

  if (kind === "floors") {
    const floors = await prisma.floor.findMany({ orderBy: { levelNumber: "asc" } });
    return {
      title: "Floor Masterlist",
      generatedAt,
      columns: ["Code", "Name", "Level", "Active"],
      rows: floors.map((f) => ({
        Code: f.floorCode,
        Name: f.floorName,
        Level: f.levelNumber,
        Active: f.isActive ? "Yes" : "No",
      })),
    };
  }

  if (kind === "tenants") {
    const tenants = await prisma.tenant.findMany({
      include: { category: true, floor: true },
      orderBy: { tenantName: "asc" },
    });
    return {
      title: "Tenant Masterlist",
      generatedAt,
      columns: ["Code", "Name", "Category", "Floor", "Active"],
      rows: tenants.map((t) => ({
        Code: t.tenantCode,
        Name: t.tenantName,
        Category: t.category.categoryName,
        Floor: t.floor.floorName,
        Active: t.isActive ? "Yes" : "No",
      })),
    };
  }

  if (kind === "categories") {
    const cats = await prisma.category.findMany({ orderBy: { categoryName: "asc" } });
    return {
      title: "Category Masterlist",
      generatedAt,
      columns: ["Code", "Name", "Color", "Active"],
      rows: cats.map((c) => ({
        Code: c.categoryCode,
        Name: c.categoryName,
        Color: c.colorHex,
        Active: c.isActive ? "Yes" : "No",
      })),
    };
  }

  const users = await prisma.user.findMany({ orderBy: { username: "asc" } });
  return {
    title: "User Role Masterlist",
    generatedAt,
    columns: ["Username", "Full Name", "Role", "Active"],
    rows: users.map((u) => ({
      Username: u.username,
      "Full Name": u.fullName,
      Role: u.role,
      Active: u.isActive ? "Yes" : "No",
    })),
  };
}
