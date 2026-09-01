import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.pathEdge.deleteMany();
  await prisma.floorBlock.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.pathNode.deleteMany();
  await prisma.category.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.syncLog.deleteMany();

  const password = await bcrypt.hash("Admin@123", 12);

  // Users
  await prisma.user.createMany({
    data: [
      { username: "superadmin", password, fullName: "BISPOS Super Admin", role: "SUPER_ADMIN" },
      { username: "malladmin", password, fullName: "Mall Administrator", role: "MALL_ADMIN" },
      { username: "kiosk", password, fullName: "Lobby Kiosk Operator", role: "KIOSK_OPERATOR" },
    ],
  });

  // Single Floor Setup (First Floor Only as requested, using the provided map layout)
  const l1 = await prisma.floor.create({
    data: { floorCode: "L1", floorName: "Main Mall - Level 1", levelNumber: 1, image2dURL: "/uploads/custom-floor-plan.jpg" },
  });

  // Categories based on the provided map
  const deptStore = await prisma.category.create({ data: { categoryCode: "DEPT", categoryName: "Department Store", colorHex: "#FDE047" } }); // Yellow
  const dining = await prisma.category.create({ data: { categoryCode: "FNB", categoryName: "Dining", colorHex: "#93C5FD" } }); // Light Blue
  const ent = await prisma.category.create({ data: { categoryCode: "ENT", categoryName: "Entertainment", colorHex: "#86EFAC" } }); // Light Green
  const retail = await prisma.category.create({ data: { categoryCode: "RTL", categoryName: "Retail", colorHex: "#93C5FD" } }); // Light Blue
  const tech = await prisma.category.create({ data: { categoryCode: "TECH", categoryName: "Tech & Gadgets", colorHex: "#FDBA74" } }); // Orange

  // Node helper
  const n = async (
    id: string,
    nodeName: string,
    type: "WALKWAY" | "TENANT_ENTRANCE" | "KIOSK_START",
    x: number,
    z: number,
  ) =>
    prisma.pathNode.create({
      data: { id, floorId: l1.id, nodeName, type, positionX: x, positionY: 0.2, positionZ: z },
    });

  // Create Nodes (Mapped roughly to the provided image coordinates)
  // X = Left/Right (Left is negative, Right is positive)
  // Z = Top/Bottom (Top is negative, Bottom is positive)
  const kiosk = await n("node-kiosk", "Main Entrance Kiosk", "KIOSK_START", 0, 10);
  
  // Walkways (Main central path)
  const wCenter = await n("node-w-center", "Central Atrium", "WALKWAY", 0, 0);
  const wWest = await n("node-w-west", "West Corridor", "WALKWAY", -8, 0);
  const wEast = await n("node-w-east", "East Corridor", "WALKWAY", 8, 0);
  const wNorth = await n("node-w-north", "Entertainment Corridor", "WALKWAY", 0, -6);
  const wSouth = await n("node-w-south", "South Corridor", "WALKWAY", 0, 6);

  // Tenant Entrances
  const eDept = await n("node-e-dept", "SM Dept Store Entrance", "TENANT_ENTRANCE", -12, 0);
  const eDell = await n("node-e-dell", "DELL Entrance", "TENANT_ENTRANCE", 12, 0);
  const eFood = await n("node-e-food", "Food Court Entrance", "TENANT_ENTRANCE", 0, -3);
  const eCinema = await n("node-e-cinema", "SM Cinemas Entrance", "TENANT_ENTRANCE", 0, -8);
  const eToy = await n("node-e-toy", "Toy Kingdom Entrance", "TENANT_ENTRANCE", 2, 6);
  const eOurHome = await n("node-e-ourhome", "Our Home Entrance", "TENANT_ENTRANCE", -4, 6);

  // Link Nodes
  const link = (from: string, to: string, weight: number) =>
    prisma.pathEdge.create({ data: { fromNodeId: from, toNodeId: to, weight, isAccessible: true } });

  await link(kiosk.id, wSouth.id, 4);
  await link(wSouth.id, wCenter.id, 6);
  await link(wCenter.id, wNorth.id, 6);
  await link(wCenter.id, wWest.id, 8);
  await link(wCenter.id, wEast.id, 8);
  
  // Connect entrances to walkways
  await link(wWest.id, eDept.id, 4);
  await link(wEast.id, eDell.id, 4);
  await link(wCenter.id, eFood.id, 3);
  await link(wNorth.id, eCinema.id, 2);
  await link(wSouth.id, eToy.id, 3);
  await link(wSouth.id, eOurHome.id, 4);

  // Create Tenants
  const tDept = await prisma.tenant.create({
    data: { tenantCode: "DEPT", tenantName: "SM Department Store", description: "All your shopping needs", categoryId: deptStore.id, floorId: l1.id, entranceNodeId: eDept.id },
  });
  const tDell = await prisma.tenant.create({
    data: { tenantCode: "DELL", tenantName: "DELL", description: "Computers and Laptops", categoryId: tech.id, floorId: l1.id, entranceNodeId: eDell.id },
  });
  const tFood = await prisma.tenant.create({
    data: { tenantCode: "FOOD", tenantName: "SM Food Court", description: "Variety of dining options", categoryId: dining.id, floorId: l1.id, entranceNodeId: eFood.id },
  });
  const tCinema = await prisma.tenant.create({
    data: { tenantCode: "CINE", tenantName: "SM Cinemas", description: "Latest blockbuster movies", categoryId: ent.id, floorId: l1.id, entranceNodeId: eCinema.id },
  });
  const tToy = await prisma.tenant.create({
    data: { tenantCode: "TOYS", tenantName: "Toy Kingdom", description: "Toys and collectibles", categoryId: retail.id, floorId: l1.id, entranceNodeId: eToy.id },
  });
  const tOurHome = await prisma.tenant.create({
    data: { tenantCode: "HOME", tenantName: "Our Home", description: "Furniture and decor", categoryId: retail.id, floorId: l1.id, entranceNodeId: eOurHome.id },
  });

  // Create 3D Floor Blocks representing the stores
  await prisma.floorBlock.createMany({
    data: [
      { blockName: "SM Dept Store", posX: -15, posY: 0, posZ: 0, scaleX: 6, scaleY: 2, scaleZ: 14, floorId: l1.id, tenantId: tDept.id },
      { blockName: "DELL", posX: 15, posY: 0, posZ: 0, scaleX: 6, scaleY: 2, scaleZ: 14, floorId: l1.id, tenantId: tDell.id },
      { blockName: "SM Food Court", posX: 0, posY: 0, posZ: -4, scaleX: 6, scaleY: 1.5, scaleZ: 4, floorId: l1.id, tenantId: tFood.id },
      { blockName: "SM Cinemas", posX: 0, posY: 0, posZ: -10, scaleX: 12, scaleY: 3, scaleZ: 4, floorId: l1.id, tenantId: tCinema.id },
      { blockName: "Toy Kingdom", posX: 4, posY: 0, posZ: 8, scaleX: 4, scaleY: 2, scaleZ: 4, floorId: l1.id, tenantId: tToy.id },
      { blockName: "Our Home", posX: -4, posY: 0, posZ: 8, scaleX: 4, scaleY: 2, scaleZ: 4, floorId: l1.id, tenantId: tOurHome.id },
    ],
  });

  console.log("Seeded single-floor demo based on provided map!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
