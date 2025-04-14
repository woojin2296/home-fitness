"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Pose } from "@mediapipe/pose";

import * as poseDetection from "@tensorflow-models/pose-detection";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const realtimeCanvasRef = useRef<HTMLCanvasElement>(null);
  const playCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const POSE_CONNECTIONS = [
    [1, 2],
    [2, 3],
    [4, 5],
    [5, 6],
    [9, 10],

    // 팔
    [11, 13],
    [13, 15], // 왼쪽 팔
    [12, 14],
    [14, 16], // 오른쪽 팔
    [15, 17],
    [15, 19],
    [15, 21], // 왼손 손가락
    [16, 18],
    [16, 20],
    [16, 22], // 오른손 손가락

    // 몸통
    [11, 12],
    [11, 23],
    [12, 24],
    [23, 24], // 어깨와 골반 연결

    // 다리
    [23, 25],
    [25, 27],
    [27, 29],
    [29, 31], // 왼쪽 다리 (발 포함)
    [24, 26],
    [26, 28],
    [28, 30],
    [30, 32], // 오른쪽 다리 (발 포함)

    // 손과 발 끝점
    [17, 19],
    [19, 21], // 왼손 손가락 끝
    [18, 20],
    [20, 22], // 오른손 손가락 끝
    [29, 31], // 왼발 끝점
    [30, 32], // 오른발 끝점
  ];

  const maxRecordingTime = 60 * 60;
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [recordTime, setRecodingTime] = useState(0);
  const [recordFileName, setRecodingFileName] = useState("");

  const currentData = useRef<poseDetection.Pose[]>([]);

  const [recordData, setRecordingData] = useState<poseDetection.Pose[]>([]);
  
  const playIndexRef = useRef(0);

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function getRecodingFileName() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}${hours}${minutes}${seconds}.csv`;
  }

  async function detectPose() {
    if (detectorRef.current && videoRef.current && videoRef.current.readyState === 4 && realtimeCanvasRef.current) {
      
      const poses = await detectorRef.current.estimatePoses(videoRef.current);
      currentData.current = poses;

      drawPose(poses);
    }

    requestAnimationFrame(detectPose);
  }

  function drawPose(poses: any) {
    const canvas = realtimeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    poses.forEach((pose: any) => {
      const keypoints = pose.keypoints;

      keypoints.forEach((keypoint: any) => {
        if (keypoint.score > 0.5) {
          const { x, y } = keypoint;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();
        }
      });

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
    });
  }

  function drawSinglePose(pose: any) {
    const canvas = playCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const keypoints = pose.keypoints;

    keypoints.forEach((keypoint: any) => {
      if (keypoint.score > 0.5) {
        const { x, y } = keypoint;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "blue";
        ctx.fill();
      }
    });

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
  }

  async function loadWebCam() {
    if (videoRef.current) {
      videoRef.current.srcObject = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play();
        }
      };
    }
  }
  
  async function initializeBlazePose() {
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
  }

  useEffect(() => {
    if (isRecording && recordTime <= maxRecordingTime) {
      setRecodingFileName(getRecodingFileName());

      const timer = setInterval(() => {
        setRecodingTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setRecodingTime(0);
      setRecodingFileName("");
    }
  }, [isRecording]);

  useEffect(() => {
    if (isPlaying && recordData.length > 0) {
      const interval = setInterval(() => {
        const currentIndex = playIndexRef.current;
        if (currentIndex < recordData.length) {
          drawSinglePose(recordData[currentIndex]);
          playIndexRef.current += 1;
        } 
        
        else {
          clearInterval(interval);
          setIsPlaying(false);
          playIndexRef.current = 0;
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      if (currentData.current[0]) {
        setRecordingData((prev) => [...prev, currentData.current[0]]);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    loadWebCam();
    initializeBlazePose();
    detectPose();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dev/pose">Dev</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Pose</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>3D Pose Estimation</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-4 mt-4">
            <video ref={videoRef} className="rounded-xl hidden"/>
            <canvas
              ref={realtimeCanvasRef}
              width={640}
              height={480}
              className="rounded-xl"
            />
            <canvas
              ref={playCanvasRef}
              width={640}
              height={480}
              className="rounded-xl"
            />
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Card className="w-[640px] flex items-center justify-center rounded-xl py-4 gap-4">
              {isRecording ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-48 flex items-center justify-center">
                    {recordFileName}
                  </div>
                  <Button
                    className="w-8 h-8 bg-red-500 hover:bg-red-600"
                    onClick={() => setIsRecording(false)}
                  />
                  <div className="w-48 flex items-center justify-center">
                    {formatTime(recordTime)} / 01:00:00
                  </div>
                </div>
              ) : (
                <Button
                  className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600"
                  onClick={() => setIsRecording(true)}
                />
              )}
            </Card>
            <Card className="w-[640px] flex items-center justify-center rounded-xl py-4">
              <Button onClick={() => setIsPlaying(true)}>Play</Button>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
