"use client";

import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls, PerspectiveCamera, Sphere, TransformControls } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useAdminStore, type DraftNode } from "@/store/useAdminStore";

const TYPE_COLOR: Record<DraftNode["type"], string> = {
  WALKWAY: "#94a3b8",
  TENANT_ENTRANCE: "#f59e0b",
  ELEVATOR: "#38bdf8",
  ESCALATOR: "#a78bfa",
  STAIRS: "#fb7185",
  KIOSK_START: "#22c55e",
};

export function NodeGraphDrawer() {
  const tool = useAdminStore((s) => s.tool);
  const nodes = useAdminStore((s) => s.nodes);
  const edges = useAdminStore((s) => s.edges);
  const selectedNodeIds = useAdminStore((s) => s.selectedNodeIds);
  const edgeFromId = useAdminStore((s) => s.edgeFromId);
  const selectNode = useAdminStore((s) => s.selectNode);
  const upsertNode = useAdminStore((s) => s.upsertNode);
  const addEdge = useAdminStore((s) => s.addEdge);
  const setEdgeFrom = useAdminStore((s) => s.setEdgeFrom);

  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const selected = nodes.find((n) => n.id === selectedNodeId);

  const onPlane = (e: ThreeEvent<PointerEvent>) => {
    if (tool !== "node") return;
    e.stopPropagation();
    const id = crypto.randomUUID();
    upsertNode({
      id,
      nodeName: `N${nodes.length + 1}`,
      type: "WALKWAY",
      positionX: Number(e.point.x.toFixed(2)),
      positionY: 0.2,
      positionZ: Number(e.point.z.toFixed(2)),
    });
    selectNode(id);
  };

  const onNode = (id: string) => {
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
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
      <Canvas>
        <color attach="background" args={["#020617"]} />
        <PerspectiveCamera makeDefault position={[0, 22, 0.1]} />
        <ambientLight intensity={0.8} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={onPlane}>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#0b1220" />
        </mesh>
        <gridHelper args={[40, 40, "#334155", "#1e293b"]} />
        {edges.map((e) => {
          const a = nodeMap.get(e.fromNodeId);
          const b = nodeMap.get(e.toNodeId);
          if (!a || !b) return null;
          return (
            <Line
              key={e.id}
              points={[
                [a.positionX, 0.3, a.positionZ],
                [b.positionX, 0.3, b.positionZ],
              ]}
              color={e.isAccessible ? "#38bdf8" : "#64748b"}
              lineWidth={2}
            />
          );
        })}
        {nodes.map((n) => {
          if (n.id === selectedNodeId && tool === "select") return null; // We render the selected one inside TransformControls
          
          const isEdgeStart = tool === "edge" && edgeFromId === n.id;

          return (
            <group key={n.id} position={[n.positionX, 0.3, n.positionZ]} onPointerDown={(ev) => (ev.stopPropagation(), onNode(n.id))}>
              <Sphere args={[0.22, 16, 16]}>
                <meshStandardMaterial color={TYPE_COLOR[n.type]} emissive={TYPE_COLOR[n.type]} emissiveIntensity={0.4} />
              </Sphere>
              {isEdgeStart && (
                <Sphere args={[0.4, 16, 16]}>
                   <meshBasicMaterial color="#ffffff" wireframe />
                </Sphere>
              )}
              <Html center distanceFactor={20} position={[0, 0.5, 0]} style={{ pointerEvents: "none" }}>
                <span className="rounded bg-black/70 px-1 text-[10px] text-white pointer-events-none">{n.nodeName}</span>
              </Html>
            </group>
          );
        })}
        
        {/* Render selected node with drag controls if in select mode */}
        {selected && tool === "select" ? (
          <TransformControls
            mode="translate"
            showY={false} // Only allow moving on X and Z axis in this 2D view
            position={[selected.positionX, 0.3, selected.positionZ]}
            onMouseUp={(e) => {
              const obj = (e?.target as unknown as { object?: THREE.Object3D })?.object;
              if (!obj) return;
              upsertNode({
                ...selected,
                positionX: Number(obj.position.x.toFixed(2)),
                positionZ: Number(obj.position.z.toFixed(2)),
              });
            }}
          >
            <group>
              <Sphere args={[0.32, 16, 16]}>
                <meshStandardMaterial color={TYPE_COLOR[selected.type]} emissive={TYPE_COLOR[selected.type]} emissiveIntensity={0.8} />
              </Sphere>
              <Html center distanceFactor={20} position={[0, 0.6, 0]} style={{ pointerEvents: "none" }}>
                <span className="rounded bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white pointer-events-none">{selected.nodeName}</span>
              </Html>
            </group>
          </TransformControls>
        ) : null}
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
