import { FloorBlock } from "@prisma/client";
import { Vec3 } from "./pathfinding";

const GRID_SIZE = 0.5;
const MAP_MIN = -20;
const MAP_MAX = 20;

function isPointInBlock(x: number, z: number, block: FloorBlock): boolean {
  // Add a small margin so paths don't scrape the exact edge
  const margin = 0.3;
  if (block.shape === "CYLINDER") {
    const radius = Math.max(block.scaleX, block.scaleZ) / 2 + margin;
    const dx = x - block.posX;
    const dz = z - block.posZ;
    return dx * dx + dz * dz < radius * radius;
  } else {
    const halfX = block.scaleX / 2 + margin;
    const halfZ = block.scaleZ / 2 + margin;
    return (
      x > block.posX - halfX &&
      x < block.posX + halfX &&
      z > block.posZ - halfZ &&
      z < block.posZ + halfZ
    );
  }
}

export function routeAroundObstacles(
  start: Vec3,
  end: Vec3,
  blocks: FloorBlock[]
): Vec3[] {
  // If start and end are on different floors (different Y), we just return straight line for now,
  // or interpolate. Usually this is called per-floor.
  
  const ignoredBlocks = new Set<string>();
  for (const b of blocks) {
    if (isPointInBlock(start.x, start.z, b) || isPointInBlock(end.x, end.z, b)) {
      ignoredBlocks.add(b.id);
    }
  }

  
  const startX = Math.round(start.x / GRID_SIZE) * GRID_SIZE;
  const startZ = Math.round(start.z / GRID_SIZE) * GRID_SIZE;
  const endX = Math.round(end.x / GRID_SIZE) * GRID_SIZE;
  const endZ = Math.round(end.z / GRID_SIZE) * GRID_SIZE;

  // Simple heuristic
  const heuristic = (x: number, z: number) => {
    return Math.abs(x - endX) + Math.abs(z - endZ); // Manhattan
  };

  const toKey = (x: number, z: number) => `${x.toFixed(1)},${z.toFixed(1)}`;

  const openSet = new Set<string>();
  const startKey = toKey(startX, startZ);
  openSet.add(startKey);

  const cameFrom = new Map<string, { x: number; z: number }>();
  const gScore = new Map<string, number>();
  gScore.set(startKey, 0);

  const fScore = new Map<string, number>();
  fScore.set(startKey, heuristic(startX, startZ));

  // Limit iterations to prevent hanging if blocked
  let iterations = 0;
  const MAX_ITER = 5000;

  let currentKey = "";
  let currentX = startX;
  let currentZ = startZ;
  
  let reached = false;

  while (openSet.size > 0 && iterations < MAX_ITER) {
    iterations++;

    let lowestF = Infinity;
    for (const key of Array.from(openSet)) {
      const f = fScore.get(key) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentKey = key;
      }
    }

    const [cxStr, czStr] = currentKey.split(",");
    currentX = parseFloat(cxStr);
    currentZ = parseFloat(czStr);

    if (Math.abs(currentX - endX) < 0.1 && Math.abs(currentZ - endZ) < 0.1) {
      reached = true;
      break;
    }

    openSet.delete(currentKey);

    const neighbors = [
      [currentX + GRID_SIZE, currentZ],
      [currentX - GRID_SIZE, currentZ],
      [currentX, currentZ + GRID_SIZE],
      [currentX, currentZ - GRID_SIZE],
      // Diagonals
      [currentX + GRID_SIZE, currentZ + GRID_SIZE],
      [currentX - GRID_SIZE, currentZ + GRID_SIZE],
      [currentX + GRID_SIZE, currentZ - GRID_SIZE],
      [currentX - GRID_SIZE, currentZ - GRID_SIZE],
    ];

    for (const [nx, nz] of neighbors) {
      if (nx < MAP_MIN || nx > MAP_MAX || nz < MAP_MIN || nz > MAP_MAX) continue;
      
      // Check collision
      let hit = false;
      for (const b of blocks) {
        if (ignoredBlocks.has(b.id)) continue;
        if (isPointInBlock(nx, nz, b)) {
          hit = true;
          break;
        }
      }
      if (hit) continue;

      const nKey = toKey(nx, nz);
      const isDiag = Math.abs(nx - currentX) > 0.1 && Math.abs(nz - currentZ) > 0.1;
      const stepCost = isDiag ? GRID_SIZE * 1.414 : GRID_SIZE;
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + stepCost;

      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, { x: currentX, z: currentZ });
        gScore.set(nKey, tentativeG);
        fScore.set(nKey, tentativeG + heuristic(nx, nz));
        openSet.add(nKey);
      }
    }
  }

  if (!reached) {
    // Fallback: straight line
    return [start, end];
  }

  const path: Vec3[] = [];
  let curr = { x: currentX, z: currentZ };
  while (cameFrom.has(toKey(curr.x, curr.z))) {
    // Interpolate Y
    const t = 1 - heuristic(curr.x, curr.z) / heuristic(startX, startZ);
    // Be careful, heuristic might be 0 at start
    const hStart = heuristic(startX, startZ);
    let interpY = end.y;
    if (hStart > 0.001) {
      const hCurr = heuristic(curr.x, curr.z);
      const progress = 1 - (hCurr / hStart);
      interpY = start.y + (end.y - start.y) * progress;
    }

    path.unshift({ x: curr.x, y: interpY, z: curr.z });
    curr = cameFrom.get(toKey(curr.x, curr.z))!;
  }
  path.unshift(start);
  
  // ensure exact end point
  path[path.length - 1] = end;

  // Smoothing: remove intermediate nodes that are redundant (collinear)
  const smoothed: Vec3[] = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = smoothed[smoothed.length - 1];
    const next = path[i + 1];
    
    // Check if line of sight is clear between prev and next
    let clear = true;
    const steps = 10;
    for (let j = 1; j < steps; j++) {
      const tx = prev.x + (next.x - prev.x) * (j / steps);
      const tz = prev.z + (next.z - prev.z) * (j / steps);
      for (const b of blocks) {
        if (ignoredBlocks.has(b.id)) continue;
        if (isPointInBlock(tx, tz, b)) {
          clear = false;
          break;
        }
      }
      if (!clear) break;
    }
    
    if (!clear) {
      smoothed.push(path[i]);
    }
  }
  if (path.length > 1) {
    smoothed.push(path[path.length - 1]);
  }

  return smoothed;
}
