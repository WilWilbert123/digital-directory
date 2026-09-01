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
};

export function FloorModel({
  imageUrl,
  blocks,
  onBlockClick,
  onPlaneClick,
  interactive = false,
}: {
  imageUrl?: string | null;
  blocks: FloorBlockMesh[];
  onBlockClick?: (id: string) => void;
  onPlaneClick?: (point: THREE.Vector3) => void;
  interactive?: boolean;
}) {
  return (
    <group>
      <gridHelper args={[200, 200, "#334155", "#1e293b"]} position={[0, 0.01, 0]} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          if (!interactive) return;
          e.stopPropagation();
          onPlaneClick?.(e.point);
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0b1220" roughness={0.9} />
      </mesh>
      {imageUrl && !imageUrl.endsWith(".svg") ? <BlueprintOverlay url={imageUrl} /> : null}
      {blocks.map((block) => (
        <mesh
          key={block.id}
          position={[block.posX, block.posY + block.scaleY / 2, block.posZ]}
          scale={[block.scaleX, block.scaleY, block.scaleZ]}
          castShadow
          onPointerDown={(e) => {
            e.stopPropagation();
            onBlockClick?.(block.id);
          }}
        >
          {block.shape === "CYLINDER" ? (
            <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
          ) : (
            <boxGeometry args={[1, 1, 1]} />
          )}
          <meshStandardMaterial
            color={block.color ?? "#cbd5e1"} // Light gray default
            emissive={block.selected ? "#38bdf8" : (block.color ?? "#cbd5e1")} // Glows blue if selected, otherwise emits its own color
            emissiveIntensity={block.selected ? 1.0 : 0.25} // Slight glow so it's never completely dark
            roughness={0.4}
            metalness={0.1}
            transparent={true}
            opacity={0.85} // Slight transparency looks better for floor plans
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
