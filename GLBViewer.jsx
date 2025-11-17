// components/GLBViewer.jsx
"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import { useRef, Suspense, useEffect } from "react";
import * as THREE from "three";

// 3D Model component
const Model = ({ modelPath }) => {
  const { scene, materials } = useGLTF(modelPath);

  // Set materials on load
  useEffect(() => {
    if (materials.ChristmasTree) {
      materials.ChristmasTree.color.setRGB(0, 0.3, 0);
      materials.ChristmasTree.needsUpdate = true;
    }
    if (materials.star) {
      materials.star.color.setRGB(1, 1, 0);
      materials.star.roughness = 0.2; // Make it more shiny
      materials.snow.metalness = 0; // Remove metalness for snow
      materials.star.needsUpdate = true;
    }
    if (materials.Trunk) {
      materials.Trunk.color.setRGB(49 / 255, 37 / 255, 27 / 255);
      materials.Trunk.needsUpdate = true;
    }
    if (materials.snow) {
      // Force snow to be pure white
      materials.snow.color = new THREE.Color(0xffffff); // Pure white
      materials.snow.roughness = 0.2; // Make it more shiny
      materials.snow.metalness = 0; // Remove metalness for snow
      materials.snow.needsUpdate = true;
    }

    // Enable shadows for all meshes in the scene
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [materials, scene]);

  // Single state for both spheres
  const animationState = useRef({
    isYellow: true,
    lastToggle: 0,
    interval: 1,
  });

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    if (
      time - animationState.current.lastToggle >
      animationState.current.interval
    ) {
      animationState.current.isYellow = !animationState.current.isYellow;
      animationState.current.lastToggle = time;

      const isYellow = animationState.current.isYellow;

      if (materials.Sphere2n) {
        if (isYellow) {
          materials.Sphere2n.color.setRGB(1, 1, 0);
          materials.Sphere2n.emissive.setRGB(0.2, 0.2, 0);
        } else {
          materials.Sphere2n.color.setRGB(0, 0, 1);
          materials.Sphere2n.emissive.setRGB(0, 0, 0.2);
        }
        materials.Sphere2n.needsUpdate = true;
      }

      if (materials.Sphere1n) {
        if (!isYellow) {
          materials.Sphere1n.color.setRGB(1, 1, 0);
          materials.Sphere1n.emissive.setRGB(0.2, 0.2, 0);
        } else {
          materials.Sphere1n.color.setRGB(0, 0, 1);
          materials.Sphere1n.emissive.setRGB(0, 0, 0.2);
        }
        materials.Sphere1n.needsUpdate = true;
      }
    }
  });

  return <primitive object={scene} position={[0, -0.8, 0]} />;
};

// Main GLB Viewer component
export default function GLBViewer({
  modelPath = "/gifftme/tree-classic.glb",
}) {
  return (
    <div
      className="max-w-lg h-[80vh]"
    >
      <Canvas
        camera={{
          position: [5, 3, 15],
          fov: 10,
          near: 0.1,
          far: 100,
        }}
        shadows
        gl={{
          alpha: true, // Enable transparency
          antialias: true,
        }}
        // Set transparent background for the canvas
        style={{ background: "transparent" }}
      >
        {/* Lighting Setup */}
        <ambientLight intensity={0.4} />

        {/* Main directional light from top-right */}
        <directionalLight
          position={[15, 20, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-near={0.1}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-bias={-0.0001}
        />

        {/* Additional fill light */}
        <pointLight position={[-5, 10, -5]} intensity={0.3} />

        {/* Transparent ground plane for shadows */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1.5, 0]}
          receiveShadow
        >
          <planeGeometry args={[50, 50]} />
          <shadowMaterial transparent opacity={0.3} />
        </mesh>

        <Suspense fallback={null}>
          <Model modelPath={modelPath} />
        </Suspense>

        {/* <OrbitControls /> */}
        <Environment preset="dawn" />
      </Canvas>
    </div>
  );
}
