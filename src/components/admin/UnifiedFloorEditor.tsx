"use client";



import { Suspense, useMemo, useState, useRef, useCallback, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera, MapControls, Html, Edges, Line, Sphere } from "@react-three/drei";
import { FloorModel } from "@/components/3d/FloorModel";
import { HumanAvatar } from "@/components/3d/HumanAvatar";
import { useAdminStore, type DraftNode } from "@/store/useAdminStore";

function DragListener({ isDragging, onFloorPointerMove }: { isDragging: boolean; onFloorPointerMove: (point: THREE.Vector3) => void; }) {
  const { gl, camera } = useThree();
  useEffect(() => {
    if (!isDragging) return;
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const handleMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersect);
      onFloorPointerMove(intersect);
    };
    window.addEventListener('pointermove', handleMove);
    return () => window.removeEventListener('pointermove', handleMove);
  }, [isDragging, onFloorPointerMove, gl, camera]);
  return null;
}

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
  const [isDraggingTransform, setIsDraggingTransform] = useState(false);
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

    if (selectedBlockIds.length === 1 && selectedNodeIds.length === 0) {
      const b = blocks.find((blk) => blk.id === selectedBlockIds[0]);
      if (b) {
        return {
          x: b.posX,
          y: b.posY + b.scaleY / 2,
          z: b.posZ,
          width: b.scaleX,
          height: b.scaleY,
          depth: b.scaleZ,
        };
      }
    }

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
      y: 0.1, 
      z: (minZ + maxZ) / 2,
      width: Math.max(1, maxX - minX + 0.5),
      height: 0.2,
      depth: Math.max(1, maxZ - minZ + 0.5)
    };
  }, [blocks, nodes, selectedBlockIds, selectedNodeIds]);

  const transformRef = useRef<any>(null);
  const singleSelectedBlock = selectedBlockIds.length === 1 && selectedNodeIds.length === 0
    ? blocks.find(b => b.id === selectedBlockIds[0]) ?? null
    : null;

  // ─── DRAG STATE ────────────────────────────────────────────────────────────
  // Store everything in refs so drag handlers never get stale closures and
  // never cause re-renders that would interrupt the pointer capture.
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  // Offset from block center to where the pointer hit the block surface (XZ plane)
  const dragOffsetRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  // Starting positions of all selected blocks at drag start
  const dragBaseRef = useRef<{ id: string; posX: number; posZ: number }[]>([]);

  /** Called when user presses down on a block mesh */
  const onBlockPointerDown = useCallback((blockId: string, hitPoint: THREE.Vector3, shiftKey: boolean) => {
    if (tool !== "select") return;
    // Select the block first
    selectBlock(blockId, shiftKey);
    if (shiftKey) return; // multi-select, don't start drag

    // Record offset from block center to hit point in XZ
    const block = useAdminStore.getState().blocks.find(b => b.id === blockId);
    if (!block) return;
    dragOffsetRef.current = { x: hitPoint.x - block.posX, z: hitPoint.z - block.posZ };

    // Snapshot starting positions of all selected blocks (includes the one we just selected)
    const state = useAdminStore.getState();
    const selectedIds = state.selectedBlockIds.includes(blockId)
      ? state.selectedBlockIds
      : [...state.selectedBlockIds, blockId];

    dragBaseRef.current = state.blocks
      .filter(b => selectedIds.includes(b.id))
      .map(b => ({ id: b.id, posX: b.posX, posZ: b.posZ }));

    isDraggingRef.current = true;
    setIsDragging(true);
  }, [tool, selectBlock]);

  /** Called on every pointer move over the floor plane */
  const onFloorPointerMove = useCallback((point: THREE.Vector3) => {
    if (!isDraggingRef.current || dragBaseRef.current.length === 0) return;

    // The primary block (first in list) follows cursor minus offset
    const primaryBase = dragBaseRef.current[0];
    const targetX = point.x - dragOffsetRef.current.x;
    const targetZ = point.z - dragOffsetRef.current.z;
    const dxFromBase = targetX - primaryBase.posX;
    const dzFromBase = targetZ - primaryBase.posZ;

    useAdminStore.setState(s => ({
      blocks: s.blocks.map(b => {
        const base = dragBaseRef.current.find(i => i.id === b.id);
        if (!base) return b;
        return {
          ...b,
          posX: Number((base.posX + dxFromBase).toFixed(2)),
          posZ: Number((base.posZ + dzFromBase).toFixed(2)),
        };
      }),
      dirty: true,
    }));
  }, []);

  /** Called when pointer is released anywhere */
  const onPointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    dragBaseRef.current = [];
    useAdminStore.getState().commitHistory();
  }, []);

  // Global mouseup so releasing outside the canvas also ends the drag
  useEffect(() => {
    window.addEventListener("pointerup", onPointerUp);
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerUp]);

  const onPlaneClick = (point: THREE.Vector3) => {
    if (isDraggingRef.current) return; // ignore clicks that were actually drags
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
      setSelection([], []);
    }
  };

  const onNodeClick = (id: string, append = false) => {
    if (tool === "edge") {
      if (!edgeFromId) { setEdgeFrom(id); selectNode(id); return; }
      if (edgeFromId !== id) {
        addEdge({ id: crypto.randomUUID(), fromNodeId: edgeFromId, toNodeId: id, weight: 1, isAccessible: true });
      }
      return;
    }
    selectNode(id, append);
  };

  const handleMarqueeProjected = (projector: (pos: THREE.Vector3) => { x: number, y: number }) => {
    if (!marqueeBounds) return;
    const { minX, maxX, minY, maxY } = marqueeBounds;
    const canvasRect = document.getElementById("admin-canvas-container")?.getBoundingClientRect();
    const offsetX = canvasRect?.left ?? 0;
    const offsetY = canvasRect?.top ?? 0;
    const inside = (pos: THREE.Vector3) => {
      const p = projector(pos);
      return (p.x + offsetX) >= minX && (p.x + offsetX) <= maxX && (p.y + offsetY) >= minY && (p.y + offsetY) <= maxY;
    };
    setSelection(
      blocks.filter(b => inside(new THREE.Vector3(b.posX, b.posY, b.posZ))).map(b => b.id),
      nodes.filter(n => inside(new THREE.Vector3(n.positionX, n.positionY, n.positionZ))).map(n => n.id)
    );
    setMarqueeBounds(null);
  };

  return (
    <div id="admin-canvas-container" className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
      
      <MarqueeOverlay isActive={tool === "marquee"} onSelect={setMarqueeBounds} />

      <Canvas shadows>
        <color attach="background" args={["#020617"]} />
        <PerspectiveCamera makeDefault position={[16, 22, 16]} fov={50} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 18, 8]} intensity={1.2} castShadow />
        
        {marqueeBounds && <SelectionProjector bounds={marqueeBounds} onProjected={handleMarqueeProjected} />}

        <Suspense fallback={<Html center>Loading Unified Editor…</Html>}>
          <FloorModel
            imageUrl={imageUrl}
            blocks={meshes}
            interactive={tool === "block" || tool === "node" || tool === "select"}
            onBlockClick={(id, append) => { if (tool === "select" && !isDragging) selectBlock(id, append); }}
            onBlockPointerDown={tool === "select" ? onBlockPointerDown : undefined}
            onPlaneClick={onPlaneClick}
          />
          <DragListener isDragging={isDragging} onFloorPointerMove={onFloorPointerMove} />

          {/* Drag capture plane — covers the full floor at Y=0.
              Uses depthTest=false and renderOrder=999 so it's always "on top" for raycasting.
              This ensures pointer-move events fire at the correct floor-level XZ coordinates
              even when the pointer is over a block mesh. */}
          {isDragging && (
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.05, 0]}
              renderOrder={999}
              onPointerMove={(e) => {
                e.stopPropagation();
                onFloorPointerMove(e.point);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onPointerUp();
              }}
            >
              <planeGeometry args={[2000, 2000]} />
              <meshBasicMaterial transparent opacity={0} depthTest={false} depthWrite={false} />
            </mesh>
          )}

          {/* Selection outline — purely visual, shows where block is */}
          {selectionBounds && tool === "select" && (
            <mesh
              position={[selectionBounds.x, selectionBounds.y, selectionBounds.z]}
              raycast={() => null}
            >
              <boxGeometry args={[selectionBounds.width + 0.1, selectionBounds.height + 0.05, selectionBounds.depth + 0.1]} />
              <meshBasicMaterial color={isDragging ? "#f97316" : "#38bdf8"} transparent opacity={isDragging ? 0.2 : 0.1} depthTest={false} />
              <Edges color={isDragging ? "#f97316" : "#38bdf8"} linewidth={isDragging ? 3 : 2} />
            </mesh>
          )}

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
        
        {/* Disable MapControls when dragging blocks or doing marquee */}
        <MapControls makeDefault enabled={tool !== "marquee" && !isDragging} />
      </Canvas>

      {/* Drag cursor overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 cursor-grabbing" onPointerUp={onPointerUp} />
      )}

      {/* Move/Scale mode buttons (shown when blocks or nodes selected) */}
      {(selectedBlockIds.length > 0 || selectedNodeIds.length > 0) && tool === "select" && (
        <div className="absolute top-4 left-4 z-20 flex gap-2 rounded-lg bg-black/50 p-2 backdrop-blur pointer-events-auto">
          <span className="px-3 py-1 text-sm rounded bg-sky-600/30 border border-sky-600/50 text-sky-300 font-semibold">
            {isDragging ? "🟠 Dragging…" : "🔵 Drag block to move"}
          </span>
        </div>
      )}
    </div>
  );
}
