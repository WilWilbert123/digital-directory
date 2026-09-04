"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createSession, destroySession, getSession, isUserRole } from "@/lib/auth";
import { publishSync } from "@/lib/real-time-sync";
import { KIOSK_ID } from "@/lib/utils";

async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) return { error: "Invalid credentials" };
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return { error: "Invalid credentials" };
  if (!isUserRole(user.role)) return { error: "Invalid account role" };
  await createSession({ id: user.id, username: user.username, fullName: user.fullName, role: user.role });
  redirect("/admin/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

async function audit(tableName: string, operationType: string, payload: unknown) {
  await prisma.syncLog.create({
    data: {
      sourceKioskId: KIOSK_ID,
      tableName,
      operationType,
      payloadJson: JSON.stringify(payload),
      syncStatus: "SUCCESS",
    },
  });
  publishSync({ tableName, operationType, payload });
}

const floorSchema = z.object({
  id: z.string().optional(),
  floorCode: z.string().min(1),
  floorName: z.string().min(1),
  levelNumber: z.coerce.number().int(),
  image2dURL: z.string().optional().nullable(),
  model3dURL: z.string().optional().nullable(),
  isActive: z.coerce.boolean().optional(),
});

export async function saveFloorAction(formData: FormData) {
  await requireAdmin();
  const parsed = floorSchema.parse({
    id: formData.get("id") || undefined,
    floorCode: formData.get("floorCode"),
    floorName: formData.get("floorName"),
    levelNumber: formData.get("levelNumber"),
    image2dURL: formData.get("image2dURL") || null,
    model3dURL: formData.get("model3dURL") || null,
    isActive: formData.get("isActive") === "on",
  });
  const data = {
    floorCode: parsed.floorCode,
    floorName: parsed.floorName,
    levelNumber: parsed.levelNumber,
    image2dURL: parsed.image2dURL,
    model3dURL: parsed.model3dURL,
    isActive: parsed.isActive ?? true,
  };
  try {
    const row = parsed.id
      ? await prisma.floor.update({ where: { id: parsed.id }, data })
      : await prisma.floor.create({ data });
    await audit("Floor", parsed.id ? "UPDATE" : "CREATE", row);
    revalidatePath("/admin/floors");
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error(`A floor with this ${error.meta?.target?.[0] || 'code'} already exists.`);
    }
    throw error;
  }
}

export async function deleteFloorAction(id: string) {
  await requireAdmin();
  
  // Get all nodes on this floor to delete their edges
  const nodes = await prisma.pathNode.findMany({ where: { floorId: id }, select: { id: true } });
  const nodeIds = nodes.map(n => n.id);

  await prisma.$transaction([
    // Delete all edges connected to nodes on this floor
    prisma.pathEdge.deleteMany({
      where: { OR: [{ fromNodeId: { in: nodeIds } }, { toNodeId: { in: nodeIds } }] }
    }),
    // Delete blocks, nodes, and tenants on this floor
    prisma.floorBlock.deleteMany({ where: { floorId: id } }),
    prisma.pathNode.deleteMany({ where: { floorId: id } }),
    prisma.tenant.deleteMany({ where: { floorId: id } }),
    // Finally delete the floor
    prisma.floor.delete({ where: { id } })
  ]);
  
  await audit("Floor", "DELETE", { id });
  revalidatePath("/admin/floors");
}

const categorySchema = z.object({
  id: z.string().optional(),
  categoryCode: z.string().min(1),
  categoryName: z.string().min(1),
  iconURL: z.string().optional().nullable(),
  colorHex: z.string().min(4),
  isActive: z.coerce.boolean().optional(),
});

export async function saveCategoryAction(formData: FormData) {
  await requireAdmin();
  const parsed = categorySchema.parse({
    id: formData.get("id") || undefined,
    categoryCode: formData.get("categoryCode"),
    categoryName: formData.get("categoryName"),
    iconURL: formData.get("iconURL") || null,
    colorHex: formData.get("colorHex"),
    isActive: formData.get("isActive") === "on",
  });
  const data = {
    categoryCode: parsed.categoryCode,
    categoryName: parsed.categoryName,
    iconURL: parsed.iconURL,
    colorHex: parsed.colorHex,
    isActive: parsed.isActive ?? true,
  };
  const row = parsed.id
    ? await prisma.category.update({ where: { id: parsed.id }, data })
    : await prisma.category.create({ data });
  await audit("Category", parsed.id ? "UPDATE" : "CREATE", row);
  revalidatePath("/admin/categories");
  revalidatePath("/categories");
}

export async function deleteCategoryAction(id: string) {
  await requireAdmin();
  await prisma.category.delete({ where: { id } });
  await audit("Category", "DELETE", { id });
  revalidatePath("/admin/categories");
}

const tenantSchema = z.object({
  id: z.string().optional(),
  tenantCode: z.string().min(1),
  tenantName: z.string().min(1),
  logoURL: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  categoryId: z.string().min(1),
  floorId: z.string().min(1),
  entranceNodeId: z.string().optional().nullable(),
  isActive: z.coerce.boolean().optional(),
});

export async function saveTenantAction(formData: FormData) {
  await requireAdmin();
  const parsed = tenantSchema.parse({
    id: formData.get("id") || undefined,
    tenantCode: formData.get("tenantCode"),
    tenantName: formData.get("tenantName"),
    logoURL: formData.get("logoURL") || null,
    description: formData.get("description") || null,
    categoryId: formData.get("categoryId"),
    floorId: formData.get("floorId"),
    entranceNodeId: formData.get("entranceNodeId") || null,
    isActive: formData.get("isActive") === "on",
  });
  const data = {
    tenantCode: parsed.tenantCode,
    tenantName: parsed.tenantName,
    logoURL: parsed.logoURL,
    description: parsed.description,
    categoryId: parsed.categoryId,
    floorId: parsed.floorId,
    entranceNodeId: parsed.entranceNodeId,
    isActive: parsed.isActive ?? true,
  };
  const row = parsed.id
    ? await prisma.tenant.update({ where: { id: parsed.id }, data })
    : await prisma.tenant.create({ data });
  await audit("Tenant", parsed.id ? "UPDATE" : "CREATE", row);
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/floors/${parsed.floorId}/editor`);
  revalidatePath("/");
}

export async function deleteTenantAction(id: string) {
  await requireAdmin();
  await prisma.tenant.delete({ where: { id } });
  await audit("Tenant", "DELETE", { id });
  revalidatePath("/admin/tenants");
}

const userSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(3),
  password: z.string().optional(),
  fullName: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "MALL_ADMIN", "KIOSK_OPERATOR"]),
  isActive: z.coerce.boolean().optional(),
});

export async function saveUserAction(formData: FormData) {
  const session = await requireAdmin();
  if (session.role !== "SUPER_ADMIN") throw new Error("Forbidden");
  const parsed = userSchema.parse({
    id: formData.get("id") || undefined,
    username: formData.get("username"),
    password: formData.get("password") || undefined,
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on",
  });
  const data: {
    username: string;
    fullName: string;
    role: typeof parsed.role;
    isActive: boolean;
    password?: string;
  } = {
    username: parsed.username,
    fullName: parsed.fullName,
    role: parsed.role,
    isActive: parsed.isActive ?? true,
  };
  if (parsed.password) data.password = await bcrypt.hash(parsed.password, 12);
  if (!parsed.id && !data.password) throw new Error("Password required");
  const row = parsed.id
    ? await prisma.user.update({ where: { id: parsed.id }, data })
    : await prisma.user.create({ data: { ...data, password: data.password! } });
  await audit("User", parsed.id ? "UPDATE" : "CREATE", { id: row.id, username: row.username });
  revalidatePath("/admin/users");
}

export async function deleteUserAction(id: string) {
  const session = await requireAdmin();
  if (session.role !== "SUPER_ADMIN") throw new Error("Forbidden");
  await prisma.user.delete({ where: { id } });
  await audit("User", "DELETE", { id });
  revalidatePath("/admin/users");
}

export async function saveFloorGraphAction(input: {
  floorId: string;
  blocks: Array<{
    id: string;
    blockName: string;
    posX: number;
    posY: number;
    posZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    rotationY: number;
    tenantId: string | null;
    shape: "BOX" | "CYLINDER" | "WEDGE" | "ESCALATOR" | "STAIRS" | "PLANT" | "CHAIR" | "TABLE" | "BENCH" | "STREET_LIGHT" | "COMPUTER" | "TRIANGLE" | "POLYGON";
    pointsData?: string | null;
    logoURL?: string | null;
  }>;
  nodes: Array<{
    id: string;
    nodeName: string;
    type: "WALKWAY" | "TENANT_ENTRANCE" | "ELEVATOR" | "ESCALATOR" | "STAIRS" | "KIOSK_START";
    positionX: number;
    positionY: number;
    positionZ: number;
  }>;
  edges: Array<{
    id: string;
    fromNodeId: string;
    toNodeId: string;
    weight: number;
    isAccessible: boolean;
  }>;
}) {
  await requireAdmin();
  const { floorId, blocks, nodes, edges } = input;

  await prisma.$transaction(async (tx) => {
    // 1. Snapshot tenant node assignments before deletion cascades SetNull
    const tenantsWithNodes = await tx.tenant.findMany({
      where: { floorId, entranceNodeId: { not: null } },
      select: { id: true, entranceNodeId: true },
    });

    // 2. Clear old graph
    await tx.pathEdge.deleteMany({
      where: { OR: [{ fromNode: { floorId } }, { toNode: { floorId } }] },
    });
    await tx.floorBlock.deleteMany({ where: { floorId } });
    await tx.pathNode.deleteMany({ where: { floorId } });

    // 3. Recreate graph
    if (nodes.length) {
      await tx.pathNode.createMany({
        data: nodes.map((n) => ({
          id: n.id,
          nodeName: n.nodeName,
          type: n.type,
          positionX: n.positionX,
          positionY: n.positionY,
          positionZ: n.positionZ,
          floorId,
        })),
      });
    }

    if (edges.length) {
      // Prevent foreign key crashes by filtering out orphaned edges
      const nodeIds = new Set(nodes.map(n => n.id));
      const validEdges = edges.filter(e => nodeIds.has(e.fromNodeId) && nodeIds.has(e.toNodeId));
      
      await tx.pathEdge.createMany({
        data: validEdges.map((e) => ({
          id: e.id,
          fromNodeId: e.fromNodeId,
          toNodeId: e.toNodeId,
          weight: e.weight,
          isAccessible: e.isAccessible,
        })),
      });
    }

    if (blocks.length) {
      await tx.floorBlock.createMany({
        data: blocks.map((b) => ({
          id: b.id,
          blockName: b.blockName,
          posX: b.posX,
          posY: b.posY,
          posZ: b.posZ,
          scaleX: b.scaleX,
          scaleY: b.scaleY,
          scaleZ: b.scaleZ,
          rotationY: b.rotationY || 0,
          floorId,
          tenantId: b.tenantId,
          shape: b.shape,
          pointsData: b.pointsData,
          logoURL: b.logoURL,
        })),
      });
    }

    // 4. Restore tenant node assignments (if the node wasn't deleted by the user)
    const savedNodeIds = new Set(nodes.map((n) => n.id));
    for (const t of tenantsWithNodes) {
      if (t.entranceNodeId && savedNodeIds.has(t.entranceNodeId)) {
        await tx.tenant.update({
          where: { id: t.id },
          data: { entranceNodeId: t.entranceNodeId },
        });
      }
    }
  }, { maxWait: 30000, timeout: 60000 });

  await audit("FloorGraph", "UPDATE", { floorId, blocks: blocks.length, nodes: nodes.length, edges: edges.length });
  revalidatePath(`/admin/floors/${floorId}/editor`);
  revalidatePath("/floor-plan");
  revalidatePath("/directions");
}
