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
  shape?: string;
  color?: string;
  selected?: boolean;
  label?: string;
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

  return (
    <group>
      {floors.map((floorIdx) => (
        <group key={`floor-plane-${floorIdx}`} position={[0, floorIdx * 8, 0]}>
          {interactive ? <gridHelper args={[200, 200, "#334155", "#1e293b"]} position={[0, 0.01, 0]} /> : null}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
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
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial 
              color={interactive ? "#0b1220" : "#1e293b"} 
              roughness={0.9} 
              transparent={interactive} 
              opacity={interactive ? 0.4 : 1.0} 
            />
          </mesh>
          {floorIdx === 0 && imageUrl && !imageUrl.endsWith(".svg") ? <BlueprintOverlay url={imageUrl} /> : null}
        </group>
      ))}
      
      {visibleBlocks.map((block) => (
        <mesh
          key={block.id}
          position={[block.posX, block.posY + block.scaleY / 2, block.posZ]}
          scale={[block.scaleX, block.scaleY, block.scaleZ]}
          castShadow
          onPointerDown={(e) => {
            e.stopPropagation();
            onBlockPointerDown?.(block.id, e.point, e.shiftKey);
            onBlockClick?.(block.id, e.shiftKey);
          }}
        >
          {block.shape === "CYLINDER" ? (
            <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
          ) : (
            <boxGeometry args={[1, 1, 1]} />
          )}
          <meshStandardMaterial
            color={forceColor ?? block.color ?? "#e2e8f0"}
            emissive={block.selected ? "#38bdf8" : (forceColor ?? block.color ?? "#e2e8f0")}
            emissiveIntensity={block.selected ? 1.0 : 0.15}
            roughness={0.7}
            metalness={0.1}
            transparent={false}
            opacity={1.0}
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
      ))}
    </group>
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
