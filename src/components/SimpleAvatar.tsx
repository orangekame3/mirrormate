"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface SimpleAvatarProps {
  isSpeaking: boolean;
  isThinking: boolean;
  mouthOpenness?: number;
}

export default function SimpleAvatar({ isSpeaking, isThinking, mouthOpenness = 0 }: SimpleAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const stateRef = useRef({ isSpeaking: false, isThinking: false, mouthOpenness: 0, smoothMouth: 0 });
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const idleRef = useRef({ lookTimer: 0, lookX: 0, lookY: 0, targetLookX: 0, targetLookY: 0 });

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

    // 左目
    const leftEye = createEye();
    leftEye.group.position.set(-0.35, 0.15, 0);
    mainGroup.add(leftEye.group);

    // 右目
    const rightEye = createEye();
    rightEye.group.position.set(0.35, 0.15, 0);
    mainGroup.add(rightEye.group);

    // 口
    const mouth = createMouth();
    mouth.group.position.set(0, -0.35, 0);
    mainGroup.add(mouth.group);

    const sceneData = {
      renderer,
      scene,
      camera,
      mainGroup,
      leftEye,
      rightEye,
      mouth,
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

      updateScene(sceneData, timeRef.current, stateRef.current, mouseRef.current, idleRef.current);
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
  }, [isSpeaking, isThinking, mouthOpenness]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// 目を作成（シンプルな白い丸）
function createEye() {
  const group = new THREE.Group();

  const eyeGeometry = new THREE.CircleGeometry(0.12, 32);
  const eyeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const eyeMesh = new THREE.Mesh(eyeGeometry, eyeMaterial);
  group.add(eyeMesh);

  return { group, eyeMesh };
}

// 口を作成（楕円形 - 開閉アニメーション用）
function createMouth() {
  const group = new THREE.Group();

  // 口の形状（楕円）
  const mouthShape = new THREE.Shape();
  mouthShape.ellipse(0, 0, 0.15, 0.03, 0, Math.PI * 2, false, 0);

  const geometry = new THREE.ShapeGeometry(mouthShape, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "mouthMesh";
  group.add(mesh);

  return { group, mesh, geometry };
}

function updateScene(
  data: {
    camera: THREE.PerspectiveCamera;
    mainGroup: THREE.Group;
    leftEye: { group: THREE.Group; eyeMesh: THREE.Mesh };
    rightEye: { group: THREE.Group; eyeMesh: THREE.Mesh };
    mouth: { group: THREE.Group; mesh: THREE.Mesh; geometry: THREE.ShapeGeometry };
  },
  time: number,
  state: { isSpeaking: boolean; isThinking: boolean; smoothMouth: number },
  mouse: { x: number; y: number },
  idle: { lookTimer: number; lookX: number; lookY: number; targetLookX: number; targetLookY: number }
) {
  const { camera, mainGroup, leftEye, rightEye, mouth } = data;
  const { isSpeaking, isThinking, smoothMouth } = state;

  // アイドル視線
  idle.lookTimer += 0.016;
  if (idle.lookTimer > 3 + Math.random() * 2) {
    idle.lookTimer = 0;
    idle.targetLookX = (Math.random() - 0.5) * 0.3;
    idle.targetLookY = (Math.random() - 0.5) * 0.2;
  }
  idle.lookX += (idle.targetLookX - idle.lookX) * 0.02;
  idle.lookY += (idle.targetLookY - idle.lookY) * 0.02;

  // 呼吸アニメーション
  const breathe = Math.sin(time * 1.2) * 0.02;
  mainGroup.scale.set(1 + breathe, 1 + breathe * 0.6, 1);

  // ゆらゆら浮遊
  mainGroup.position.y = Math.sin(time * 0.7) * 0.03;
  mainGroup.position.x = Math.sin(time * 0.5) * 0.02;

  // 顔の向き（マウス追従）
  const headTiltX = mouse.x * 0.15 + idle.lookX * 0.2;
  const headTiltY = -mouse.y * 0.1 + idle.lookY * 0.12;
  mainGroup.rotation.y += (headTiltX - mainGroup.rotation.y) * 0.04;
  mainGroup.rotation.x += (headTiltY - mainGroup.rotation.x) * 0.04;

  // 瞬き
  const blinkCycle = time % 4;
  let eyeScaleY = 1;

  if (blinkCycle > 3.7 && blinkCycle < 4.0) {
    const progress = (blinkCycle - 3.7) / 0.3;
    eyeScaleY = 1 - Math.sin(progress * Math.PI) * 0.9;
  }

  // 話している時は目を少し細める
  if (isSpeaking) {
    eyeScaleY = Math.min(eyeScaleY, 0.8 + Math.sin(time * 6) * 0.08);
  }

  leftEye.group.scale.y = eyeScaleY;
  rightEye.group.scale.y = eyeScaleY;

  // 口のアニメーション
  updateMouthAnimation(mouth, smoothMouth, isSpeaking, time);

  // 考え中
  if (isThinking) {
    mainGroup.rotation.z = Math.sin(time * 0.9) * 0.04;
  } else {
    mainGroup.rotation.z *= 0.95;
  }

  // カメラの微細な動き
  camera.position.x += (mouse.x * 0.12 - camera.position.x) * 0.02;
  camera.position.y += (mouse.y * 0.08 - camera.position.y) * 0.02;
  camera.lookAt(0, 0, 0);
}

// 口のアニメーション
function updateMouthAnimation(
  mouth: { group: THREE.Group; mesh: THREE.Mesh; geometry: THREE.ShapeGeometry },
  openness: number,
  isSpeaking: boolean,
  time: number
) {
  if (isSpeaking) {
    // 話している時: 音声振幅に連動した開閉 + 複数の動き
    const baseOpen = 0.5 + openness * 2.5; // 音声振幅で大きく開く
    const fastWobble = Math.sin(time * 15) * 0.3; // 高速な振動
    const mediumWobble = Math.sin(time * 8) * 0.2; // 中速の振動
    const slowPulse = Math.sin(time * 3) * 0.15; // ゆっくりした脈動

    const scaleY = baseOpen + fastWobble + mediumWobble + slowPulse;
    const scaleX = 1 + openness * 0.3 + Math.sin(time * 6) * 0.1; // 横にも少し伸縮

    mouth.mesh.scale.set(scaleX, Math.max(0.3, scaleY), 1);

    // 口の位置も微妙に動かす
    mouth.group.position.y = -0.35 + Math.sin(time * 10) * 0.015;
    mouth.group.position.x = Math.sin(time * 7) * 0.008;

    // 少し回転も加える
    mouth.group.rotation.z = Math.sin(time * 5) * 0.05;
  } else {
    // 話していない時: 穏やかな状態に戻る
    const targetScaleY = 1;
    const targetScaleX = 1;

    mouth.mesh.scale.x += (targetScaleX - mouth.mesh.scale.x) * 0.1;
    mouth.mesh.scale.y += (targetScaleY - mouth.mesh.scale.y) * 0.1;

    // 位置をリセット
    mouth.group.position.y += (-0.35 - mouth.group.position.y) * 0.1;
    mouth.group.position.x *= 0.9;
    mouth.group.rotation.z *= 0.9;
  }
}
