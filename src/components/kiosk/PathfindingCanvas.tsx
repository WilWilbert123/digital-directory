"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Html, CameraControls, PerspectiveCamera, Sphere } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import { DirectionLine } from "@/components/3d/DirectionLine";
import { FloorModel, type FloorBlockMesh } from "@/components/3d/FloorModel";
import { HumanAvatar } from "@/components/3d/HumanAvatar";
import type { GraphNode, PathResult } from "@/lib/pathfinding";

export function PathfindingCanvas({
  blocks,
  nodes,
  route,
  imageUrl,
  targetLevel,
}: {
  blocks: FloorBlockMesh[];
  nodes: GraphNode[];
  route: PathResult | null;
  imageUrl?: string | null;
  targetLevel?: number;
}) {
  const start = route?.nodes[0];
  const end = route?.nodes.at(-1);

  const markers = useMemo(() => {
    return nodes.filter((n) => {
       if (n.type === "WALKWAY") return false;
       // Only show markers on floors up to the target level
       const nodeLevel = Math.round(n.position.y / 8) + 1;
       return nodeLevel <= (targetLevel ?? 1);
    });
  }, [nodes, targetLevel]);
  
  const cameraControlsRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<"IMMERSIVE" | "TOP">("TOP");

  useEffect(() => {
    if (!cameraControlsRef.current) return;
    
    const avgY = route?.nodes?.length 
      ? route.nodes.reduce((acc, n) => acc + n.position.y, 0) / route.nodes.length 
      : 0;
      
    if (viewMode === "TOP") {
      // Look straight down from high up, centered on the active floor
      cameraControlsRef.current.setLookAt(0, 75 + avgY, 0.1, 0, avgY, 0, true);
    } else {
      // Angled top-down immersive view, centered on the active floor
      cameraControlsRef.current.setLookAt(0, 40 + avgY, 45, 0, avgY, 0, true);
    }
  }, [viewMode, route]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
      
      {/* View Toggle UI */}
      <div className="absolute top-24 right-6 z-10 flex overflow-hidden rounded-xl border border-slate-700 bg-black/60 shadow-2xl backdrop-blur-md">
        <button
          className={`px-4 py-2 text-sm font-bold tracking-wide transition-colors ${viewMode === "IMMERSIVE" ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}
          onClick={() => setViewMode("IMMERSIVE")}
        >
          3D IMMERSIVE
        </button>
        <button
          className={`px-4 py-2 text-sm font-bold tracking-wide transition-colors ${viewMode === "TOP" ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}
          onClick={() => setViewMode("TOP")}
        >
          TOP VIEW
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-40 right-6 z-10 flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-black/60 shadow-2xl backdrop-blur-md">
        <button
          className="p-3 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-700"
          onClick={() => cameraControlsRef.current?.dolly(15, true)}
        >
          <Plus size={20} />
        </button>
        <button
          className="p-3 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          onClick={() => cameraControlsRef.current?.dolly(-15, true)}
        >
          <Minus size={20} />
        </button>
      </div>

      <Canvas shadows gl={{ antialias: true }}>
        <color attach="background" args={["#020617"]} />
        <PerspectiveCamera makeDefault position={[0, 65, 0.1]} fov={45} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[12, 20, 8]} intensity={1.4} castShadow />
        <Suspense fallback={<Html center>Loading 3D map…</Html>}>
          <FloorModel blocks={blocks} imageUrl={imageUrl} targetLevel={targetLevel ?? 1} />
          {markers.map((n) => (
            n.type === "KIOSK_START" ? (
              <HumanAvatar key={n.id} position={[n.position.x, 0, n.position.z]} color="#22c55e" />
            ) : (
              <Sphere key={n.id} args={[0.09, 16, 16]} position={[n.position.x, n.position.y + 0.2, n.position.z]}>
                <meshStandardMaterial
                  color={n.type === "TENANT_ENTRANCE" ? "#f59e0b" : "#38bdf8"}
                  emissive="#ffffff"
                  emissiveIntensity={0.15}
                />
              </Sphere>
            )
          ))}
          {route?.found ? <DirectionLine points={route.polyline} /> : null}
          {end ? (
            <Html position={[end.position.x, end.position.y + 1.5, end.position.z]} center style={{ pointerEvents: "none" }}>
              <div className="flex flex-col items-center justify-center animate-bounce drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 6 12 14 20 6"></polyline>
                  <polyline points="4 14 12 22 20 14"></polyline>
                </svg>
              </div>
            </Html>
          ) : null}
          <Environment preset="city" />
        </Suspense>
        
        <CameraControls 
          ref={cameraControlsRef}
          maxPolarAngle={Math.PI / 2.05} // Prevent going below ground
          minDistance={20} 
          maxDistance={120}
          dollySpeed={1}
          mouseButtons={{ left: 1, middle: 0, right: 0, wheel: 16 }} // 1=rotate, 16=zoom
          touches={{ one: 1, two: 512, three: 0 }} // 1=rotate, 512=touch_zoom
          smoothTime={0.4} // Butter smooth transitions
        />
      </Canvas>
    </div>
  );
}
