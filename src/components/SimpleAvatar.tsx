"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { AvatarState, AnimationValues } from "@/lib/animation";

interface SimpleAvatarProps {
  isSpeaking: boolean;
  isThinking: boolean;
  mouthOpenness?: number;
  avatarState?: AvatarState;
  animationParams?: AnimationValues;
}

// Eye shape types
type EyeShape = "circle" | "closed" | "x" | "large";

// Get eye shape based on avatar state
function getEyeShapeForState(state: AvatarState): EyeShape {
  switch (state) {
    case "ERROR":
      return "x";
    case "SLEEP":
    case "THINKING":
      return "closed";
    case "LISTENING":
      return "large";
    default:
      return "circle";
  }
}

// Get mouth curve for state (-1 = sad, 0 = neutral, 1 = happy)
function getMouthCurveForState(state: AvatarState): number {
  switch (state) {
    case "ERROR":
      return -0.5; // Slightly troubled
    case "CONFIRMING":
      return 0.2; // Slight upturn
    default:
      return 0;
  }
}

export default function SimpleAvatar({
  isSpeaking,
  isThinking,
  mouthOpenness = 0,
  avatarState,
  animationParams,
}: SimpleAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const stateRef = useRef({
    isSpeaking: false,
    isThinking: false,
    mouthOpenness: 0,
    smoothMouth: 0,
    avatarState: "IDLE" as AvatarState,
  });
  const animParamsRef = useRef<AnimationValues | undefined>(undefined);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const idleRef = useRef({ lookTimer: 0, lookX: 0, lookY: 0, targetLookX: 0, targetLookY: 0 });

  // Transition state for smooth shape changes
  const transitionRef = useRef({
    currentEyeShape: "circle" as EyeShape,
    targetEyeShape: "circle" as EyeShape,
    eyeTransition: 1, // 0 = transitioning, 1 = complete
    currentMouthCurve: 0,
    targetMouthCurve: 0,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Create eyes with multiple shapes
    const leftEye = createEyeWithShapes();
    leftEye.group.position.set(-0.35, 0.15, 0);
    mainGroup.add(leftEye.group);

    const rightEye = createEyeWithShapes();
    rightEye.group.position.set(0.35, 0.15, 0);
    mainGroup.add(rightEye.group);

    // Create mouth with curve support
    const mouth = createMouthWithCurve();
    mouth.group.position.set(0, -0.35, 0);
    mainGroup.add(mouth.group);

    // Create Zzz effect for sleep state
    const zzzGroup = createZzzEffect();
    zzzGroup.visible = false;
    mainGroup.add(zzzGroup);

    const sceneData = {
      renderer,
      scene,
      camera,
      mainGroup,
      leftEye,
      rightEye,
      mouth,
      zzzGroup,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.016;

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      stateRef.current.smoothMouth += (stateRef.current.mouthOpenness - stateRef.current.smoothMouth) * 0.25;

      updateScene(
        sceneData,
        timeRef.current,
        stateRef.current,
        mouseRef.current,
        idleRef.current,
        animParamsRef.current,
        transitionRef.current
      );
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    stateRef.current.isSpeaking = isSpeaking;
    stateRef.current.isThinking = isThinking;
    stateRef.current.mouthOpenness = mouthOpenness;
    stateRef.current.avatarState = avatarState || "IDLE";
    animParamsRef.current = animationParams;

    // Update target shapes
    const newEyeShape = getEyeShapeForState(avatarState || "IDLE");
    const newMouthCurve = getMouthCurveForState(avatarState || "IDLE");

    if (newEyeShape !== transitionRef.current.targetEyeShape) {
      transitionRef.current.targetEyeShape = newEyeShape;
      transitionRef.current.eyeTransition = 0;
    }
    transitionRef.current.targetMouthCurve = newMouthCurve;
  }, [isSpeaking, isThinking, mouthOpenness, avatarState, animationParams]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// Create eye with multiple shape options
function createEyeWithShapes() {
  const group = new THREE.Group();

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
  });

  // Circle eye (default)
  const circleGeometry = new THREE.CircleGeometry(0.12, 32);
  const circleMesh = new THREE.Mesh(circleGeometry, material.clone());
  circleMesh.name = "circle";
  group.add(circleMesh);

  // Large circle eye (LISTENING)
  const largeCircleGeometry = new THREE.CircleGeometry(0.14, 32);
  const largeCircleMesh = new THREE.Mesh(largeCircleGeometry, material.clone());
  largeCircleMesh.name = "large";
  largeCircleMesh.visible = false;
  group.add(largeCircleMesh);

  // Closed eye (horizontal line) - SLEEP, THINKING
  const closedShape = new THREE.Shape();
  closedShape.moveTo(-0.12, 0);
  closedShape.lineTo(0.12, 0);
  closedShape.lineTo(0.12, 0.02);
  closedShape.lineTo(-0.12, 0.02);
  closedShape.lineTo(-0.12, 0);
  const closedGeometry = new THREE.ShapeGeometry(closedShape);
  const closedMesh = new THREE.Mesh(closedGeometry, material.clone());
  closedMesh.name = "closed";
  closedMesh.visible = false;
  closedMesh.position.y = 0;
  group.add(closedMesh);

  // X eye (ERROR) - two crossed lines
  const xGroup = new THREE.Group();
  xGroup.name = "x";
  xGroup.visible = false;

  const lineWidth = 0.025;
  const lineLength = 0.15;

  // Line 1 (top-left to bottom-right)
  const line1Shape = new THREE.Shape();
  line1Shape.moveTo(-lineWidth / 2, -lineLength / 2);
  line1Shape.lineTo(lineWidth / 2, -lineLength / 2);
  line1Shape.lineTo(lineWidth / 2, lineLength / 2);
  line1Shape.lineTo(-lineWidth / 2, lineLength / 2);
  const line1Geometry = new THREE.ShapeGeometry(line1Shape);
  const line1Mesh = new THREE.Mesh(line1Geometry, material.clone());
  line1Mesh.rotation.z = Math.PI / 4;
  xGroup.add(line1Mesh);

  // Line 2 (top-right to bottom-left)
  const line2Mesh = new THREE.Mesh(line1Geometry.clone(), material.clone());
  line2Mesh.rotation.z = -Math.PI / 4;
  xGroup.add(line2Mesh);

  group.add(xGroup);

  return {
    group,
    shapes: {
      circle: circleMesh,
      large: largeCircleMesh,
      closed: closedMesh,
      x: xGroup,
    },
  };
}

// Create mouth with curve support
function createMouthWithCurve() {
  const group = new THREE.Group();

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  // We'll update the geometry dynamically based on curve
  const mouthShape = new THREE.Shape();
  mouthShape.ellipse(0, 0, 0.15, 0.03, 0, Math.PI * 2, false, 0);
  const geometry = new THREE.ShapeGeometry(mouthShape, 32);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "mouthMesh";
  group.add(mesh);

  return { group, mesh, geometry };
}

// Create Zzz effect for sleep state
function createZzzEffect(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0.5, 0.3, 0);

  // Create 3 Z letters at different positions
  const zPositions = [
    { x: 0, y: 0, scale: 0.08, delay: 0 },
    { x: 0.15, y: 0.2, scale: 0.06, delay: 0.3 },
    { x: 0.25, y: 0.4, scale: 0.045, delay: 0.6 },
  ];

  zPositions.forEach((pos, index) => {
    const zMesh = createZLetter(pos.scale);
    zMesh.position.set(pos.x, pos.y, 0);
    zMesh.userData = { baseY: pos.y, delay: pos.delay, index };
    group.add(zMesh);
  });

  return group;
}

// Create a single Z letter mesh
function createZLetter(scale: number): THREE.Mesh {
  const shape = new THREE.Shape();

  // Draw Z shape
  const w = 1;
  const h = 1.2;
  const thickness = 0.25;

  // Top horizontal
  shape.moveTo(0, h);
  shape.lineTo(w, h);
  shape.lineTo(w, h - thickness);
  shape.lineTo(thickness * 1.5, h - thickness);

  // Diagonal
  shape.lineTo(w, thickness);

  // Bottom horizontal
  shape.lineTo(w, 0);
  shape.lineTo(0, 0);
  shape.lineTo(0, thickness);
  shape.lineTo(w - thickness * 1.5, thickness);

  // Back up diagonal
  shape.lineTo(0, h - thickness);
  shape.lineTo(0, h);

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.center();
  geometry.scale(scale, scale, 1);

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
  });

  return new THREE.Mesh(geometry, material);
}

// Update mouth geometry based on curve
function updateMouthGeometry(
  mouth: { group: THREE.Group; mesh: THREE.Mesh; geometry: THREE.ShapeGeometry },
  curve: number, // -1 to 1: negative = sad, positive = happy
  openness: number
) {
  const mouthWidth = 0.15;
  const mouthHeight = 0.03 + openness * 0.08;
  const curveAmount = curve * 0.05;

  const mouthShape = new THREE.Shape();

  if (Math.abs(curve) < 0.1 && openness < 0.1) {
    // Simple ellipse for neutral
    mouthShape.ellipse(0, 0, mouthWidth, mouthHeight, 0, Math.PI * 2, false, 0);
  } else {
    // Curved mouth using bezier
    const segments = 32;
    const startX = -mouthWidth;
    const endX = mouthWidth;
    const midY = curveAmount;

    // Top curve
    mouthShape.moveTo(startX, 0);
    mouthShape.quadraticCurveTo(0, midY + mouthHeight, endX, 0);
    // Bottom curve
    mouthShape.quadraticCurveTo(0, midY - mouthHeight, startX, 0);
  }

  const newGeometry = new THREE.ShapeGeometry(mouthShape, 32);
  mouth.mesh.geometry.dispose();
  mouth.mesh.geometry = newGeometry;
}

type EyeShapes = {
  circle: THREE.Mesh;
  large: THREE.Mesh;
  closed: THREE.Mesh;
  x: THREE.Group;
};

function updateScene(
  data: {
    camera: THREE.PerspectiveCamera;
    mainGroup: THREE.Group;
    leftEye: { group: THREE.Group; shapes: EyeShapes };
    rightEye: { group: THREE.Group; shapes: EyeShapes };
    mouth: { group: THREE.Group; mesh: THREE.Mesh; geometry: THREE.ShapeGeometry };
    zzzGroup: THREE.Group;
  },
  time: number,
  state: { isSpeaking: boolean; isThinking: boolean; smoothMouth: number; avatarState: AvatarState },
  mouse: { x: number; y: number },
  idle: { lookTimer: number; lookX: number; lookY: number; targetLookX: number; targetLookY: number },
  animParams: AnimationValues | undefined,
  transition: {
    currentEyeShape: EyeShape;
    targetEyeShape: EyeShape;
    eyeTransition: number;
    currentMouthCurve: number;
    targetMouthCurve: number;
  }
) {
  const { camera, mainGroup, leftEye, rightEye, mouth, zzzGroup } = data;
  const { isSpeaking, isThinking, smoothMouth, avatarState } = state;

  // ========== EYE SHAPE TRANSITION ==========
  if (transition.eyeTransition < 1) {
    transition.eyeTransition += 0.08; // Smooth transition speed
    if (transition.eyeTransition >= 1) {
      transition.eyeTransition = 1;
      transition.currentEyeShape = transition.targetEyeShape;
    }
  }

  // Update eye shape visibility with fade
  const updateEyeShapes = (eye: { group: THREE.Group; shapes: EyeShapes }) => {
    const shapes = eye.shapes;
    const currentShape = transition.currentEyeShape;
    const targetShape = transition.targetEyeShape;
    const t = transition.eyeTransition;

    // Hide all first
    shapes.circle.visible = false;
    shapes.large.visible = false;
    shapes.closed.visible = false;
    shapes.x.visible = false;

    if (t >= 1) {
      // Transition complete, show target
      const target = shapes[targetShape];
      if (target instanceof THREE.Group) {
        target.visible = true;
      } else {
        target.visible = true;
        (target.material as THREE.MeshBasicMaterial).opacity = 1;
      }
    } else {
      // Cross-fade between shapes
      const current = shapes[currentShape];
      const target = shapes[targetShape];

      if (current instanceof THREE.Group) {
        current.visible = true;
        current.children.forEach((child) => {
          (child as THREE.Mesh).material = ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).clone();
          ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - t;
        });
      } else {
        current.visible = true;
        (current.material as THREE.MeshBasicMaterial).opacity = 1 - t;
      }

      if (target instanceof THREE.Group) {
        target.visible = true;
        target.children.forEach((child) => {
          (child as THREE.Mesh).material = ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).clone();
          ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = t;
        });
      } else {
        target.visible = true;
        (target.material as THREE.MeshBasicMaterial).opacity = t;
      }
    }
  };

  updateEyeShapes(leftEye);
  updateEyeShapes(rightEye);

  // ========== MOUTH CURVE TRANSITION ==========
  transition.currentMouthCurve += (transition.targetMouthCurve - transition.currentMouthCurve) * 0.1;

  // ========== GAZE ==========
  let gazeX = 0;
  let gazeY = 0;

  if (animParams?.gazeOffset) {
    gazeX = animParams.gazeOffset.x;
    gazeY = animParams.gazeOffset.y;
  } else {
    idle.lookTimer += 0.016;
    if (idle.lookTimer > 3 + Math.random() * 2) {
      idle.lookTimer = 0;
      idle.targetLookX = (Math.random() - 0.5) * 0.3;
      idle.targetLookY = (Math.random() - 0.5) * 0.2;
    }
    idle.lookX += (idle.targetLookX - idle.lookX) * 0.02;
    idle.lookY += (idle.targetLookY - idle.lookY) * 0.02;
    gazeX = idle.lookX;
    gazeY = idle.lookY;
  }

  // ========== BREATHING ==========
  let breathScale: number;
  let floatY: number;
  let floatX: number;

  if (avatarState === "SLEEP") {
    // Slower, deeper breathing when sleeping
    breathScale = Math.sin(time * 0.5) * 0.035;
    // Gentle floating like dreaming
    floatY = Math.sin(time * 0.3) * 0.02;
    floatX = Math.sin(time * 0.2) * 0.01;
  } else {
    breathScale = Math.sin(time * 1.2) * 0.02;
    if (animParams?.breathScale !== undefined) {
      breathScale += animParams.breathScale;
    }
    floatY = Math.sin(time * 0.7) * 0.03;
    floatX = Math.sin(time * 0.5) * 0.02;
  }
  mainGroup.scale.set(1 + breathScale, 1 + breathScale * 0.6, 1);

  // Floating animation
  mainGroup.position.y = floatY;
  mainGroup.position.x = floatX;

  // Face direction
  const headTiltX = mouse.x * 0.15 + gazeX * 0.2;
  const headTiltY = -mouse.y * 0.1 + gazeY * 0.12;
  mainGroup.rotation.y += (headTiltX - mainGroup.rotation.y) * 0.04;
  mainGroup.rotation.x += (headTiltY - mainGroup.rotation.x) * 0.04;

  // ========== EYE SCALE (BLINK) ==========
  // Only apply blink scale if not in closed/X eye state
  if (transition.currentEyeShape === "circle" || transition.currentEyeShape === "large") {
    let eyeScaleY = 1;

    if (animParams?.blinkScale !== undefined) {
      eyeScaleY = animParams.blinkScale;
    } else {
      const blinkCycle = time % 4;
      if (blinkCycle > 3.7 && blinkCycle < 4.0) {
        const progress = (blinkCycle - 3.7) / 0.3;
        eyeScaleY = 1 - Math.sin(progress * Math.PI) * 0.9;
      }
    }

    if (isSpeaking) {
      eyeScaleY = Math.min(eyeScaleY, 0.8 + Math.sin(time * 6) * 0.08);
    }

    leftEye.group.scale.y = eyeScaleY;
    rightEye.group.scale.y = eyeScaleY;
  } else {
    leftEye.group.scale.y = 1;
    rightEye.group.scale.y = 1;
  }

  // ========== CONFIRMING: Tilt one eye ==========
  if (avatarState === "CONFIRMING") {
    rightEye.group.rotation.z = Math.sin(time * 2) * 0.1 + 0.15;
  } else {
    rightEye.group.rotation.z *= 0.9;
  }

  // ========== MOUTH ==========
  if (isSpeaking) {
    updateMouthAnimation(mouth, smoothMouth, time, transition.currentMouthCurve);
  } else {
    updateMouthGeometry(mouth, transition.currentMouthCurve, 0);
    // Reset position
    mouth.group.position.y += (-0.35 - mouth.group.position.y) * 0.1;
    mouth.group.position.x *= 0.9;
    mouth.group.rotation.z *= 0.9;
  }

  // ========== STATE-BASED TILT ==========
  if (avatarState === "SLEEP") {
    // Lean to one side when sleeping, with gentle sway
    const sleepTilt = 0.15 + Math.sin(time * 0.3) * 0.02;
    mainGroup.rotation.z += (sleepTilt - mainGroup.rotation.z) * 0.02;
  } else if (isThinking) {
    mainGroup.rotation.z = Math.sin(time * 0.9) * 0.04;
  } else {
    mainGroup.rotation.z *= 0.95;
  }

  // ========== ZZZ EFFECT ==========
  if (avatarState === "SLEEP") {
    zzzGroup.visible = true;
    // Counter-rotate to keep Zzz upright despite head tilt
    zzzGroup.rotation.z = -mainGroup.rotation.z;

    // Animate each Z letter
    zzzGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const { baseY, delay } = mesh.userData;

      // Floating animation with delay
      const animTime = (time + delay) % 3;
      const floatProgress = animTime / 3;

      // Float up and fade out
      mesh.position.y = baseY + floatProgress * 0.15;
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - floatProgress * 0.5);

      // Gentle sway
      mesh.position.x = mesh.userData.index * 0.15 + Math.sin(time * 0.8 + delay * 2) * 0.02;
    });
  } else {
    zzzGroup.visible = false;
  }

  // Subtle camera movement
  camera.position.x += (mouse.x * 0.12 - camera.position.x) * 0.02;
  camera.position.y += (mouse.y * 0.08 - camera.position.y) * 0.02;
  camera.lookAt(0, 0, 0);
}

function updateMouthAnimation(
  mouth: { group: THREE.Group; mesh: THREE.Mesh; geometry: THREE.ShapeGeometry },
  openness: number,
  time: number,
  curve: number
) {
  const baseOpen = 0.5 + openness * 2.5;
  const fastWobble = Math.sin(time * 15) * 0.3;
  const mediumWobble = Math.sin(time * 8) * 0.2;
  const slowPulse = Math.sin(time * 3) * 0.15;

  const scaleY = baseOpen + fastWobble + mediumWobble + slowPulse;

  updateMouthGeometry(mouth, curve, openness);
  mouth.mesh.scale.set(1 + openness * 0.3 + Math.sin(time * 6) * 0.1, Math.max(0.3, scaleY), 1);

  mouth.group.position.y = -0.35 + Math.sin(time * 10) * 0.015;
  mouth.group.position.x = Math.sin(time * 7) * 0.008;
  mouth.group.rotation.z = Math.sin(time * 5) * 0.05;
}
