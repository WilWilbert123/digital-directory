"use client";

import { Html, Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

export type FloorBlockMesh = {
  id: string;
  blockName: string;
  posX: number;
  posY: number;
  posZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotationY?: number;
  shape?: string;
  pointsData?: string | null;
  color?: string;
  selected?: boolean;
  label?: string;
  logoURL?: string | null;
  levelNumber?: number;
};

export function FloorModel({
  imageUrl,
  blocks,
  onBlockClick,
  onBlockPointerDown,
  onPlaneClick,
  onPlanePointerMove,
  interactive = false,
  targetLevel,
  strictLevel,
  forceColor,
  floorColor,
  blockColor,
  fixedFloorSize,
  hideBlockOverlays = false,
  editorLightMode = false,
}: {
  imageUrl?: string | null;
  blocks: FloorBlockMesh[];
  onBlockClick?: (id: string, append: boolean) => void;
  onBlockPointerDown?: (id: string, point: THREE.Vector3, shiftKey: boolean) => void;
  onPlaneClick?: (point: THREE.Vector3) => void;
  onPlanePointerMove?: (point: THREE.Vector3) => void;
  interactive?: boolean;
  targetLevel?: number;
  strictLevel?: number | null;
  forceColor?: string;
  floorColor?: string;
  blockColor?: string;
  fixedFloorSize?: number;
  hideBlockOverlays?: boolean;
  editorLightMode?: boolean;
}) {
  const visibleBlocks = strictLevel != null 
    ? blocks.filter(b => (b.levelNumber ?? 1) === strictLevel)
    : targetLevel === undefined
      ? blocks
      : blocks.filter(b => (b.levelNumber ?? 1) <= targetLevel);
  
  // Create an array of floor indices (0 for L1, 1 for L2, etc)
  let floors: number[] = [];
  if (strictLevel != null) {
    floors = [strictLevel - 1]; // levelNumber is 1-indexed, floorIdx is 0-indexed
  } else {
    const maxLevel = targetLevel ?? Math.max(1, ...blocks.map(b => b.levelNumber ?? 1));
    floors = Array.from({ length: maxLevel }).map((_, i) => i);
  }

  // Calculate dynamic bounds for a floor so the plane perfectly covers all its blocks
  const getFloorBounds = (levelNumber: number) => {
    // Keep the backend editing surface stable while blocks are added or moved.
    if (interactive || fixedFloorSize) {
      const size = fixedFloorSize ?? 45;
      return { width: size, depth: size, centerX: 0, centerZ: 0 };
    }

    const floorBlocks = blocks.filter(b => (b.levelNumber ?? 1) === levelNumber);
    if (floorBlocks.length === 0) return { width: 45, depth: 45, centerX: 0, centerZ: 0 };

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    floorBlocks.forEach(b => {
      const halfW = b.scaleX / 2;
      const halfD = b.scaleZ / 2;
      minX = Math.min(minX, b.posX - halfW);
      maxX = Math.max(maxX, b.posX + halfW);
      minZ = Math.min(minZ, b.posZ - halfD);
      maxZ = Math.max(maxZ, b.posZ + halfD);
    });

    const padding = 6; // Add a generous margin around the blocks
    const width = Math.max(45, (maxX - minX) + padding * 2);
    const depth = Math.max(45, (maxZ - minZ) + padding * 2);
    // Only center the plane on the blocks if the bounds actually exceed the default 45x45
    // Otherwise, keep it centered at 0,0 to align with blueprints
    const centerX = (maxX - minX) + padding * 2 > 45 ? (minX + maxX) / 2 : 0;
    const centerZ = (maxZ - minZ) + padding * 2 > 45 ? (minZ + maxZ) / 2 : 0;

    return { width, depth, centerX, centerZ };
  };

  return (
    <group>
      {floors.map((floorIdx) => {
        const bounds = getFloorBounds(floorIdx + 1);
        return (
        <group key={`floor-plane-${floorIdx}`} position={[0, floorIdx * 8, 0]}>
          {interactive ? <gridHelper args={[bounds.width, bounds.depth, editorLightMode ? "#94a3b8" : "#334155", editorLightMode ? "#cbd5e1" : "#1e293b"]} position={[bounds.centerX, 0.01, bounds.centerZ]} /> : null}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[bounds.centerX, 0, bounds.centerZ]}
            receiveShadow
            onPointerDown={(e: ThreeEvent<PointerEvent>) => {
              if (!interactive) return;
              e.stopPropagation();
              onPlaneClick?.(e.point);
            }}
            onPointerMove={(e: ThreeEvent<PointerEvent>) => {
              if (!interactive) return;
              onPlanePointerMove?.(e.point);
            }}
          >
            <planeGeometry args={[bounds.width, bounds.depth]} />
            <meshStandardMaterial 
              color={interactive ? (editorLightMode ? "#f8fafc" : "#0b1220") : floorColor ?? forceColor ?? "#8B5FBF"} 
              roughness={0.9} 
              transparent={interactive} 
              opacity={interactive ? 0.4 : 1.0} 
            />
          </mesh>
          {floorIdx === 0 && imageUrl && !interactive && !imageUrl.endsWith(".svg") ? <BlueprintOverlay url={imageUrl} /> : null}
        </group>
        );
      })}
      
      {visibleBlocks.map((block) => (
         <BlockMesh
           key={block.id}
           block={block}
           forceColor={forceColor}
           blockColor={blockColor}
           hideBlockOverlays={hideBlockOverlays}
           onBlockPointerDown={onBlockPointerDown}
           onBlockClick={onBlockClick}
         />
      ))}
    </group>
  );
}

import { useMemo, useState } from "react";

function BlockMesh({
  block,
  forceColor,
  blockColor,
  hideBlockOverlays,
  onBlockPointerDown,
  onBlockClick,
}: {
  block: FloorBlockMesh;
  forceColor?: string;
  blockColor?: string;
  hideBlockOverlays: boolean;
  onBlockPointerDown?: (id: string, point: THREE.Vector3, shiftKey: boolean) => void;
  onBlockClick?: (id: string, append: boolean) => void;
}) {
  const shape = (block.shape ?? "BOX").trim().toUpperCase();
  const customGeometry = useMemo(() => {
    if (shape === "POLYGON" && block.pointsData) {
      try {
        const points: [number, number][] = JSON.parse(block.pointsData);
        if (points.length >= 3) {
          const shape = new THREE.Shape();
          points.forEach((p, idx) => {
            // Z goes down in 3D, so we flip Y from the 2D parser
            if (idx === 0) shape.moveTo(p[0], -p[1]);
            else shape.lineTo(p[0], -p[1]);
          });
          shape.lineTo(points[0][0], -points[0][1]); // close path
          
          const g = new THREE.ExtrudeGeometry(shape, {
            depth: 1,
            bevelEnabled: false,
          });
          // Extrude natively goes along Z. Rotate to lay flat on XZ, and extrude up Y.
          g.rotateX(Math.PI / 2);
          g.translate(0, 0.5, 0); // Shift up so bottom rests at y=0, just like our Box
          return g;
        }
      } catch (e) {
        console.error("Failed to parse polygon points", e);
      }
    }
    return null;
  }, [shape, block.pointsData]);

  return (
    <group
      position={[block.posX, block.posY + block.scaleY / 2, block.posZ]}
      rotation={[0, block.rotationY ?? 0, 0]}
      scale={[block.scaleX, block.scaleY, block.scaleZ]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onBlockPointerDown?.(block.id, e.point, e.shiftKey);
        onBlockClick?.(block.id, e.shiftKey);
      }}
    >
      {shape === "ESCALATOR" ? (
        <EscalatorGeometry selected={block.selected ?? false} />
      ) : shape === "STAIRS" ? (
        <StairsGeometry selected={block.selected ?? false} />
      ) : shape === "PLANT" ? (
        <PlantGeometry selected={block.selected ?? false} />
      ) : shape === "CHAIR" ? (
        <ChairGeometry selected={block.selected ?? false} />
      ) : shape === "TABLE" ? (
        <TableGeometry selected={block.selected ?? false} />
      ) : shape === "BENCH" ? (
        <BenchGeometry selected={block.selected ?? false} />
      ) : shape === "STREET_LIGHT" ? (
        <StreetLightGeometry selected={block.selected ?? false} />
      ) : shape === "COMPUTER" ? (
        <ComputerGeometry selected={block.selected ?? false} />
      ) : shape === "TRIANGLE" ? (
        <TriangleGeometry selected={block.selected ?? false} />
      ) : (
        <mesh castShadow>
          {customGeometry && <primitive object={customGeometry} attach="geometry" />}
          {!customGeometry && shape === "CYLINDER" && <cylinderGeometry args={[0.5, 0.5, 1, 32]} />}
          {!customGeometry && shape === "WEDGE" && <cylinderGeometry args={[0.5, 0.5, 1, 32, 1, false, 0, Math.PI / 2]} />}
          {!customGeometry && shape !== "CYLINDER" && shape !== "WEDGE" && <boxGeometry args={[1, 1, 1]} />}
          <meshStandardMaterial
            color={blockColor ?? forceColor ?? block.color ?? "#e2e8f0"}
            emissive={block.selected ? "#38bdf8" : (blockColor ?? forceColor ?? block.color ?? "#e2e8f0")}
            emissiveIntensity={block.selected ? 1.0 : 0.15}
            roughness={0.7}
            metalness={0.1}
          />
          <Edges linewidth={2} threshold={15} color={block.selected ? "#ffffff" : "#475569"} />
        </mesh>
      )}
      {!hideBlockOverlays && block.logoURL ? (
        <LogoSticker
          url={block.logoURL}
          blockScale={[block.scaleX, block.scaleY, block.scaleZ]}
          isCircular={shape === "CYLINDER"}
        />
      ) : null}
      {!hideBlockOverlays && block.label ? (
        <Html center distanceFactor={18} position={[0, 0.7, 0]}>
          <div className="whitespace-nowrap rounded-md bg-black/90 border border-white/20 px-3 py-1.5 text-xs font-bold text-white shadow-xl pointer-events-none">
            {block.label}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function LogoSticker({
  url,
  blockScale,
  isCircular,
}: {
  url: string;
  blockScale: [number, number, number];
  isCircular: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const inverseScale = blockScale.map((value) => 1 / Math.max(value, 0.01)) as [number, number, number];

  if (failed) return null;

  return (
    <group position={[0, 0, 0.5]} scale={inverseScale}>
      <mesh position={[0, 0, -0.004]}>
        <planeGeometry args={isCircular ? [0.42, 0.42] : [0.48, 0.28]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} metalness={0.05} />
      </mesh>
      <Html center transform distanceFactor={30} position={[0, 0, 0.004]} style={{ pointerEvents: "none" }}>
        <div className={`flex items-center justify-center overflow-hidden bg-white p-0.5 ${isCircular ? "h-7 w-7 rounded-full" : "h-6 w-10 rounded-sm"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" onError={() => setFailed(true)} className="max-h-full max-w-full object-contain" />
        </div>
      </Html>
    </group>
  );
}

function EscalatorGeometry({ selected }: { selected: boolean }) {
  const bodyColor = selected ? "#38bdf8" : "#475569";
  const stepColor = selected ? "#bae6fd" : "#94a3b8";
  const railColor = selected ? "#ffffff" : "#f59e0b";
  const slope = Math.atan2(0.82, 2.9);

  return (
    <group position={[0, -0.05, 0]}>
      <mesh position={[0, -0.42, 0]} castShadow>
        <boxGeometry args={[0.95, 0.3, 3.2]} />
        <meshStandardMaterial color={bodyColor} roughness={0.65} metalness={0.25} />
        <Edges color={selected ? "#ffffff" : "#1e293b"} linewidth={2} />
      </mesh>
      {Array.from({ length: 18 }).map((_, index) => {
        const progress = index / 17;
        const z = -1.35 + progress * 2.7;
        const y = -0.22 + progress * 0.78;
        return (
          <mesh key={index} position={[0, y, z]} castShadow>
            <boxGeometry args={[0.76, 0.055, 0.14]} />
            <meshStandardMaterial color={stepColor} roughness={0.8} />
          </mesh>
        );
      })}
      <mesh position={[0, -0.22, -1.48]} castShadow>
        <boxGeometry args={[0.96, 0.12, 0.28]} />
        <meshStandardMaterial color={stepColor} />
      </mesh>
      <mesh position={[0, 0.62, 1.48]} castShadow>
        <boxGeometry args={[0.96, 0.12, 0.28]} />
        <meshStandardMaterial color={stepColor} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.18, 0]} rotation={[-slope, 0, 0]} castShadow>
            <boxGeometry args={[0.08, 0.12, 3.25]} />
            <meshStandardMaterial color={bodyColor} metalness={0.35} roughness={0.5} />
          </mesh>
          <mesh position={[x, 0.62, 0.02]} rotation={[-slope, 0, 0]} castShadow>
            <boxGeometry args={[0.08, 0.08, 3.35]} />
            <meshStandardMaterial color={railColor} metalness={0.65} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function StairsGeometry({ selected }: { selected: boolean }) {
  const color = selected ? "#bae6fd" : "#64748b";
  return <group>{Array.from({ length: 8 }).map((_, index) => (
    <mesh key={index} position={[0, -0.38 + index * 0.12, -0.85 + index * 0.22]} castShadow>
      <boxGeometry args={[0.95, 0.24 + index * 0.03, 0.28 + index * 0.22]} />
      <meshStandardMaterial color={color} />
      <Edges color={selected ? "#ffffff" : "#334155"} linewidth={1.5} />
    </mesh>
  ))}</group>;
}

function PlantGeometry({ selected }: { selected: boolean }) {
  return (
    <group>
      <mesh position={[0, -0.38, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.38, 0.3, 20]} />
        <meshStandardMaterial color={selected ? "#bae6fd" : "#c08457"} />
      </mesh>
      {[-0.16, 0, 0.16].map((x, index) => (
        <mesh key={index} position={[x, 0.02 + (index % 2) * 0.08, 0]} rotation={[0, (index - 1) * 0.35, (index - 1) * 0.2]} castShadow>
          <sphereGeometry args={[0.18, 12, 8]} />
          <meshStandardMaterial color={selected ? "#86efac" : index === 1 ? "#22c55e" : "#16a34a"} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function ChairGeometry({ selected }: { selected: boolean }) {
  const color = selected ? "#bae6fd" : "#d97706";
  return (
    <group>
      <mesh position={[0, -0.12, 0]} castShadow><boxGeometry args={[0.7, 0.12, 0.7]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.35, 0.28]} castShadow><boxGeometry args={[0.7, 0.8, 0.12]} /><meshStandardMaterial color={color} /></mesh>
      {[-0.25, 0.25].flatMap((x) => [-0.25, 0.25].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, -0.42, z]} castShadow><cylinderGeometry args={[0.045, 0.045, 0.6, 8]} /><meshStandardMaterial color={color} /></mesh>
      )))}
    </group>
  );
}

function TableGeometry({ selected }: { selected: boolean }) {
  const color = selected ? "#bae6fd" : "#92400e";
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow><cylinderGeometry args={[0.72, 0.72, 0.14, 24]} /><meshStandardMaterial color={color} roughness={0.65} /></mesh>
      <mesh position={[0, -0.3, 0]} castShadow><cylinderGeometry args={[0.1, 0.16, 0.8, 12]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, -0.7, 0]} castShadow><cylinderGeometry args={[0.48, 0.48, 0.08, 20]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
}

function BenchGeometry({ selected }: { selected: boolean }) {
  const color = selected ? "#bae6fd" : "#92400e";
  return <group>
    <mesh position={[0, 0.12, 0]} castShadow><boxGeometry args={[1.5, 0.14, 0.45]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0, 0.58, 0.18]} castShadow><boxGeometry args={[1.5, 0.75, 0.12]} /><meshStandardMaterial color={color} /></mesh>
    {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, -0.32, 0]} castShadow><boxGeometry args={[0.1, 0.75, 0.35]} /><meshStandardMaterial color={color} /></mesh>)}
  </group>;
}

function StreetLightGeometry({ selected }: { selected: boolean }) {
  const metal = selected ? "#bae6fd" : "#334155";
  return <group>
    <mesh position={[0, -0.58, 0]} castShadow><cylinderGeometry args={[0.18, 0.24, 0.1, 16]} /><meshStandardMaterial color={metal} metalness={0.7} /></mesh>
    <mesh position={[0, 0.05, 0]} castShadow><cylinderGeometry args={[0.045, 0.07, 1.3, 12]} /><meshStandardMaterial color={metal} metalness={0.7} /></mesh>
    <mesh position={[0, 0.68, 0.14]} rotation={[0.35, 0, 0]} castShadow><boxGeometry args={[0.08, 0.08, 0.42]} /><meshStandardMaterial color={metal} metalness={0.7} /></mesh>
    <mesh position={[0, 0.62, 0.34]} castShadow><sphereGeometry args={[0.13, 16, 12]} /><meshStandardMaterial color={selected ? "#ffffff" : "#fde68a"} emissive="#facc15" emissiveIntensity={0.7} /></mesh>
  </group>;
}

function ComputerGeometry({ selected }: { selected: boolean }) {
  const shell = selected ? "#bae6fd" : "#64748b";
  return <group>
    <mesh position={[0, 0.35, 0.1]} castShadow><boxGeometry args={[0.75, 0.52, 0.08]} /><meshStandardMaterial color={shell} /></mesh>
    <mesh position={[0, 0.02, 0.1]} castShadow><boxGeometry args={[0.08, 0.65, 0.08]} /><meshStandardMaterial color={shell} /></mesh>
    <mesh position={[0, -0.32, 0.1]} castShadow><boxGeometry args={[0.7, 0.08, 0.42]} /><meshStandardMaterial color={shell} /></mesh>
    <mesh position={[0, -0.17, -0.05]} castShadow><boxGeometry args={[0.55, 0.04, 0.3]} /><meshStandardMaterial color="#111827" /></mesh>
  </group>;
}

function TriangleGeometry({ selected }: { selected: boolean }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, -0.5);
    shape.lineTo(0.5, -0.5);
    shape.lineTo(0, 0.5);
    shape.closePath();
    const result = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
    result.rotateX(Math.PI / 2);
    return result;
  }, []);
  return <mesh geometry={geometry} castShadow><meshStandardMaterial color={selected ? "#bae6fd" : "#0ea5e9"} /><Edges color={selected ? "#ffffff" : "#075985"} linewidth={2} /></mesh>;
}

function BlueprintOverlay({ url }: { url: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <planeGeometry args={[45, 45]} />
      <meshBasicMaterial color="#1e293b" transparent opacity={0.85} />
      <Html transform occlude={false} position={[0, 0, 0.01]} distanceFactor={14}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="pointer-events-none w-[1800px] h-auto max-h-[1800px] object-contain opacity-70" />
      </Html>
    </mesh>
  );
}
