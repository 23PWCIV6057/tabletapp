"use client";

import { useMemo } from "react";
import { generateQRCodeMatrix } from "@/lib/qr";

interface QRCodeViewProps {
  value: string;
  size?: number;
  className?: string;
  label?: string;
}

export default function QRCodeView({
  value,
  size = 200,
  className = "",
  label,
}: QRCodeViewProps) {
  const qrRender = useMemo(() => {
    try {
      const matrix = generateQRCodeMatrix(value);
      const dimension = matrix.length;
      // ISO/IEC 18004 standard requires a 4-module quiet zone around the QR code
      const padding = 4;
      const totalDim = dimension + padding * 2;
      const segments: string[] = [];
      for (let r = 0; r < dimension; r++) {
        for (let c = 0; c < dimension; c++) {
          if (matrix[r][c]) {
            segments.push(`M${c + padding},${r + padding}h1v1h-1z`);
          }
        }
      }
      return { totalDim, pathData: segments.join("") };
    } catch {
      return null;
    }
  }, [value]);

  if (!qrRender) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-xs text-slate-400"
      >
        QR generation error
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${qrRender.totalDim} ${qrRender.totalDim}`}
        width={size}
        height={size}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`QR Code for ${value}`}
        className="rounded-2xl bg-white p-2 shadow-md"
      >
        <rect width={qrRender.totalDim} height={qrRender.totalDim} fill="#ffffff" />
        <path d={qrRender.pathData} fill="#000000" />
      </svg>
      {label && (
        <p className="mt-2 text-xs font-semibold tracking-wide text-slate-500">{label}</p>
      )}
    </div>
  );
}
