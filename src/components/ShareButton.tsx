"use client";
import { useCallback, useState } from "react";
import { HistoryEvent } from "@/lib/types";
import { formatYear, yearDisplay } from "@/lib/format-year";
import styles from "./ShareButton.module.css";

interface Props {
  event: HistoryEvent;
  monthShort: string;
  day: number;
  revealed: boolean;
}

function drawMultilineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, cy);
      line = word + " ";
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, cy);
  return cy + lineHeight;
}

async function renderShareCanvas(
  event: HistoryEvent,
  monthShort: string,
  day: number
): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, W, H);

  // Load image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Image failed"));
    i.src = event.image_url;
  });

  // Draw image as cover (fill width, crop height)
  const imgRatio = img.width / img.height;
  const canvasRatio = W / H;
  let sw: number, sh: number, sx: number, sy: number;
  if (imgRatio > canvasRatio) {
    sh = img.height;
    sw = sh * canvasRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / canvasRatio;
    sx = 0;
    sy = img.height * 0.1; // bias toward top (faces)
    if (sy + sh > img.height) sy = img.height - sh;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);

  // Depth overlay gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(5,4,3,0.5)");
  grad.addColorStop(0.1, "rgba(5,4,3,0.15)");
  grad.addColorStop(0.22, "rgba(5,4,3,0)");
  grad.addColorStop(0.32, "rgba(5,4,3,0)");
  grad.addColorStop(0.45, "rgba(5,4,3,0.35)");
  grad.addColorStop(0.6, "rgba(5,4,3,0.8)");
  grad.addColorStop(0.78, "rgba(5,4,3,0.97)");
  grad.addColorStop(0.9, "rgba(5,4,3,1)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Vignette
  const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.9);
  vignette.addColorStop(0, "rgba(5,4,3,0)");
  vignette.addColorStop(1, "rgba(5,4,3,0.6)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Museum frame
  ctx.strokeStyle = "rgba(195,155,85,0.06)";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // Corner marks
  const cm = 36;
  const cSize = 36;
  ctx.strokeStyle = "rgba(195,155,85,0.12)";
  ctx.lineWidth = 2;
  // Top-left
  ctx.beginPath(); ctx.moveTo(cm, cm); ctx.lineTo(cm + cSize, cm); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cm, cm); ctx.lineTo(cm, cm + cSize); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(W - cm, cm); ctx.lineTo(W - cm - cSize, cm); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - cm, cm); ctx.lineTo(W - cm, cm + cSize); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(cm, H - cm); ctx.lineTo(cm + cSize, H - cm); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cm, H - cm); ctx.lineTo(cm, H - cm - cSize); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(W - cm, H - cm); ctx.lineTo(W - cm - cSize, H - cm); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - cm, H - cm); ctx.lineTo(W - cm, H - cm - cSize); ctx.stroke();

  const pad = 54;
  const fontFamily = getComputedStyle(document.documentElement).fontFamily.split(",")[0].replace(/'/g, "").trim();
  const font = (weightSize: string, style = "") =>
    `${style} ${weightSize} '${fontFamily}'`.trim();

  // Header: "THIS DAY THAT YEAR"
  ctx.fillStyle = "rgba(195,155,85,0.6)";
  ctx.font = font("600 24px");
  ctx.letterSpacing = "7px";
  ctx.fillText("THIS DAY THAT YEAR", pad + 24, 80);
  ctx.letterSpacing = "0px";

  // Header right: month + day
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = font("600 22px");
  ctx.letterSpacing = "6px";
  ctx.textAlign = "right";
  ctx.fillText(monthShort, W - pad, 72);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.font = font("800 110px");
  ctx.fillText(String(day), W - pad, 170);
  ctx.textAlign = "left";

  // Dot
  ctx.fillStyle = "#c9a44e";
  ctx.beginPath();
  ctx.arc(pad + 6, 74, 7, 0, Math.PI * 2);
  ctx.fill();

  // Content area — starts from bottom
  let y = H - 80;

  // Bottom rule line
  const ruleGrad = ctx.createLinearGradient(pad, 0, pad + 600, 0);
  ruleGrad.addColorStop(0, "rgba(195,155,85,0.4)");
  ruleGrad.addColorStop(0.5, "rgba(195,155,85,0.15)");
  ruleGrad.addColorStop(1, "rgba(195,155,85,0)");
  ctx.fillStyle = ruleGrad;
  ctx.fillRect(pad, y, 600, 2);
  y -= 40;

  // Body text
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = font("400 30px");
  // Calculate body height first (draw from bottom up)
  const bodyLines: string[] = [];
  const bodyWords = event.text.split(" ");
  let bLine = "";
  for (const word of bodyWords) {
    const test = bLine + word + " ";
    if (ctx.measureText(test).width > 580 && bLine) {
      bodyLines.push(bLine.trim());
      bLine = word + " ";
    } else {
      bLine = test;
    }
  }
  if (bLine.trim()) bodyLines.push(bLine.trim());
  const bodyLH = 52;
  y -= bodyLines.length * bodyLH;
  for (let i = 0; i < bodyLines.length; i++) {
    ctx.fillText(bodyLines[i], pad, y + i * bodyLH + 30);
  }
  y -= 24;

  // Subtitle
  ctx.fillStyle = "rgb(220,190,110)";
  ctx.font = font("400 36px", "italic");
  ctx.fillText(event.subtitle, pad, y);
  y -= 16;

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = font("700 80px");
  const titleLines: string[] = [];
  const titleWords = event.title.split(" ");
  let tLine = "";
  for (const word of titleWords) {
    const test = tLine + word + " ";
    if (ctx.measureText(test).width > 900 && tLine) {
      titleLines.push(tLine.trim());
      tLine = word + " ";
    } else {
      tLine = test;
    }
  }
  if (tLine.trim()) titleLines.push(tLine.trim());
  y -= titleLines.length * 88;
  for (let i = 0; i < titleLines.length; i++) {
    ctx.fillText(titleLines[i], pad, y + i * 88 + 72);
  }
  y -= 16;

  // Accent line
  const acGrad = ctx.createLinearGradient(pad, 0, pad + 120, 0);
  acGrad.addColorStop(0, "rgba(195,155,85,0.6)");
  acGrad.addColorStop(1, "rgba(195,155,85,0)");
  ctx.fillStyle = acGrad;
  ctx.fillRect(pad, y, 120, 4);
  y -= 32;

  // Year
  ctx.fillStyle = "rgba(230,200,120,1)";
  ctx.font = font("800 260px");
  ctx.fillText(yearDisplay(event.year), pad, y);
  y -= 280;

  // Location
  ctx.fillStyle = "rgb(195,165,100)";
  ctx.font = font("600 24px");
  ctx.letterSpacing = "4px";
  ctx.fillText(event.location.toUpperCase(), pad + 20, y);
  ctx.letterSpacing = "0px";

  // Era label (side, vertical) — skip for simplicity in canvas

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export default function ShareButton({
  event,
  monthShort,
  day,
  revealed,
}: Props) {
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);

    try {
      const blob = await renderShareCanvas(event, monthShort, day);
      if (!blob) throw new Error("Failed to create image");

      const file = new File([blob], "this-day-that-year.png", {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "This Day That Year",
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "this-day-that-year.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.warn("Share failed:", err);
    } finally {
      setSharing(false);
    }
  }, [event, monthShort, day, sharing]);

  return (
    <button
      className={styles.shareBtn}
      onClick={handleShare}
      aria-label="Share"
      style={{
        opacity: revealed ? 1 : 0,
        transition: "opacity 1s ease 2.4s",
        pointerEvents: revealed ? "auto" : "none",
      }}
      disabled={sharing}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(195, 155, 85, 0.5)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    </button>
  );
}
