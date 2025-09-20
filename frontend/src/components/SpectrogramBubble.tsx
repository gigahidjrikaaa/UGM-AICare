import React, { useCallback, useEffect, useMemo, useRef } from "react";

type SpectrogramBubbleProps = {
  isActive: boolean;
  data: number[];
};

const DEFAULT_BAR_COUNT = 16;
const HISTORY_LENGTH = 48;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const SpectrogramBubble: React.FC<SpectrogramBubbleProps> = ({ isActive, data }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const framesRef = useRef<number[][]>([]);
  const fadeRafRef = useRef<number | null>(null);

  const normalizedFrame = useMemo(() => {
    if (!data || data.length === 0) {
      return Array(DEFAULT_BAR_COUNT).fill(0);
    }

    const frame = Array(DEFAULT_BAR_COUNT).fill(0);
    const length = Math.min(DEFAULT_BAR_COUNT, data.length);
    for (let i = 0; i < length; i += 1) {
      frame[i] = clamp(data[i] ?? 0);
    }

    return frame;
  }, [data]);

  const drawSpectrogram = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * dpr;
    const height = canvas.clientHeight * dpr;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    const frames = framesRef.current;
    if (frames.length === 0) {
      return;
    }

    const barCount = frames[0]?.length ?? DEFAULT_BAR_COUNT;
    const columnWidth = width / HISTORY_LENGTH;
    const rowHeight = height / barCount;
    const offset = Math.max(0, HISTORY_LENGTH - frames.length);

    frames.forEach((frame, frameIndex) => {
      const x = (frameIndex + offset) * columnWidth;
      frame.forEach((value, rowIndex) => {
        const intensity = Math.pow(value, 0.9);
        const hue = 212 - intensity * 140;
        const lightness = 32 + intensity * 52;
        const alphaBase = isActive ? 0.28 : 0.16;
        const alpha = alphaBase + intensity * (isActive ? 0.6 : 0.4);

        ctx.fillStyle = `hsla(${hue}, 94%, ${lightness}%, ${alpha})`;
        const y = height - (rowIndex + 1) * rowHeight;
        ctx.fillRect(x, y, columnWidth + 1, rowHeight + 1);
      });
    });

    const glow = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.15,
      width / 2,
      height / 2,
      width * 0.75,
    );
    glow.addColorStop(0, `rgba(120, 170, 255, ${isActive ? 0.22 : 0.1})`);
    glow.addColorStop(1, "rgba(120,170,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }, [isActive]);

  useEffect(() => {
    const frames = framesRef.current;
    frames.push([...normalizedFrame]);
    if (frames.length > HISTORY_LENGTH) {
      frames.shift();
    }
    drawSpectrogram();
  }, [normalizedFrame, drawSpectrogram]);

  useEffect(() => {
    if (isActive) {
      if (fadeRafRef.current) {
        cancelAnimationFrame(fadeRafRef.current);
        fadeRafRef.current = null;
      }
      return;
    }

    const fadeDown = () => {
      const frames = framesRef.current;
      let hasEnergy = false;

      frames.forEach((frame) => {
        for (let i = 0; i < frame.length; i += 1) {
          frame[i] *= 0.9;
          if (frame[i] > 0.01) {
            hasEnergy = true;
          }
        }
      });

      drawSpectrogram();

      if (hasEnergy) {
        fadeRafRef.current = requestAnimationFrame(fadeDown);
      } else {
        fadeRafRef.current = null;
      }
    };

    fadeRafRef.current = requestAnimationFrame(fadeDown);

    return () => {
      if (fadeRafRef.current) {
        cancelAnimationFrame(fadeRafRef.current);
        fadeRafRef.current = null;
      }
    };
  }, [isActive, drawSpectrogram]);

  useEffect(() => {
    const handleResize = () => drawSpectrogram();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawSpectrogram]);

  return (
    <div
      className={`relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 transition-shadow duration-500 ${
        isActive ? "shadow-[0_0_36px_rgba(110,156,255,0.45)]" : "shadow-[0_0_22px_rgba(110,156,255,0.2)]"
      }`}
    >
      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-[#12296c]/85 via-[#193a92]/70 to-[#274cc6]/65" />
      <div className="relative z-10 flex h-[72%] w-[72%] items-center justify-center rounded-full overflow-hidden">
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
      <div className="absolute inset-0 rounded-full border border-white/15" />
    </div>
  );
};

export default SpectrogramBubble;
