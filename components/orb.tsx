// components/orb.tsx

"use client";
import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
// import { createNoise3D } from "simplex-noise"; // We will require it directly for stability
import useVapi from "@/hooks/use-vapi";

const Orb: React.FC = () => {
  const { volumeLevel, isSessionActive, toggleCall } = useVapi();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ballRef = useRef<THREE.Mesh | null>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null);

  // Instantiate noise using require for broader compatibility and ensure it's stable via useRef
  const noiseRef = useRef(require('simplex-noise').createNoise3D());

  const updateBallMorph = useCallback((mesh: THREE.Mesh, volume: number) => {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute("position");
    const noise = noiseRef.current;

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
        noise(
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
  }, []); // noiseRef.current is stable via useRef

  const resetBallMorph = useCallback((mesh: THREE.Mesh, originalPositions: Float32Array | null) => {
    if (!originalPositions || !mesh) return; // Added !mesh check
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
  }, []);

  const onWindowResize = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current) return;
    const outElement = document.getElementById("out");
    if (outElement) {
      cameraRef.current.aspect = outElement.clientWidth / outElement.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(outElement.clientWidth, outElement.clientHeight);
    }
  }, []);

  const initViz = useCallback(() => {
    const scene = new THREE.Scene();
    scene.background = null;
    const group = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 100); // Initial aspect, will be updated
    camera.position.set(0, 0, 100);
    camera.lookAt(scene.position);
    scene.add(camera);

    sceneRef.current = scene;
    groupRef.current = group;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: false });
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const icosahedronGeometry = new THREE.IcosahedronGeometry(20, 8);
    const lambertMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, wireframe: true });
    const ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    ball.position.set(0, 0, 0);
    ballRef.current = ball;
    originalPositionsRef.current = ball.geometry.attributes.position.array.slice() as Float32Array;
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
    if (outElement && rendererRef.current) {
      outElement.innerHTML = "";
      outElement.appendChild(rendererRef.current.domElement);
      onWindowResize(); // Call to set initial size and aspect based on actual #out dimensions
    }

    const renderLoop = () => {
      if (!groupRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
        requestAnimationFrame(renderLoop); // Still request next frame even if refs not ready
        return;
      }
      groupRef.current.rotation.y += 0.005;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }, [onWindowResize]); // onWindowResize is stable

  useEffect(() => {
    initViz();
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
    };
  }, [initViz, onWindowResize]);

  useEffect(() => {
    if (isSessionActive && ballRef.current) {
      updateBallMorph(ballRef.current, volumeLevel);
    } else if (!isSessionActive && ballRef.current && originalPositionsRef.current) {
      resetBallMorph(ballRef.current, originalPositionsRef.current);
    }
  }, [volumeLevel, isSessionActive, updateBallMorph, resetBallMorph]);

  const handleOrbClick = () => {
    toggleCall();
  };

  return (
    <div style={{ height: "100%", width: "100%", background: 'transparent' }}> {/* Ensure this div also takes full dimensions */}
      <div
        id="out"
        className="hover:cursor-pointer"
        onClick={handleOrbClick}
        style={{ height: "100%", width: "100%", background: 'transparent' }}
      ></div>
    </div>
  );
};

export default Orb;