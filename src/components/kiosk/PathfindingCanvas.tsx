"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Html, CameraControls, PerspectiveCamera, Sphere } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import { DirectionLine } from "@/components/3d/DirectionLine";
import { FloorModel, type FloorBlockMesh } from "@/components/3d/FloorModel";
import { HumanAvatar } from "@/components/3d/HumanAvatar";
import type { GraphNode, PathResult } from "@/lib/pathfinding";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

function TourGuide({
  route,
  isPlayingAnimation,
  onLevelChange,
  onComplete,
  cameraControlsRef,
}: {
  route: PathResult | null;
  isPlayingAnimation: boolean;
  onLevelChange: (level: number) => void;
  onComplete: () => void;
  cameraControlsRef: React.MutableRefObject<any>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const lastLevelRef = useRef<number | null>(null);

  const totalDistance = useMemo(() => {
    if (!route) return 0;
    let dist = 0;
    for (let i = 0; i < route.polyline.length - 1; i++) {
       const p1 = route.polyline[i];
       const p2 = route.polyline[i+1];
       dist += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2));
    }
    return dist;
  }, [route]);

  useEffect(() => {
    if (!isPlayingAnimation) {
      progressRef.current = 0;
      lastLevelRef.current = null;
    }
  }, [isPlayingAnimation]);

  useFrame((state, delta) => {
    if (!isPlayingAnimation || !route?.found || !groupRef.current) return;

    let ridingEscalator = false;
    let probeDistance = 0;
    for (let i = 0; i < route.polyline.length - 1; i++) {
      const p1 = route.polyline[i];
      const p2 = route.polyline[i + 1];
      const segmentDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
      if (progressRef.current <= probeDistance + segmentDistance) {
        ridingEscalator = Math.abs(p2.y - p1.y) > 0.1;
        break;
      }
      probeDistance += segmentDistance;
    }

    const speed = 4.5;
    progressRef.current += speed * delta;
    
    let currentDist = 0;
    let point = new THREE.Vector3();
    let lookTarget = new THREE.Vector3();
    let found = false;

    for (let i = 0; i < route.polyline.length - 1; i++) {
       const p1 = new THREE.Vector3(route.polyline[i].x, route.polyline[i].y, route.polyline[i].z);
       const p2 = new THREE.Vector3(route.polyline[i+1].x, route.polyline[i+1].y, route.polyline[i+1].z);
       const segDist = p1.distanceTo(p2);
       
       if (progressRef.current <= currentDist + segDist) {
          const t = (progressRef.current - currentDist) / segDist;
         ridingEscalator = Math.abs(p2.y - p1.y) > 0.1;
          // Keep the ride smooth, but ease into and out of the escalator incline.
          const travelT = ridingEscalator ? t * t * (3 - 2 * t) : t;
          const nextT = ridingEscalator ? Math.min(1, travelT + 0.08) : 1;
         point.lerpVectors(p1, p2, travelT);
         lookTarget.lerpVectors(p1, p2, nextT);
          
          found = true;
          break;
       }
       currentDist += segDist;
    }

    if (!found) {
       const lastP = route.polyline[route.polyline.length - 1];
       point.set(lastP.x, lastP.y, lastP.z);
       lookTarget.copy(point);
       if (progressRef.current > totalDistance) {
         onComplete();
         progressRef.current = 0;
       }
    }

    groupRef.current.position.copy(point);
    if (found && lookTarget.distanceTo(point) > 0.01) {
      // Follow the incline while riding between floors; walk level after arriving.
      groupRef.current.lookAt(ridingEscalator ? lookTarget : new THREE.Vector3(lookTarget.x, point.y, lookTarget.z));
    }
    
    // Determine the current floor based on the START node of the current segment.
    // This prevents the floor from switching early if the escalator segment is drawn over a long distance.
    const currentLevel = Math.round(point.y / 8) + 1;
    if (currentLevel !== lastLevelRef.current) {
       lastLevelRef.current = currentLevel;
       onLevelChange(currentLevel);
    }
  });

  if (!isPlayingAnimation) return null;

  return (
    <group ref={groupRef}>
      <HumanAvatar position={[0, 0, 0]} color="#f43f5e" isWalking={true} />
      <pointLight color="#f43f5e" intensity={1.5} distance={12} position={[0, 3, 0]} />
    </group>
  );
}

export function PathfindingCanvas({
  blocks,
  nodes,
  route,
  imageUrl,
  isPlayingAnimation = false,
  onAnimationComplete,
}: {
  blocks: FloorBlockMesh[];
  nodes: GraphNode[];
  route: PathResult | null;
  imageUrl?: string | null;
  isPlayingAnimation?: boolean;
  onAnimationComplete?: () => void;
}) {
  const end = route?.nodes.at(-1);

  const [activeLevel, setActiveLevel] = useState<number>(1);

  // Reset to the start node's floor when a new route is searched
  useEffect(() => {
    if (route?.found && route.nodes.length > 0) {
      const startLevel = Math.round(route.nodes[0].position.y / 8) + 1;
      setActiveLevel(startLevel);
    } else {
      setActiveLevel(1);
    }
  }, [route]);

  const markers = useMemo(() => {
    return nodes.filter((n) => {
       if (n.type === "WALKWAY") return false;
       const nodeLevel = Math.round(n.position.y / 8) + 1;
       return nodeLevel === activeLevel;
    });
  }, [nodes, activeLevel]);

  const displayPolyline = useMemo(() => {
    if (!route?.found) return [];
    
    // Only show the path for the currently active floor
    const levelNodes = route.nodes.filter(n => {
       const nodeLevel = Math.round(n.position.y / 8) + 1;
       return nodeLevel === activeLevel;
    });
    
    // Connect to the escalator/elevator if it transitions
    if (levelNodes.length > 0) {
       const lastLevelNode = levelNodes[levelNodes.length - 1];
       const nextIndex = route.nodes.indexOf(lastLevelNode) + 1;
       if (nextIndex < route.nodes.length) {
          levelNodes.push(route.nodes[nextIndex]);
       }
    }

    return levelNodes.map(n => {
        return new THREE.Vector3(n.position.x, n.position.y, n.position.z);
    });
      }, [route, activeLevel]);
  
  const cameraControlsRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<"IMMERSIVE" | "TOP">("IMMERSIVE");

  const lastViewConfig = useRef({ viewMode: "IMMERSIVE", hasRoute: false });

  useEffect(() => {
    if (!cameraControlsRef.current) return;
    
    let focusNodes = route?.nodes || [];
    
    if (route?.nodes) {
       focusNodes = route.nodes.filter(n => Math.round(n.position.y / 8) + 1 === activeLevel);
    }
    
    let avgY = (activeLevel - 1) * 8; // Default to floor height
    if (focusNodes.length > 0) {
      avgY = focusNodes.reduce((acc, n) => acc + n.position.y, 0) / focusNodes.length;
    }
      
    const configChanged = lastViewConfig.current.viewMode !== viewMode ||
                          lastViewConfig.current.hasRoute !== !!route;

    if (viewMode === "TOP") {
      cameraControlsRef.current.setLookAt(0, 75 + avgY, 0.1, 0, avgY, 0, true);
    } else {
      // Angled top-down immersive view
      if (configChanged) {
         // Frame the initial view properly if view mode changed or new route selected
         cameraControlsRef.current.setLookAt(0, 40 + avgY, 45, 0, avgY, 0, true);
      } else {
         // Just pan up/down smoothly to follow the new floor without resetting user's zoom/rotation!
         cameraControlsRef.current.moveTo(0, avgY, 0, true);
      }
    }

    lastViewConfig.current = { viewMode, hasRoute: !!route };
  }, [viewMode, route, activeLevel]);

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

      {/* Tour Guide Floor Indicator */}
      {isPlayingAnimation && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center pointer-events-none animate-in slide-in-from-top-4 fade-in duration-500">
          <span className="text-white/90 font-extrabold tracking-widest text-2xl uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            Floor {activeLevel}
          </span>
        </div>
      )}

      <Canvas shadows gl={{ antialias: true }}>
        <color attach="background" args={["#020617"]} />
        <PerspectiveCamera makeDefault position={[0, 40, 45]} fov={45} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[12, 20, 8]} intensity={1.4} castShadow />
        <Suspense fallback={<Html center>Loading 3D map…</Html>}>
          <FloorModel 
            blocks={blocks} 
            imageUrl={blocks.length > 0 ? null : imageUrl} 
            strictLevel={activeLevel}
            fixedFloorSize={45}
            floorColor="#5d7c7e"
            blockColor="#a3a874"
          />
          {markers.map((n) => {
            const pos = [n.position.x, n.position.y, n.position.z];
            
            return n.type === "KIOSK_START" ? (
              <HumanAvatar key={n.id} position={[pos[0], pos[1], pos[2]]} color="#22c55e" />
            ) : (
              <Sphere key={n.id} args={[0.09, 16, 16]} position={[pos[0], pos[1] + 0.2, pos[2]]}>
                <meshStandardMaterial
                  color={n.type === "TENANT_ENTRANCE" ? "#f59e0b" : "#38bdf8"}
                  emissive="#ffffff"
                  emissiveIntensity={0.15}
                />
              </Sphere>
            );
          })}
          {route?.found ? <DirectionLine points={displayPolyline} /> : null}
          {end ? (() => {
             const nodeLevel = Math.round(end.position.y / 8) + 1;
             if (nodeLevel !== activeLevel) return null;

             return (
              <Html position={[end.position.x, end.position.y + 1.5, end.position.z]} center style={{ pointerEvents: "none" }}>
                <div className="flex flex-col items-center justify-center animate-bounce drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 6 12 14 20 6"></polyline>
                    <polyline points="4 14 12 22 20 14"></polyline>
                  </svg>
                </div>
              </Html>
             );
          })() : null}
          
          <TourGuide 
            route={route} 
            isPlayingAnimation={isPlayingAnimation} 
            onLevelChange={setActiveLevel}
            onComplete={() => onAnimationComplete?.()}
            cameraControlsRef={cameraControlsRef}
          />
          
          <Environment preset="city" />
        </Suspense>
        
        <CameraControls 
          ref={cameraControlsRef}
          maxPolarAngle={Math.PI / 2.05} // Prevent going below ground
          minDistance={20} 
          maxDistance={400}
          dollySpeed={1}
          mouseButtons={{ left: 1, middle: 2, right: 2, wheel: 16 }} // 1=rotate, 2=pan, 16=zoom
          smoothTime={0.4} // Butter smooth transitions
        />
      </Canvas>
    </div>
  );
}
