// components/orb.tsx
"use client";
import React, { useEffect, useRef, useCallback } from "react"; // Added useCallback
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import useVapi from "@/hooks/use-vapi"; // Assuming this path is correct based on your project

const Orb: React.FC = () => {
  const { volumeLevel, isSessionActive, toggleCall } = useVapi();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ballRef = useRef<THREE.Mesh | null>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null); // Typed more strictly

  // noise can be instantiated outside or inside, but if inside, it should be memoized or part of a ref.
  // For simplicity and stability, let's ensure it's stable by defining it once.
  // Using useRef to ensure it's created only once per component instance.
  const noiseRef = useRef(createNoise3D());

  const updateBallMorph = useCallback((mesh: THREE.Mesh, volume: number) => {
    // console.log("Morphing the ball with volume:", volume);
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute("position");
    const noise = noiseRef.current; // Use the memoized noise instance

    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3(
        positionAttribute.getX(i),
        positionAttribute.getY(i),
        positionAttribute.getZ(i),
      );

      const offset = 20;
      const amp = 2.5;
      const time = window.performance.now();
      vertex.normalize();
      const rf = 0.00001;
      const distance =
        offset +
        volume * 4 +
        noise( // Using the stable noise instance
          vertex.x + time * rf * 7,
          vertex.y + time * rf * 8,
          vertex.z + time * rf * 9,
        ) *
          amp *
          volume;
      vertex.multiplyScalar(distance);

      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  }, []); // noiseRef.current is stable, so empty dependency array is fine here

  const resetBallMorph = useCallback((mesh: THREE.Mesh, originalPositions: Float32Array | null) => {
    if (!originalPositions) return;
    // console.log("Resetting the ball to its original shape");
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute("position");

    for (let i = 0; i < positionAttribute.count; i++) {
      positionAttribute.setXYZ(
        i,
        originalPositions[i * 3],
        originalPositions[i * 3 + 1],
        originalPositions[i * 3 + 2],
      );
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  }, []); // No dependencies from component scope

  const onWindowResize = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current) return;

    const outElement = document.getElementById("out");
    if (outElement) {
      cameraRef.current.aspect =
        outElement.clientWidth / outElement.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(
        outElement.clientWidth,
        outElement.clientHeight,
      );
    }
  }, []); // Refs are stable

  const initViz = useCallback(() => {
    // console.log("Initializing Three.js visualization...");
    const scene = new THREE.Scene();
    scene.background = null;
    const group = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight, // This will be updated by onWindowResize
      0.5,
      100,
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(scene.position);

    scene.add(camera);
    sceneRef.current = scene;
    groupRef.current = group;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: false
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight); // This will be updated by onWindowResize
    rendererRef.current = renderer;

    const icosahedronGeometry = new THREE.IcosahedronGeometry(20, 8);
    const lambertMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      wireframe: true,
    });

    const ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    ball.position.set(0, 0, 0);
    ballRef.current = ball;

    originalPositionsRef.current =
      ball.geometry.attributes.position.array.slice() as Float32Array;

    group.add(ball);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.intensity = 0.9;
    spotLight.position.set(-10, 40, 20);
    spotLight.lookAt(ball.position);
    spotLight.castShadow = true;
    scene.add(spotLight);

    scene.add(group);

    const outElement = document.getElementById("out");
    if (outElement && rendererRef.current) { // Check if rendererRef.current is not null
      outElement.innerHTML = "";
      outElement.appendChild(rendererRef.current.domElement);
      // Initial size set based on container, then onWindowResize handles updates
      rendererRef.current.setSize(outElement.clientWidth, outElement.clientHeight);
      // Also update camera aspect ratio here for initial render
      if (cameraRef.current) {
        cameraRef.current.aspect = outElement.clientWidth / outElement.clientHeight;
        cameraRef.current.updateProjectionMatrix();
      }
    }
    // Start the render loop after setup
    // Moved the render call here to ensure it's part of initViz context
    // and to avoid it being a dependency for the main useEffect
    const renderLoop = () => {
      if (
        !groupRef.current ||
        !rendererRef.current || // Check rendererRef.current
        !sceneRef.current ||   // Check sceneRef.current
        !cameraRef.current    // Check cameraRef.current
      ) {
        return;
      }
      groupRef.current.rotation.y += 0.005;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestAnimationFrame(renderLoop);
    };
    renderLoop();

  }, []); // initViz itself has no external React dependencies from Orb's scope

  useEffect(() => {
    // console.log("Effect for initViz and resize listener");
    initViz(); // initViz is now stable due to useCallback
    window.addEventListener("resize", onWindowResize); // onWindowResize is stable
    return () => {
      window.removeEventListener("resize", onWindowResize);
      // Optional: Cleanup Three.js resources if component unmounts
      // rendererRef.current?.dispose();
      // sceneRef.current?.clear();
    };
  }, [initViz, onWindowResize]); // Add stable functions to dependency array

  useEffect(() => {
    // console.log("Effect for ball morphing based on Vapi state");
    if (isSessionActive && ballRef.current) {
      updateBallMorph(ballRef.current, volumeLevel);
    } else if (
      !isSessionActive &&
      ballRef.current &&
      originalPositionsRef.current
    ) {
      resetBallMorph(ballRef.current, originalPositionsRef.current);
    }
  }, [volumeLevel, isSessionActive, updateBallMorph, resetBallMorph]); // Add stable functions

  return (
    <div style={{ height: "100%", background: 'transparent' }}>
      <div
        id="out"
        className="hover:cursor-pointer"
        onClick={toggleCall}
        style={{ height: "100%", width: "100%", background: 'transparent' }}
      ></div>
    </div>
  );
};

export default Orb;