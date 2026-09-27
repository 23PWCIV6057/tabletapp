"use client";

import { useState } from "react";
import { verifyPin } from "@/lib/auth";

interface PinModalProps {
  requestedRole: "kitchen" | "owner";
  isOpen: boolean;
  onSuccess: (role: "kitchen" | "owner") => void;
  onClose: () => void;
}

export default function PinModal({ requestedRole, isOpen, onSuccess, onClose }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError(null);

    if (nextPin.length === 4) {
      // Auto-submit on 4th digit
      validatePin(nextPin);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const validatePin = (codeToTest: string) => {
    const res = verifyPin(codeToTest, requestedRole);
    if (res.success) {
      setPin("");
      setError(null);
      onSuccess(requestedRole);
    } else {
      setError(res.error || "Incorrect PIN");
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPin("");
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-sm rounded-[32px] border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl transition-transform ${
          isShaking ? "animate-[bounce_0.2s_ease-in-out_infinite]" : ""
        }`}
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-xl font-black">
            {requestedRole === "kitchen" ? "Staff Kitchen Access" : "Manager Dashboard Access"}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Enter authorized 4-digit PIN to unlock
          </p>
        </div>

        {/* PIN Dots */}
        <div className="my-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? "scale-110 bg-amber-400 ring-4 ring-amber-400/20"
                    : "border-2 border-slate-700 bg-slate-800"
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="mb-4 text-center text-xs font-semibold text-rose-400 animate-pulse">
            {error}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="flex h-12 items-center justify-center rounded-2xl bg-slate-800/80 text-lg font-bold text-white transition hover:bg-slate-700 active:scale-95 active:bg-slate-600"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-800/40 text-xs font-semibold text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-800/80 text-lg font-bold text-white transition hover:bg-slate-700 active:scale-95 active:bg-slate-600"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-800/40 text-sm font-semibold text-slate-300 hover:bg-slate-800 active:scale-95"
          >
            ⌫
          </button>
        </div>

        {/* Demo PIN hints for testing */}
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-center text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">Staff PIN:</span> 1234 &nbsp;•&nbsp;{" "}
          <span className="font-semibold text-slate-300">Manager PIN:</span> 8888
        </div>
      </div>
    </div>
  );
}
