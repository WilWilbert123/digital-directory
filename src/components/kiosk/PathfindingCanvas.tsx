"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Html, CameraControls, PerspectiveCamera, Sphere } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import { DirectionLine } from "@/components/3d/DirectionLine";
import { FloorModel, type FloorBlockMesh } from "@/components/3d/FloorModel";
import { HumanAvatar } from "@/components/3d/HumanAvatar";
import type { GraphNode, PathResult } from "@/lib/pathfinding";

export function PathfindingCanvas({
  blocks,
  nodes,
  route,
  imageUrl,
}: {
  blocks: FloorBlockMesh[];
  nodes: GraphNode[];
  route: PathResult | null;
  imageUrl?: string | null;
}) {
  const start = route?.nodes[0];
  const end = route?.nodes.at(-1);

  const markers = useMemo(() => nodes.filter((n) => n.type !== "WALKWAY"), [nodes]);
  
  const cameraControlsRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<"IMMERSIVE" | "TOP">("IMMERSIVE");

  const setView = (mode: "IMMERSIVE" | "TOP") => {
    setViewMode(mode);
    if (!cameraControlsRef.current) return;
    
    if (mode === "TOP") {
      // Look straight down from high up
      cameraControlsRef.current.setLookAt(0, 45, 0.1, 0, 0, 0, true);
    } else {
      // Isometric immersive view
      cameraControlsRef.current.setLookAt(18, 16, 18, 0, 0, 0, true);
    }
  };

  return (
    <div className="h-full min-h-[420px] w-full overflow-hidden rounded-3xl border border-kiosk-border bg-black relative">
      
      {/* View Toggle UI */}
      <div className="absolute top-6 right-6 z-10 flex overflow-hidden rounded-xl border border-slate-700 bg-black/60 shadow-2xl backdrop-blur-md">
        <button
          className={`px-4 py-2 text-sm font-bold tracking-wide transition-colors ${viewMode === "IMMERSIVE" ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}
          onClick={() => setView("IMMERSIVE")}
        >
          3D IMMERSIVE
        </button>
        <button
          className={`px-4 py-2 text-sm font-bold tracking-wide transition-colors ${viewMode === "TOP" ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}
          onClick={() => setView("TOP")}
        >
          TOP VIEW
        </button>
      </div>

      <Canvas shadows gl={{ antialias: true }}>
        <color attach="background" args={["#020617"]} />
        {/* Fog removed so the map doesn't fade to black when zooming out */}
        <PerspectiveCamera makeDefault position={[18, 16, 18]} fov={45} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[12, 20, 8]} intensity={1.4} castShadow />
        <Suspense fallback={<Html center>Loading 3D map…</Html>}>
          <FloorModel blocks={blocks} imageUrl={imageUrl} />
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
          minDistance={5} 
          maxDistance={120} // Allow massive zoom out
          dollySpeed={1.5}
          smoothTime={0.4} // Butter smooth transitions
        />
      </Canvas>
    </div>
  );
}
