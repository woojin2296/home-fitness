"use client";

import { useEffect, useRef, useState } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import { Pose } from "@mediapipe/pose";
import * as THREE from "three";

// BlazePose에서 사용할 키포인트의 연결 정보
const POSE_CONNECTIONS = [
  [1, 2], [2, 3],
  [4, 5], [5, 6],
  [9, 10],

  // 🔹 팔 (오른팔 & 왼팔)
  [11, 13], [13, 15], // 왼쪽 팔
  [12, 14], [14, 16], // 오른쪽 팔
  [15, 17], [15, 19], [15, 21], // 왼손 손가락
  [16, 18], [16, 20], [16, 22], // 오른손 손가락

  // 🔹 몸통 (어깨 <-> 골반)
  [11, 12], [11, 23], [12, 24], [23, 24], // 어깨와 골반 연결

  // 🔹 다리 (왼다리 & 오른다리)
  [23, 25], [25, 27], [27, 29], [29, 31], // 왼쪽 다리 (발 포함)
  [24, 26], [26, 28], [28, 30], [30, 32], // 오른쪽 다리 (발 포함)

  // 🔹 추가: 손과 발 끝점
  [17, 19], [19, 21], // 왼손 손가락 끝
  [18, 20], [20, 22], // 오른손 손가락 끝
  [29, 31], // 왼발 끝점
  [30, 32], // 오른발 끝점
];

const Render3D = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const meshRef = useRef<THREE.Mesh[]>([]);
  
  const loadWebCam = async () => {
    if (videoRef.current) {
      videoRef.current.srcObject = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play();
        }
      };
    }
  };

  const initializeBlazePose = async () => {
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.BlazePose,
      {
        runtime: "mediapipe",
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose",
      }
    );

    detectorRef.current = detector;
  };

  const initializeScene = () => {
    const mount = mountRef.current; // ref로 참조한 DOM 요소를 변수에 할당
    if (!mount) {
      console.error("Mount element not found"); // mount가 null인 경우 에러 메시지 출력 
      return; // DOM 요소가 존재하지 않으면 함수를 종료
    }

    // Three.js의 Scene(장면) 생성
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Three.js의 Camera(카메라) 생성
    const camera = new THREE.PerspectiveCamera(103, mount.clientWidth/mount.clientHeight, 0.1, 1000);
    camera.position.z = 1;
    camera.position.y = 0;
    camera.position.x = 0;
    camera.lookAt(0, 0, 0); // 카메라가 바라보는 방향 설정

    // Three.js의 Renderer(렌더러) 생성
    const renderer = new THREE.WebGLRenderer(); // 부드러운 가장자리를 위해 antialias 옵션 활성화
    renderer.setSize(mount.clientWidth , mount.clientHeight); // 렌더러의 크기를 DOM 요소의 크기에 맞게 설정
    renderer.setClearColor(0x000000);
    renderer.render(scene, camera); // 장면과 카메라를 렌더링

    const grid_xz = new THREE.GridHelper(5, 10); // 격자 무늬 생성
    grid_xz.position.y = -2.5; // 격자 무늬의 y축 위치 설정
    scene.add(grid_xz); // 격자 무늬를 장면에 추가
    
    const grid_xy = new THREE.GridHelper(5, 10); // 격자 무늬 생성
    grid_xy.position.z = -2.5; // 격자 무늬의 y축 위치 설정
    grid_xy.position.y = 0; // 격자 무늬의 y축 위치 설정
    grid_xy.rotation.x = Math.PI / 2; // 격자 무늬의 회전 설정
    scene.add(grid_xy); // 격자 무늬를 장면에 추가

    const grid_yz = new THREE.GridHelper(5, 10); // 격자 무늬 생성
    grid_yz.position.x = -2.5; // 격자 무늬의 y축 위치 설정
    grid_yz.position.y = 0; // 격자 무늬의 y축 위치 설정
    grid_yz.rotation.z = Math.PI / 2; // 격자 무늬의 회전 설정
    scene.add(grid_yz); // 격자 무늬를 장면에 추가

    const geometry = new THREE.SphereGeometry(0.02, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    for (let i = 0; i < 33; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, -100, 0); // z축은 0으로 설정
      meshRef.current.push(mesh); // 생성된 메쉬를 배열에 추가
      scene.add(mesh); // 메쉬를 장면에 추가
    }
    
    // 머리용 타원 구체 생성
    const headGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    headGeometry.scale(1, 1.3, 1); // y축으로 길이를 늘려 타원으로 만듦
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.set(0, -100, 0); // 초기 위치 설정
    meshRef.current[0] = headMesh; // 머리는 인덱스 0으로 설정
    scene.add(headMesh);

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    POSE_CONNECTIONS.forEach(([start, end]) => {
      const points = [
        meshRef.current[start].position,
        meshRef.current[end].position,
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      scene.add(line);
    });

    const animate = () => {
      requestAnimationFrame(animate); // 다음 애니메이션 프레임 요청
      renderer.render(scene, camera); // 장면과 카메라를 렌더링
    }
    animate();

    mount.appendChild(renderer.domElement); // 생성된 렌더러를 DOM 요소에 추가
  }

  const detectPose = async () => {
    if (
      detectorRef.current &&
      videoRef.current &&
      videoRef.current.readyState === 4 &&
      mountRef.current
    ) {
      const poses = await detectorRef.current.estimatePoses(videoRef.current);
      drawResults(poses);
    }
    requestAnimationFrame(detectPose);
  };

  const drawResults = (poses: any) => {
    const scene = sceneRef.current;
    if (!scene || !videoRef.current) return;
  
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
  
    poses.forEach((pose: any) => {
      const keypoints = pose.keypoints;
      keypoints.forEach((keypoint: any, index: number) => {
        if (keypoint.score > 0.5) {
          let { x, y, z } = keypoint;
  
          const threeX = (x / videoWidth) * 2 - 1;
          const threeY = -(y / videoHeight) * 2 + 1;
          const threeZ = -z / 100; // 깊이값(z)의 scale 조정
  
          const mesh = meshRef.current[index];
          if (mesh) {
            if (index === 0) {
              mesh.position.set(threeX, threeY, threeZ-0.1);
            }
            else {
              mesh.position.set(threeX, threeY, threeZ);
            }
          }
        }
        else {
          const mesh = meshRef.current[index];
          if (mesh) {
            mesh.position.set(0, -100, 0);
          }
        }
      });
    });
  };

  useEffect(() => {
    loadWebCam();
    initializeBlazePose();
    initializeScene();
    detectPose();
  }, []);

  return (
    <div className="flex items-center justify-center gap-4 mt-4 h-full">
      <video ref={videoRef} className="rounded-xl w-1/2" />
      <div
        ref={mountRef}
        className="rounded-xl w-1/2 h-full border-2 border-gray-300"
      />
    </div>
  );
};

export default Render3D;