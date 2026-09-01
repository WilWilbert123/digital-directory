"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, TransformControls } from "@react-three/drei";
import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import { FloorModel } from "@/components/3d/FloorModel";
import { useAdminStore } from "@/store/useAdminStore";

export function DynamicBlockEditor({
  imageUrl,
  tenantColors,
}: {
  imageUrl?: string | null;
  tenantColors: Record<string, string>;
}) {
  const tool = useAdminStore((s) => s.tool);
  const blocks = useAdminStore((s) => s.blocks);
  const selectedBlockId = useAdminStore((s) => s.selectedBlockId);
  const selectBlock = useAdminStore((s) => s.selectBlock);
  const upsertBlock = useAdminStore((s) => s.upsertBlock);

  const [transformMode, setTransformMode] = useState<"translate" | "scale">("translate");

  const meshes = useMemo(
    () =>
      blocks.map((b) => ({
        ...b,
        color: b.tenantId ? tenantColors[b.tenantId] ?? "#64748b" : "#475569",
        selected: b.id === selectedBlockId,
        label: b.blockName,
      })),
    [blocks, selectedBlockId, tenantColors],
  );

  const selected = blocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="relative h-[640px] w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
      {selected && tool === "select" && (
        <div className="absolute top-4 left-4 z-10 flex gap-2 rounded-lg bg-black/50 p-2 backdrop-blur">
          <button 
            className={`px-3 py-1 text-sm rounded ${transformMode === "translate" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300"}`}
            onClick={() => setTransformMode("translate")}
          >
            Move
          </button>
          <button 
            className={`px-3 py-1 text-sm rounded ${transformMode === "scale" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"}`}
            onClick={() => setTransformMode("scale")}
          >
            Scale
          </button>
        </div>
      )}
      <Canvas shadows>
        <color attach="background" args={["#020617"]} />
        <PerspectiveCamera makeDefault position={[16, 14, 16]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 18, 8]} intensity={1.2} />
        <Suspense fallback={null}>
          <FloorModel
            imageUrl={imageUrl}
            blocks={meshes}
            interactive={tool === "block"}
            onBlockClick={(id) => {
              selectBlock(id);
            }}
            onPlaneClick={(point) => {
              if (tool !== "block") return;
              const id = crypto.randomUUID();
              upsertBlock({
                id,
                blockName: `BLK-${blocks.length + 1}`,
                posX: Number(point.x.toFixed(2)),
                posY: 0,
                posZ: Number(point.z.toFixed(2)),
                scaleX: 8,
                scaleY: 4,
                scaleZ: 8,
                tenantId: null,
              });
              selectBlock(id);
            }}
          />
          {selected && tool === "select" ? (
            <TransformControls
              mode={transformMode}
              position={[selected.posX, selected.posY + selected.scaleY / 2, selected.posZ]}
              scale={[1, 1, 1]} // We reset scale of transform node itself so gizmo scales geometry properly
              onMouseUp={(e) => {
                const obj = (e?.target as unknown as { object?: THREE.Object3D })?.object;
                if (!obj) return;
                
                if (transformMode === "translate") {
                  upsertBlock({
                    ...selected,
                    posX: Number(obj.position.x.toFixed(2)),
                    posY: Number(Math.max(0, obj.position.y - selected.scaleY / 2).toFixed(2)),
                    posZ: Number(obj.position.z.toFixed(2)),
                  });
                } else if (transformMode === "scale") {
                  // When scaling, TransformControls modifies the object's scale
                  // We need to apply this scale to the original dimensions
                  upsertBlock({
                    ...selected,
                    scaleX: Number((selected.scaleX * obj.scale.x).toFixed(2)),
                    scaleY: Number(Math.max(0.1, selected.scaleY * obj.scale.y).toFixed(2)),
                    scaleZ: Number((selected.scaleZ * obj.scale.z).toFixed(2)),
                  });
                  // Reset object scale back to 1, since we store actual dimensions in state
                  obj.scale.set(1, 1, 1);
                }
              }}
            >
              <mesh visible={false}>
                <boxGeometry args={[selected.scaleX, selected.scaleY, selected.scaleZ]} />
              </mesh>
            </TransformControls>
          ) : null}
        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
