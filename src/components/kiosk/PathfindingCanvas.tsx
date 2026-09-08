"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Html, CameraControls, PerspectiveCamera, Sphere } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { DirectionLine } from "@/components/3d/DirectionLine";
import { FloorModel, type FloorBlockMesh } from "@/components/3d/FloorModel";
import { HumanAvatar } from "@/components/3d/HumanAvatar";
import type { GraphNode, PathNodeType, PathResult } from "@/lib/pathfinding";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { DoorOpen } from "lucide-react";

const VERTICAL_TYPES: PathNodeType[] = ["ESCALATOR", "ELEVATOR", "STAIRS"];

function TourGuide({
  route,
  isPlayingAnimation,
  onLevelChange,
  onComplete,
  onProceed,
  proceedSignal,
  cameraControlsRef,
}: {
  route: PathResult | null;
  isPlayingAnimation: boolean;
  onLevelChange: (level: number) => void;
  onComplete: () => void;
  onProceed: () => void; // called when user taps Proceed in the popup
  proceedSignal: number;
  cameraControlsRef: React.MutableRefObject<any>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const lastLevelRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const visitedPausedNodesRef = useRef(new Set<number>());
  const lastProceedSignalRef = useRef(proceedSignal);
  // React state so Html popup re-renders when paused node changes
  const [pausedAtNode, setPausedAtNode] = useState<GraphNode | null>(null);

  const totalDistance = useMemo(() => {
    if (!route) return 0;
    let dist = 0;
    for (let i = 0; i < route.polyline.length - 1; i++) {
       const p1 = route.polyline[i];
       const p2 = route.polyline[i + 1];
       dist += Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    }
    return dist;
  }, [route]);

  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    progressRef.current = 0;
    lastLevelRef.current = null;
    pausedRef.current = false;
    visitedPausedNodesRef.current.clear();
    setPausedAtNode(null);
    setIsFinished(false);
  }, [isPlayingAnimation, route]);

  // When proceedSignal bumps → resume walking past current escalator node
  useEffect(() => {
    if (proceedSignal !== lastProceedSignalRef.current) {
      lastProceedSignalRef.current = proceedSignal;
      if (pausedRef.current) {
        pausedRef.current = false;
        setPausedAtNode(null);
        progressRef.current += 1.0;
      }
    }
  }, [proceedSignal]);

  useFrame((state, delta) => {
    if (!isPlayingAnimation || !route?.found || !groupRef.current) return;
    if (pausedRef.current) return;

    if (!isFinished) {
      const speed = 4.5;
      progressRef.current += speed * delta;

      if (totalDistance > 0 && progressRef.current >= totalDistance) {
        progressRef.current = totalDistance;
        setIsFinished(true);
        onComplete();
      }
    }

    let ridingEscalator = false;
    let currentDist = 0;
    let point = new THREE.Vector3();
    let lookTarget = new THREE.Vector3();
    let found = false;
    let currentSegmentIndex = -1;

    for (let i = 0; i < route.polyline.length - 1; i++) {
      const p1 = new THREE.Vector3(route.polyline[i].x, route.polyline[i].y, route.polyline[i].z);
      const p2 = new THREE.Vector3(route.polyline[i + 1].x, route.polyline[i + 1].y, route.polyline[i + 1].z);
      const segDist = p1.distanceTo(p2);
      if (progressRef.current <= currentDist + segDist) {
        const t = (progressRef.current - currentDist) / segDist;
        ridingEscalator = Math.abs(p2.y - p1.y) > 0.1;
        const travelT = ridingEscalator ? t * t * (3 - 2 * t) : t;
        const nextT = ridingEscalator ? Math.min(1, travelT + 0.08) : 1;
        point.lerpVectors(p1, p2, travelT);
        lookTarget.lerpVectors(p1, p2, nextT);
        currentSegmentIndex = i;
        found = true;
        break;
      }
      currentDist += segDist;
    }

    if (!found) {
      const lastP = route.polyline[route.polyline.length - 1];
      point.set(lastP.x, lastP.y, lastP.z);
      if (route.polyline.length >= 2) {
        const prevP = route.polyline[route.polyline.length - 2];
        const dir = new THREE.Vector3(lastP.x - prevP.x, 0, lastP.z - prevP.z).normalize();
        lookTarget.set(lastP.x + dir.x, lastP.y, lastP.z + dir.z);
      } else {
        lookTarget.copy(point);
      }
    }

    groupRef.current.position.copy(point);
    if (lookTarget.distanceTo(point) > 0.01) {
      groupRef.current.lookAt(
        ridingEscalator ? lookTarget : new THREE.Vector3(lookTarget.x, point.y, lookTarget.z)
      );
    }

    const currentLevel = Math.round(point.y / 8) + 1;
    if (currentLevel !== lastLevelRef.current) {
      lastLevelRef.current = currentLevel;
      onLevelChange(currentLevel);
    }

    // ── Pause when reaching a vertical connector that leads to another floor ──
    if (!isFinished && found && currentSegmentIndex >= 0) {
      const nextNodeIndex = currentSegmentIndex + 1;
      if (nextNodeIndex < route.nodes.length && !visitedPausedNodesRef.current.has(nextNodeIndex)) {
        const nextNode = route.nodes[nextNodeIndex];
        const afterNextNode = route.nodes[nextNodeIndex + 1];
        if (
          nextNode &&
          VERTICAL_TYPES.includes(nextNode.type) &&
          afterNextNode &&
          Math.round(nextNode.position.y / 8) !== Math.round(afterNextNode.position.y / 8)
        ) {
          const nodePos = new THREE.Vector3(nextNode.position.x, nextNode.position.y, nextNode.position.z);
          if (point.distanceTo(nodePos) < 1.0) {
            pausedRef.current = true;
            visitedPausedNodesRef.current.add(nextNodeIndex);
            setPausedAtNode(nextNode);
          }
        }
      }
    }
  });

  if (!isPlayingAnimation) return null;

  // Find which floor comes after the paused vertical node
  const nextFloor = pausedAtNode && route
    ? (() => {
        const idx = route.nodes.findIndex(n => n.id === pausedAtNode.id);
        const after = idx >= 0 ? route.nodes[idx + 1] : null;
        return after ? Math.round(after.position.y / 8) + 1 : null;
      })()
    : null;

  // suppress unused-var — nextFloor kept for future tooltip use
  void nextFloor;

  return (
    <group ref={groupRef}>
      <HumanAvatar position={[0, 0, 0]} color="#f43f5e" isWalking={!isFinished} />
      <pointLight color="#f43f5e" intensity={1.5} distance={12} position={[0, 3, 0]} />

      {/* ── One-line white chip near the node floor level ── */}
      {pausedAtNode && (
        <Html
          position={[0, 0.4, 0]}
          center
          zIndexRange={[100, 200]}
          style={{ pointerEvents: "auto", userSelect: "none" }}
        >
          <button
            onClick={onProceed}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "999px",
              padding: "6px 14px 6px 10px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "#ffffff")}
          >
            <DoorOpen size={16} color="#111827" />
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#111827", letterSpacing: "0.01em" }}>
              Proceed
            </span>
          </button>
        </Html>
      )}
    </group>
  );
}

export function PathfindingCanvas({
  blocks,
  nodes,
  route,
  imageUrl,
  floorsData,
  isPlayingAnimation = false,
  onAnimationComplete,
  onProceed,
  proceedSignal = 0,
  selectedFloor,
  onLevelChange,
}: {
  blocks: FloorBlockMesh[];
  nodes: GraphNode[];
  route: PathResult | null;
  imageUrl?: string | null;
  floorsData?: { levelNumber: number; shape?: string; pointsData?: string | null; colorHex?: string | null }[];
  isPlayingAnimation?: boolean;
  onAnimationComplete?: () => void;
  onProceed?: () => void;
  proceedSignal?: number;
  selectedFloor?: number;
  onLevelChange?: (level: number) => void;
}) {
  const end = route?.nodes.at(-1);

  const [activeLevel, setActiveLevel] = useState<number>(selectedFloor ?? 1);

  // Sync with selectedFloor prop when changed externally
  useEffect(() => {
    if (selectedFloor !== undefined && selectedFloor !== activeLevel) {
      setActiveLevel(selectedFloor);
    }
  }, [selectedFloor]);

  // Reset to the start node's floor when a new route is searched
  useEffect(() => {
    if (route?.found && route.nodes.length > 0) {
      const startLevel = Math.round(route.nodes[0].position.y / 8) + 1;
      setActiveLevel(startLevel);
      onLevelChange?.(startLevel);
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

  // Listen for custom zoom events dispatched from navigation bar
  useEffect(() => {
    const handleZoomIn = () => cameraControlsRef.current?.dolly(15, true);
    const handleZoomOut = () => cameraControlsRef.current?.dolly(-15, true);
    const handleResetView = () => cameraControlsRef.current?.reset(true);

    window.addEventListener("kiosk-map-zoom-in", handleZoomIn);
    window.addEventListener("kiosk-map-zoom-out", handleZoomOut);
    window.addEventListener("kiosk-map-reset", handleResetView);

    return () => {
      window.removeEventListener("kiosk-map-zoom-in", handleZoomIn);
      window.removeEventListener("kiosk-map-zoom-out", handleZoomOut);
      window.removeEventListener("kiosk-map-reset", handleResetView);
    };
  }, []);

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
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#f8fafc]">
      
      {/* View Toggle UI */}
      <div className="absolute top-24 right-6 z-10 flex overflow-hidden rounded-xl border border-slate-200 bg-white/80 shadow-lg backdrop-blur-md">
        <button
          className={`px-4 py-2 text-sm font-bold tracking-wide transition-colors ${viewMode === "IMMERSIVE" ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          onClick={() => setViewMode("IMMERSIVE")}
        >
          3D IMMERSIVE
        </button>
        <button
          className={`px-4 py-2 text-sm font-bold tracking-wide transition-colors ${viewMode === "TOP" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          onClick={() => setViewMode("TOP")}
        >
          TOP VIEW
        </button>
      </div>

      {/* Tour Guide Floor Indicator */}
      {isPlayingAnimation && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center pointer-events-none animate-in slide-in-from-top-4 fade-in duration-500">
          <div className="bg-white/90 border border-slate-200/80 px-6 py-2 rounded-full shadow-lg backdrop-blur-md">
            <span className="text-slate-900 font-extrabold tracking-widest text-2xl uppercase">
              Floor {activeLevel}
            </span>
          </div>
        </div>
      )}

      <Canvas shadows gl={{ antialias: true }}>
        <color attach="background" args={["#f8fafc"]} />
        <PerspectiveCamera makeDefault position={[0, 40, 45]} fov={45} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[12, 20, 8]} intensity={1.5} castShadow />
        <Suspense fallback={<Html center>Loading 3D map…</Html>}>
          <FloorModel 
            blocks={blocks} 
            floorsData={floorsData}
            imageUrl={blocks.length > 0 ? null : imageUrl} 
            strictLevel={activeLevel}
            fixedFloorSize={45}
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
            onProceed={() => onProceed?.()}
            proceedSignal={proceedSignal}
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
