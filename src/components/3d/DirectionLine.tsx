"use client";

import { useMemo } from "react";
import { Line, Tube } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/lib/pathfinding";

export function DirectionLine({ points, color = "#22d3ee" }: { points: Vec3[]; color?: string }) {
  const tube = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    if (points.length < 2) return null;
    const vecs = points.map((p) => new THREE.Vector3(p.x, p.y + 0.35, p.z));
    return new THREE.CatmullRomCurve3(vecs, false, "catmullrom", 0.15);
  }, [points]);

  const arrowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const mat = tube.current?.material;
    if (mat && !Array.isArray(mat) && "emissiveIntensity" in mat) {
      (mat as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 + Math.sin(clock.elapsedTime * 4) * 0.6;
    }

    if (curve && arrowRef.current) {
      // Calculate position along curve based on time
      const time = (clock.elapsedTime * 0.15) % 1; // 15% of path per second
      const point = curve.getPoint(time);
      const tangent = curve.getTangent(time).normalize();
      
      arrowRef.current.position.copy(point);
      // Look in the direction of the path
      arrowRef.current.lookAt(point.clone().add(tangent));
      // Adjust rotation since cone points up (Y axis) by default, we want it to point towards Z
      arrowRef.current.rotateX(Math.PI / 2);
    }
  });

  if (!curve || points.length < 2) return null;

  return (
    <group>
      <Tube ref={tube} args={[curve, 64, 0.12, 12, false]} renderOrder={999}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} transparent opacity={0.9} depthTest={false} depthWrite={false} />
      </Tube>
      
      {/* Animated glowing arrow traveling the path */}
      <mesh ref={arrowRef} renderOrder={1000}>
        <coneGeometry args={[0.3, 0.8, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3} toneMapped={false} depthTest={false} depthWrite={false} />
      </mesh>
      
      <Line points={curve.getPoints(48)} color="white" lineWidth={1} transparent opacity={0.35} depthTest={false} renderOrder={999} />
    </group>
  );
}
