"use client";

import { useCallback, useEffect, useState } from "react";
import { verifyPinServer } from "@/lib/auth";
import { LockIcon } from "./Icons";

interface PinModalProps {
  requestedRole: "kitchen" | "owner";
  isOpen: boolean;
  onSuccess: (role: "kitchen" | "owner") => void;
  onClose: () => void;
  restaurantSlug?: string;
}

export default function PinModal({ requestedRole, isOpen, onSuccess, onClose, restaurantSlug }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const validatePin = useCallback(
    async (codeToTest: string) => {
      setIsVerifying(true);
      const res = await verifyPinServer(codeToTest, requestedRole, restaurantSlug);
      setIsVerifying(false);

      if (res.success) {
        setPin("");
        setError(null);
        onSuccess(res.role || requestedRole);
      } else {
        setError(res.error || "Incorrect PIN");
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setPin("");
        }, 600);
      }
    },
    [requestedRole, onSuccess]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (isVerifying) return;
      setPin((prev) => {
        if (prev.length >= 4) return prev;
        const nextPin = prev + digit;
        setError(null);
        if (nextPin.length === 4) {
          setTimeout(() => validatePin(nextPin), 0);
        }
        return nextPin;
      });
    },
    [validatePin, isVerifying]
  );

  const handleBackspace = useCallback(() => {
    if (isVerifying) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }, [isVerifying]);

  // Support physical keyboard entry (0-9, Backspace, Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleBackspace, handleDigit]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-sm rounded-[32px] border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl transition-transform ${
          isShaking ? "animate-[bounce_0.2s_ease-in-out_infinite]" : ""
        }`}
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <LockIcon size={26} />
          </div>
          <h3 id="pin-modal-title" className="font-display mt-4 text-xl font-bold">
            {requestedRole === "kitchen" ? "Staff Kitchen Access" : "Manager Dashboard Access"}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {isVerifying
              ? "Verifying credentials..."
              : "Enter authorized 4-digit PIN (keypad or keyboard)"}
          </p>
        </div>

        {/* PIN Dots */}
        <div className="my-6 flex justify-center gap-3" aria-label={`PIN ${pin.length} of 4 digits entered`}>
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
          <p role="alert" className="mb-4 text-center text-xs font-semibold text-rose-400 animate-pulse">
            {error}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isVerifying}
              onClick={() => handleDigit(num)}
              className="flex h-12 items-center justify-center rounded-2xl bg-slate-800/80 text-lg font-bold text-white transition hover:bg-slate-700 active:scale-95 active:bg-slate-600 disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-800/40 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleDigit("0")}
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-800/80 text-lg font-bold text-white transition hover:bg-slate-700 active:scale-95 active:bg-slate-600 disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            aria-label="Backspace"
            disabled={isVerifying}
            onClick={handleBackspace}
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-800/40 text-sm font-semibold text-slate-300 hover:bg-slate-800 active:scale-95 disabled:opacity-50"
          >
            ⌫
          </button>
        </div>

        {/* Demo PIN hints for testing */}
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-center text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Staff PIN:</span> 1234 &nbsp;•&nbsp;{" "}
          <span className="font-semibold text-slate-300">Manager PIN:</span> 8888
        </div>
      </div>
    </div>
  );
}
