"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function HumanAvatar({ 
  position, 
  color = "#22c55e",
  isWalking = false
}: { 
  position: [number, number, number]; 
  color?: string;
  isWalking?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  // Add a slight floating/breathing animation or walking animation
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      if (isWalking) {
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 8)) * 0.1;
        groupRef.current.rotation.z = Math.sin(t * 4) * 0.05;
        // Don't override rotation.y here because TourGuide controls it
      } else {
        groupRef.current.position.y = position[1] + Math.sin(t * 2) * 0.05;
        groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
        groupRef.current.rotation.z = 0;
      }
    }

    if (isWalking) {
      const walkSpeed = 8;
      const walkAnim = Math.sin(t * walkSpeed);
      if (leftLegRef.current) leftLegRef.current.rotation.x = walkAnim * 0.6;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -walkAnim * 0.6;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -walkAnim * 0.6;
      if (rightArmRef.current) rightArmRef.current.rotation.x = walkAnim * 0.6;
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={[0.4, 0.4, 0.4]}>
      {/* Head */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      
      {/* Torso */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.5, 1.6, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} emissive={color} emissiveIntensity={0.1} />
      </mesh>

      {/* Left Arm */}
      <mesh ref={leftArmRef} position={[-0.9, 1.8, 0]} rotation={[0, 0, -0.2]} castShadow>
        <capsuleGeometry args={[0.2, 1.2, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Right Arm */}
      <mesh ref={rightArmRef} position={[0.9, 1.8, 0]} rotation={[0, 0, 0.2]} castShadow>
        <capsuleGeometry args={[0.2, 1.2, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Left Leg */}
      <mesh ref={leftLegRef} position={[-0.3, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.25, 1.2, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Right Leg */}
      <mesh ref={rightLegRef} position={[0.3, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.25, 1.2, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      
      {/* Location Ring / Shadow underneath */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.0, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
