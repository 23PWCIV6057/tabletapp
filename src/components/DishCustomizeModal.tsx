"use client";

import { useEffect, useState } from "react";
import { CurrencyCode, MenuItem, OrderItem } from "@/types";
import { formatPrice } from "@/lib/geo";
import { ClockIcon, XIcon } from "./Icons";

interface DishCustomizeModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  currency?: CurrencyCode;
  onClose: () => void;
  onAddToCart: (orderItem: OrderItem) => void;
}

export default function DishCustomizeModal({
  item,
  isOpen,
  currency = "PKR",
  onClose,
  onAddToCart,
}: DishCustomizeModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string>>(() => {
    if (!item?.modifierGroups) return {};
    const init: Record<string, string> = {};
    item.modifierGroups.forEach((group) => {
      if (group.options.length > 0) {
        init[group.id] = group.options[0].id;
      }
    });
    return init;
  });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  // Calculate total price with chosen modifiers
  let modifierExtra = 0;
  const chosenModifierList: { groupName: string; optionName: string; priceDelta: number }[] = [];

  if (item.modifierGroups) {
    item.modifierGroups.forEach((group) => {
      const selectedOptionId = selectedModifiers[group.id] || group.options[0]?.id;
      const opt = group.options.find((o) => o.id === selectedOptionId);
      if (opt) {
        modifierExtra += opt.priceDelta;
        chosenModifierList.push({
          groupName: group.name,
          optionName: opt.name,
          priceDelta: opt.priceDelta,
        });
      }
    });
  }

  const unitPrice = item.price + modifierExtra;
  const totalPrice = unitPrice * quantity;

  const handleSelectModifier = (groupId: string, optionId: string) => {
    setSelectedModifiers((prev) => ({ ...prev, [groupId]: optionId }));
  };

  const handleAdd = () => {
    const orderItem: OrderItem = {
      itemId: item.id,
      name: item.name,
      basePrice: item.price,
      selectedModifiers: chosenModifierList,
      quantity,
      unitPrice,
      totalPrice,
      specialInstructions: notes.trim() || undefined,
    };
    onAddToCart(orderItem);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-dish-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 sm:items-center sm:p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl text-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900">
                {item.tag}
              </span>
              {item.prepTimeMinutes && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                  <ClockIcon size={13} />
                  <span>~{item.prepTimeMinutes} mins</span>
                </span>
              )}
            </div>
            <h2 id="customize-dish-title" className="font-display mt-2 text-2xl font-bold text-slate-900">
              {item.name}
            </h2>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.description}</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close dish customization modal"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Modifiers */}
        {item.modifierGroups && item.modifierGroups.length > 0 && (
          <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">
            {item.modifierGroups.map((group) => {
              const currentSelection = selectedModifiers[group.id] || group.options[0]?.id;
              return (
                <div key={group.id}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {group.name}
                    </h4>
                    {group.required && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 space-y-2">
                    {group.options.map((opt) => {
                      const isSelected = currentSelection === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectModifier(group.id, opt.id)}
                          className={`flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                            isSelected
                              ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20"
                              : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                isSelected
                                  ? "border-amber-600 bg-amber-600 text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{opt.name}</span>
                          </div>
                          {opt.priceDelta > 0 && (
                            <span className="tabular-nums text-xs font-bold text-slate-700">
                              +{formatPrice(opt.priceDelta, currency)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Special Instructions */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <label
            htmlFor="special-prep-notes"
            className="block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Special Prep Instructions / Dietary Notes
          </label>
          <textarea
            id="special-prep-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Extra spicy, dressing on side, allergy to nuts..."
            rows={2}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:bg-white"
          />
        </div>

        {/* Quantity and Submit */}
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-base font-bold text-slate-700 shadow-sm hover:bg-slate-100"
            >
              −
            </button>
            <span className="tabular-nums min-w-8 text-center text-sm font-black text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-base font-bold text-slate-700 shadow-sm hover:bg-slate-100"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="tabular-nums min-h-12 flex-1 rounded-full bg-amber-500 px-6 py-3.5 text-center text-sm font-black text-slate-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 active:scale-[0.99]"
          >
            Add to Order • {formatPrice(totalPrice, currency)}
          </button>
        </div>
      </div>
    </div>
  );
}
