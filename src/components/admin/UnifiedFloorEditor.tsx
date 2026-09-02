"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, MapControls, PerspectiveCamera, Sphere, TransformControls, Edges } from "@react-three/drei";
import { Suspense, useMemo, useState, useRef, useEffect } from "react";
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

// 2D Marquee selection overlay
function MarqueeOverlay({ 
  isActive, 
  onSelect 
}: { 
  isActive: boolean; 
  onSelect: (bounds: { minX: number, maxX: number, minY: number, maxY: number }) => void 
}) {
  const [start, setStart] = useState<{ x: number, y: number } | null>(null);
  const [current, setCurrent] = useState<{ x: number, y: number } | null>(null);

  if (!isActive) return null;

  return (
    <div 
      className="absolute inset-0 z-10 cursor-crosshair"
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return;
        setStart({ x: e.clientX, y: e.clientY });
        setCurrent({ x: e.clientX, y: e.clientY });
      }}
      onPointerMove={(e) => {
        if (start) setCurrent({ x: e.clientX, y: e.clientY });
      }}
      onPointerUp={() => {
        if (start && current) {
          const minX = Math.min(start.x, current.x);
          const maxX = Math.max(start.x, current.x);
          const minY = Math.min(start.y, current.y);
          const maxY = Math.max(start.y, current.y);
          if (maxX - minX > 5 && maxY - minY > 5) {
            onSelect({ minX, maxX, minY, maxY });
          }
        }
        setStart(null);
        setCurrent(null);
      }}
    >
      {start && current && (
        <div 
          className="absolute border-2 border-sky-400 bg-sky-500/20 pointer-events-none"
          style={{
            left: Math.min(start.x, current.x),
            top: Math.min(start.y, current.y),
            width: Math.abs(current.x - start.x),
            height: Math.abs(current.y - start.y)
          }}
        />
      )}
    </div>
  );
}

// Helper to project 3D to 2D
function useMarqueeSelectionProjection() {
  const { camera, size } = useThree();
  
  return (worldPos: THREE.Vector3) => {
    const pos = worldPos.clone().project(camera);
    // Convert NDC to screen coords
    const x = (pos.x *  .5 + .5) * size.width;
    const y = (pos.y * -.5 + .5) * size.height;
    return { x, y };
  };
}

// Inner component that actually does the projection logic
function SelectionProjector({ 
  bounds, 
  onProjected 
}: { 
  bounds: { minX: number, maxX: number, minY: number, maxY: number } | null;
  onProjected: (projector: (pos: THREE.Vector3) => { x: number, y: number }) => void;
}) {
  const projector = useMarqueeSelectionProjection();
  
  useEffect(() => {
    if (bounds) {
      onProjected(projector);
    }
  }, [bounds, onProjected, projector]);

  return null;
}

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
  
  const selectedBlockIds = useAdminStore((s) => s.selectedBlockIds);
  const selectedNodeIds = useAdminStore((s) => s.selectedNodeIds);
  const edgeFromId = useAdminStore((s) => s.edgeFromId);
  
  const selectBlock = useAdminStore((s) => s.selectBlock);
  const selectNode = useAdminStore((s) => s.selectNode);
  const setSelection = useAdminStore((s) => s.setSelection);
  const upsertBlock = useAdminStore((s) => s.upsertBlock);
  const upsertNode = useAdminStore((s) => s.upsertNode);
  const moveSelection = useAdminStore((s) => s.moveSelection);
  const addEdge = useAdminStore((s) => s.addEdge);
  const setEdgeFrom = useAdminStore((s) => s.setEdgeFrom);

  const [transformMode, setTransformMode] = useState<"translate" | "scale">("translate");
  const [marqueeBounds, setMarqueeBounds] = useState<{ minX: number, maxX: number, minY: number, maxY: number } | null>(null);

  const meshes = useMemo(
    () =>
      blocks.map((b) => ({
        ...b,
        color: b.tenantId ? tenantColors[b.tenantId] ?? "#64748b" : "#475569",
        selected: selectedBlockIds.includes(b.id),
        label: b.blockName,
      })),
    [blocks, selectedBlockIds, tenantColors]
  );

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Calculate the bounding box center of ALL selected items for the TransformControls
  const selectionBounds = useMemo(() => {
    if (selectedBlockIds.length === 0 && selectedNodeIds.length === 0) return null;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    
    blocks.filter(b => selectedBlockIds.includes(b.id)).forEach(b => {
      minX = Math.min(minX, b.posX - b.scaleX / 2); maxX = Math.max(maxX, b.posX + b.scaleX / 2);
      minZ = Math.min(minZ, b.posZ - b.scaleZ / 2); maxZ = Math.max(maxZ, b.posZ + b.scaleZ / 2);
    });
    
    nodes.filter(n => selectedNodeIds.includes(n.id)).forEach(n => {
      minX = Math.min(minX, n.positionX - 0.5); maxX = Math.max(maxX, n.positionX + 0.5);
      minZ = Math.min(minZ, n.positionZ - 0.5); maxZ = Math.max(maxZ, n.positionZ + 0.5);
    });
    
    if (minX === Infinity) return null;
    return { 
      x: (minX + maxX) / 2, 
      y: 0, 
      z: (minZ + maxZ) / 2,
      width: Math.max(1, maxX - minX + 0.5),
      depth: Math.max(1, maxZ - minZ + 0.5)
    };
  }, [blocks, nodes, selectedBlockIds, selectedNodeIds]);

  const onPlaneClick = (point: THREE.Vector3) => {
    if (tool === "block") {
      const id = crypto.randomUUID();
      upsertBlock({
        id,
        blockName: `BLK-${blocks.length + 1}`,
        posX: Number(point.x.toFixed(2)),
        posY: 0,
        posZ: Number(point.z.toFixed(2)),
        scaleX: 2,
        scaleY: 2,
        scaleZ: 2,
        shape: "BOX",
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
    } else if (tool === "select") {
      // Clicked empty space in select mode, clear selection
      setSelection([], []);
    }
  };

  const onNodeClick = (id: string, append = false) => {
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
    selectNode(id, append);
  };

  const handleMarqueeProjected = (projector: (pos: THREE.Vector3) => { x: number, y: number }) => {
    if (!marqueeBounds) return;
    const { minX, maxX, minY, maxY } = marqueeBounds;
    
    // Account for canvas offset if there is any
    const canvasRect = document.getElementById("admin-canvas-container")?.getBoundingClientRect();
    const offsetX = canvasRect?.left ?? 0;
    const offsetY = canvasRect?.top ?? 0;

    const inside = (pos: THREE.Vector3) => {
      const p = projector(pos);
      // Wait, mouse clientX/clientY is relative to the viewport.
      // And useThree's size.width is the canvas width. 
      // The projector gives us coordinates relative to the TOP-LEFT of the canvas!
      // But start.x and current.x from onPointerDown are clientX, relative to the VIEWPORT!
      // So we MUST subtract offsetX/offsetY from the mouse bounds to make them relative to the canvas,
      // OR add offsetX/offsetY to the projected coordinates.
      const px = p.x + offsetX;
      const py = p.y + offsetY;
      return px >= minX && px <= maxX && py >= minY && py <= maxY;
    };

    const newBlockIds = blocks.filter(b => inside(new THREE.Vector3(b.posX, b.posY, b.posZ))).map(b => b.id);
    const newNodeIds = nodes.filter(n => inside(new THREE.Vector3(n.positionX, n.positionY, n.positionZ))).map(n => n.id);
    
    setSelection(newBlockIds, newNodeIds);
    setMarqueeBounds(null);
  };

  const transformStartRef = useRef<{x: number, y: number, z: number} | null>(null);
  const singleSelectedBlock = selectedBlockIds.length === 1 && selectedNodeIds.length === 0 ? blocks.find(b => b.id === selectedBlockIds[0]) : null;

  return (
    <div id="admin-canvas-container" className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
      
      <MarqueeOverlay isActive={tool === "marquee"} onSelect={setMarqueeBounds} />

      {/* 3D Block Editor Tools Overlay */}
      {(selectedBlockIds.length > 0 || selectedNodeIds.length > 0) && tool === "select" && (
        <div className="absolute top-4 left-4 z-20 flex gap-2 rounded-lg bg-black/50 p-2 backdrop-blur">
          <button 
            className={`px-3 py-1 text-sm rounded ${transformMode === "translate" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300"}`}
            onClick={() => setTransformMode("translate")}
          >
            Move
          </button>
          {singleSelectedBlock && (
            <button 
              className={`px-3 py-1 text-sm rounded ${transformMode === "scale" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"}`}
              onClick={() => setTransformMode("scale")}
            >
              Scale
            </button>
          )}
        </div>
      )}

      <Canvas shadows>
        <color attach="background" args={["#020617"]} />
        <PerspectiveCamera makeDefault position={[16, 22, 16]} fov={50} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 18, 8]} intensity={1.2} castShadow />
        
        {marqueeBounds && <SelectionProjector bounds={marqueeBounds} onProjected={handleMarqueeProjected} />}

        <Suspense fallback={<Html center>Loading Unified Editor…</Html>}>
          {/* Floor & Blocks */}
          <FloorModel
            imageUrl={imageUrl}
            blocks={meshes}
            interactive={tool === "block" || tool === "node" || tool === "select"}
            onBlockClick={(id, append) => {
              if (tool === "select") selectBlock(id, append);
            }}
            onPlaneClick={onPlaneClick}
          />

          {/* Group Transform Controls */}
          {selectionBounds && tool === "select" ? (
            <TransformControls
              mode={transformMode}
              showY={false}
              position={[selectionBounds.x, selectionBounds.y, selectionBounds.z]}
              onMouseDown={(e) => {
                const obj = e?.target?.object;
                if (obj) transformStartRef.current = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
              }}
              onMouseUp={(e) => {
                const obj = e?.target?.object;
                if (!obj || !transformStartRef.current) return;
                
                if (transformMode === "translate") {
                  const dx = obj.position.x - transformStartRef.current.x;
                  const dz = obj.position.z - transformStartRef.current.z;
                  moveSelection(dx, dz);
                  
                  // Reset dummy object back to calculated center to avoid desync
                  obj.position.set(selectionBounds.x, selectionBounds.y, selectionBounds.z);
                  
                } else if (transformMode === "scale" && singleSelectedBlock) {
                  upsertBlock({
                    ...singleSelectedBlock,
                    scaleX: Number((singleSelectedBlock.scaleX * obj.scale.x).toFixed(2)),
                    scaleY: Number(Math.max(0.1, singleSelectedBlock.scaleY * obj.scale.y).toFixed(2)),
                    scaleZ: Number((singleSelectedBlock.scaleZ * obj.scale.z).toFixed(2)),
                  });
                  obj.scale.set(1, 1, 1);
                }
                transformStartRef.current = null;
              }}
            >
              <mesh 
                visible={transformMode === "translate"}
                onPointerDown={(e) => {
                  // Prevent the click from hitting the plane and deselecting
                  e.stopPropagation();
                }}
              >
                <boxGeometry args={[selectionBounds.width, 0.1, selectionBounds.depth]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} depthTest={false} />
                <Edges color="#38bdf8" />
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
            const isSelected = selectedNodeIds.includes(n.id);
            const isEdgeStart = tool === "edge" && edgeFromId === n.id;
            const yPos = 0.4;

            return (
              <group key={n.id} position={[n.positionX, yPos, n.positionZ]} onPointerDown={(ev) => (ev.stopPropagation(), onNodeClick(n.id, ev.shiftKey))}>
                {n.type === "KIOSK_START" ? (
                  <HumanAvatar color={TYPE_COLOR[n.type]} position={[0, -yPos, 0]} />
                ) : (
                  <Sphere args={[isSelected ? 0.35 : 0.22, 16, 16]}>
                    <meshStandardMaterial 
                      color={TYPE_COLOR[n.type]} 
                      emissive={isSelected ? "#ffffff" : TYPE_COLOR[n.type]} 
                      emissiveIntensity={isSelected ? 0.8 : 0.6} 
                    />
                  </Sphere>
                )}
                
                {isEdgeStart && (
                  <Sphere args={[0.4, 16, 16]}>
                    <meshBasicMaterial color="#ffffff" wireframe />
                  </Sphere>
                )}
                <Html center distanceFactor={20} position={[0, n.type === "KIOSK_START" ? 1.0 : 0.5, 0]} style={{ pointerEvents: "none" }}>
                  <span className={`whitespace-nowrap rounded px-1 text-[10px] pointer-events-none ${isSelected ? 'bg-sky-600 text-white font-bold px-2 py-0.5 text-[11px]' : 'bg-black/70 text-white'}`}>
                    {n.nodeName}
                  </span>
                </Html>
              </group>
            );
          })}
        </Suspense>
        
        {/* Disable MapControls when marquee is active so we can drag the selection box */}
        <MapControls makeDefault enabled={tool !== "marquee"} />
      </Canvas>
    </div>
  );
}
