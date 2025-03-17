"use client";

import { useEffect, useRef, useState } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import { Pose } from "@mediapipe/pose";

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

const BlazePoseComponent = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);

  const [poseMarker, setPoseMarker] = useState<Pose | null>(null);

  useEffect(() => {
    const detectPose = async () => {
      if (
        detectorRef.current &&
        videoRef.current &&
        videoRef.current.readyState === 4 &&
        canvasRef.current
      ) {
        const poses = await detectorRef.current.estimatePoses(videoRef.current);
        drawResults(poses);
      }
      requestAnimationFrame(detectPose);
    };

    const drawResults = (poses: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      poses.forEach((pose: any) => {
        const keypoints = pose.keypoints;

        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        POSE_CONNECTIONS.forEach(([start, end]) => {
          const p1 = keypoints[start];
          const p2 = keypoints[end];

          if (p1.score > 0.5 && p2.score > 0.5) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });

        keypoints.forEach((keypoint: any) => {
          if (keypoint.score > 0.5) {
            const { x, y } = keypoint;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "red";
            ctx.fill();
          }
        });
      });
    };

    detectPose();
  }, []);

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

  useEffect(() => {
    loadWebCam();
    initializeBlazePose();
  }, []);

  return (
    <div className="flex items-center justify-center gap-4 mt-4">
      <video ref={videoRef} className="rounded-xl" />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="rounded-xl"
      />
    </div>
  );
};

export default BlazePoseComponent;