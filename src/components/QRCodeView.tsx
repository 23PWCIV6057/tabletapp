"use client";

import { useMemo } from "react";
import { generateQRCodeMatrix } from "@/lib/qr";

interface QRCodeViewProps {
  value: string;
  size?: number;
  className?: string;
  label?: string;
}

export default function QRCodeView({ value, size = 200, className = "", label }: QRCodeViewProps) {
  const matrix = useMemo(() => {
    try {
      return generateQRCodeMatrix(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-xs text-slate-400"
      >
        QR generation error
      </div>
    );
  }

  const dimension = matrix.length;
  const padding = 2;
  const totalDim = dimension + padding * 2;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalDim} ${totalDim}`}
        width={size}
        height={size}
        className="rounded-2xl bg-white p-3 shadow-md"
      >
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c + padding}
                y={r + padding}
                width={1}
                height={1}
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
      {label && <p className="mt-2 text-xs font-semibold tracking-wide text-slate-500">{label}</p>}
    </div>
  );
}
