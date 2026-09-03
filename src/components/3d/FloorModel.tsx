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
  levelNumber?: number;
};

// Calculate stagger offset for exploded view stairs effect
export const getExplodedStagger = (level: number, isExplodedView: boolean) => {
  if (!isExplodedView) return { x: 0, z: 0 };
  const idx = level - 1;
  // Creates a zig-zag stair effect: left, right, left, right while moving back
  return { 
    x: idx % 2 === 0 ? -35 : 35, 
    z: idx * -32 
  };
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
  isExplodedView = false,
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
  isExplodedView?: boolean;
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
        const stagger = getExplodedStagger(floorIdx + 1, isExplodedView);
        const bounds = getFloorBounds(floorIdx + 1);
        return (
        <group key={`floor-plane-${floorIdx}`} position={[stagger.x, floorIdx * 8, stagger.z]}>
          {interactive ? <gridHelper args={[bounds.width, bounds.depth, "#334155", "#1e293b"]} position={[bounds.centerX, 0.01, bounds.centerZ]} /> : null}
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
              color={interactive ? "#0b1220" : forceColor ?? "#8B5FBF"} 
              roughness={0.9} 
              transparent={interactive} 
              opacity={interactive ? 0.4 : 1.0} 
            />
          </mesh>
          {floorIdx === 0 && imageUrl && !imageUrl.endsWith(".svg") ? <BlueprintOverlay url={imageUrl} /> : null}
        </group>
        );
      })}
      
      {visibleBlocks.map((block) => (
         <BlockMesh
           key={block.id}
           block={block}
           isExplodedView={isExplodedView}
           forceColor={forceColor}
           onBlockPointerDown={onBlockPointerDown}
           onBlockClick={onBlockClick}
         />
      ))}
    </group>
  );
}

import { useMemo } from "react";

function BlockMesh({
  block,
  isExplodedView,
  forceColor,
  onBlockPointerDown,
  onBlockClick,
}: {
  block: FloorBlockMesh;
  isExplodedView: boolean;
  forceColor?: string;
  onBlockPointerDown?: (id: string, point: THREE.Vector3, shiftKey: boolean) => void;
  onBlockClick?: (id: string, append: boolean) => void;
}) {
  const stagger = getExplodedStagger(block.levelNumber ?? 1, isExplodedView);

  const customGeometry = useMemo(() => {
    if (block.shape === "POLYGON" && block.pointsData) {
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
  }, [block.shape, block.pointsData]);

  return (
    <mesh
      position={[block.posX + stagger.x, block.posY + block.scaleY / 2, block.posZ + stagger.z]}
      rotation={[0, block.rotationY ?? 0, 0]}
      scale={[block.scaleX, block.scaleY, block.scaleZ]}
      castShadow
      onPointerDown={(e) => {
        e.stopPropagation();
        onBlockPointerDown?.(block.id, e.point, e.shiftKey);
        onBlockClick?.(block.id, e.shiftKey);
      }}
    >
      {customGeometry && <primitive object={customGeometry} attach="geometry" />}
      {!customGeometry && block.shape === "CYLINDER" && <cylinderGeometry args={[0.5, 0.5, 1, 32]} />}
      {!customGeometry && block.shape === "WEDGE" && <cylinderGeometry args={[0.5, 0.5, 1, 32, 1, false, 0, Math.PI / 2]} />}
      {!customGeometry && block.shape !== "CYLINDER" && block.shape !== "WEDGE" && <boxGeometry args={[1, 1, 1]} />}
      
      <meshStandardMaterial
        color={forceColor ?? block.color ?? "#e2e8f0"}
        emissive={block.selected ? "#38bdf8" : (forceColor ?? block.color ?? "#e2e8f0")}
        emissiveIntensity={block.selected ? 1.0 : 0.15}
        roughness={0.7}
        metalness={0.1}
      />
      <Edges 
        linewidth={2} 
        threshold={15} 
        color={block.selected ? "#ffffff" : "#475569"} 
      />
      {block.label ? (
        <Html center distanceFactor={18} position={[0, 0.7, 0]}>
          <div className="whitespace-nowrap rounded-md bg-black/90 border border-white/20 px-3 py-1.5 text-xs font-bold text-white shadow-xl pointer-events-none">
            {block.label}
          </div>
        </Html>
      ) : null}
    </mesh>
  );
}

function BlueprintOverlay({ url }: { url: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial color="#1e293b" transparent opacity={0.85} />
      <Html transform occlude={false} position={[0, 0, 0.01]} distanceFactor={14}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="pointer-events-none w-[1800px] h-auto max-h-[1800px] object-contain opacity-70" />
      </Html>
    </mesh>
  );
}
