"use client";

import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls, PerspectiveCamera, Sphere, TransformControls } from "@react-three/drei";
import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import { FloorModel } from "@/components/3d/FloorModel";
import { HumanAvatar } from "@/components/3d/HumanAvatar";
import { useAdminStore, type DraftNode } from "@/store/useAdminStore";

const TYPE_COLOR: Record<DraftNode["type"], string> = {
  WALKWAY: "#94a3b8",
  TENANT_ENTRANCE: "#f59e0b",
  ELEVATOR: "#38bdf8",
  ESCALATOR: "#a78bfa",
  STAIRS: "#fb7185",
  KIOSK_START: "#22c55e",
};

export function UnifiedFloorEditor({
  imageUrl,
  tenantColors,
}: {
  imageUrl?: string | null;
  tenantColors: Record<string, string>;
}) {
  const tool = useAdminStore((s) => s.tool);
  const blocks = useAdminStore((s) => s.blocks);
  const nodes = useAdminStore((s) => s.nodes);
  const edges = useAdminStore((s) => s.edges);
  
  const selectedBlockId = useAdminStore((s) => s.selectedBlockId);
  const selectedNodeId = useAdminStore((s) => s.selectedNodeId);
  const edgeFromId = useAdminStore((s) => s.edgeFromId);
  
  const selectBlock = useAdminStore((s) => s.selectBlock);
  const selectNode = useAdminStore((s) => s.selectNode);
  const upsertBlock = useAdminStore((s) => s.upsertBlock);
  const upsertNode = useAdminStore((s) => s.upsertNode);
  const addEdge = useAdminStore((s) => s.addEdge);
  const setEdgeFrom = useAdminStore((s) => s.setEdgeFrom);

  const [transformMode, setTransformMode] = useState<"translate" | "scale">("translate");

  const meshes = useMemo(
    () =>
      blocks.map((b) => ({
        ...b,
        color: b.tenantId ? tenantColors[b.tenantId] ?? "#64748b" : "#475569",
        selected: b.id === selectedBlockId,
        label: b.blockName,
      })),
    [blocks, selectedBlockId, tenantColors]
  );

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const onPlaneClick = (point: THREE.Vector3) => {
    if (tool === "block") {
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
    } else if (tool === "node") {
      const id = crypto.randomUUID();
      upsertNode({
        id,
        nodeName: `N${nodes.length + 1}`,
        type: "WALKWAY",
        positionX: Number(point.x.toFixed(2)),
        positionY: 0.2,
        positionZ: Number(point.z.toFixed(2)),
      });
      selectNode(id);
    }
  };

  const onNodeClick = (id: string) => {
    if (tool === "edge") {
      if (!edgeFromId) {
        setEdgeFrom(id);
        selectNode(id);
        return;
      }
      if (edgeFromId !== id) {
        addEdge({
          id: crypto.randomUUID(),
          fromNodeId: edgeFromId,
          toNodeId: id,
          weight: 1,
          isAccessible: true,
        });
      }
      return;
    }
    selectNode(id);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
      {/* 3D Block Editor Tools Overlay */}
      {selectedBlock && tool === "select" && (
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
        <PerspectiveCamera makeDefault position={[16, 22, 16]} fov={50} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 18, 8]} intensity={1.2} castShadow />
        
        <Suspense fallback={<Html center>Loading Unified Editor…</Html>}>
          {/* Floor & Blocks */}
          <FloorModel
            imageUrl={imageUrl}
            blocks={meshes}
            interactive={tool === "block" || tool === "node"}
            onBlockClick={(id) => {
              if (tool === "select") selectBlock(id);
            }}
            onPlaneClick={onPlaneClick}
          />

          {/* Block Transform Controls */}
          {selectedBlock && tool === "select" ? (
            <TransformControls
              mode={transformMode}
              position={[selectedBlock.posX, selectedBlock.posY + selectedBlock.scaleY / 2, selectedBlock.posZ]}
              scale={[1, 1, 1]}
              onMouseUp={(e) => {
                const obj = (e?.target as unknown as { object?: THREE.Object3D })?.object;
                if (!obj) return;
                
                if (transformMode === "translate") {
                  upsertBlock({
                    ...selectedBlock,
                    posX: Number(obj.position.x.toFixed(2)),
                    posY: Number(Math.max(0, obj.position.y - selectedBlock.scaleY / 2).toFixed(2)),
                    posZ: Number(obj.position.z.toFixed(2)),
                  });
                } else if (transformMode === "scale") {
                  upsertBlock({
                    ...selectedBlock,
                    scaleX: Number((selectedBlock.scaleX * obj.scale.x).toFixed(2)),
                    scaleY: Number(Math.max(0.1, selectedBlock.scaleY * obj.scale.y).toFixed(2)),
                    scaleZ: Number((selectedBlock.scaleZ * obj.scale.z).toFixed(2)),
                  });
                  obj.scale.set(1, 1, 1);
                }
              }}
            >
              <mesh visible={false}>
                <boxGeometry args={[selectedBlock.scaleX, selectedBlock.scaleY, selectedBlock.scaleZ]} />
              </mesh>
            </TransformControls>
          ) : null}

          {/* Pathfinding Edges */}
          {edges.map((e) => {
            const a = nodeMap.get(e.fromNodeId);
            const b = nodeMap.get(e.toNodeId);
            if (!a || !b) return null;
            return (
              <Line
                key={e.id}
                points={[
                  [a.positionX, 0.4, a.positionZ],
                  [b.positionX, 0.4, b.positionZ],
                ]}
                color={e.isAccessible ? "#38bdf8" : "#64748b"}
                lineWidth={3}
                transparent
                opacity={0.8}
              />
            );
          })}

          {/* Pathfinding Nodes */}
          {nodes.map((n) => {
            // Render selected node inside TransformControls instead if in select mode
            if (n.id === selectedNodeId && tool === "select") return null;
            
            const isEdgeStart = tool === "edge" && edgeFromId === n.id;
            // Float slightly higher than the floor
            const yPos = 0.4;

            return (
              <group key={n.id} position={[n.positionX, yPos, n.positionZ]} onPointerDown={(ev) => (ev.stopPropagation(), onNodeClick(n.id))}>
                {n.type === "KIOSK_START" ? (
                  <HumanAvatar color={TYPE_COLOR[n.type]} position={[0, -yPos, 0]} />
                ) : (
                  <Sphere args={[0.22, 16, 16]}>
                    <meshStandardMaterial color={TYPE_COLOR[n.type]} emissive={TYPE_COLOR[n.type]} emissiveIntensity={0.6} />
                  </Sphere>
                )}
                
                {isEdgeStart && (
                  <Sphere args={[0.4, 16, 16]}>
                    <meshBasicMaterial color="#ffffff" wireframe />
                  </Sphere>
                )}
                <Html center distanceFactor={20} position={[0, n.type === "KIOSK_START" ? 1.0 : 0.5, 0]} style={{ pointerEvents: "none" }}>
                  <span className="whitespace-nowrap rounded bg-black/70 px-1 text-[10px] text-white pointer-events-none">{n.nodeName}</span>
                </Html>
              </group>
            );
          })}

          {/* Node Transform Controls */}
          {selectedNode && tool === "select" ? (
            <TransformControls
              mode="translate"
              showY={false}
              position={[selectedNode.positionX, 0.4, selectedNode.positionZ]}
              onMouseUp={(e) => {
                const obj = (e?.target as unknown as { object?: THREE.Object3D })?.object;
                if (!obj) return;
                upsertNode({
                  ...selectedNode,
                  positionX: Number(obj.position.x.toFixed(2)),
                  positionZ: Number(obj.position.z.toFixed(2)),
                });
              }}
            >
              <group>
                {selectedNode.type === "KIOSK_START" ? (
                  <HumanAvatar color={TYPE_COLOR[selectedNode.type]} position={[0, -0.4, 0]} />
                ) : (
                  <Sphere args={[0.32, 16, 16]}>
                    <meshStandardMaterial color={TYPE_COLOR[selectedNode.type]} emissive={TYPE_COLOR[selectedNode.type]} emissiveIntensity={1.0} />
                  </Sphere>
                )}
                <Html center distanceFactor={20} position={[0, selectedNode.type === "KIOSK_START" ? 1.0 : 0.6, 0]} style={{ pointerEvents: "none" }}>
                  <span className="whitespace-nowrap rounded bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white pointer-events-none">{selectedNode.nodeName}</span>
                </Html>
              </group>
            </TransformControls>
          ) : null}

        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
