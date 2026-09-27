"use client";

import { useState } from "react";
import { MenuItem, OrderItem } from "@/types";

interface DishCustomizeModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (orderItem: OrderItem) => void;
}

export default function DishCustomizeModal({
  item,
  isOpen,
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

  if (!isOpen || !item) return null;

  // Calculate total price with chosen modifiers
  let modifierExtra = 0;
  const chosenModifierList: { groupName: string; optionName: string; priceDelta: number }[] = [];

  if (item.modifierGroups) {
    item.modifierGroups.forEach((group) => {
      const selectedOptionId = selectedModifiers[group.id];
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl text-slate-900 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {item.tag}
              </span>
              {item.prepTimeMinutes && (
                <span className="text-xs font-medium text-slate-500">
                  ⏱ ~{item.prepTimeMinutes} mins
                </span>
              )}
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{item.name}</h2>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.description}</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Modifiers */}
        {item.modifierGroups && item.modifierGroups.length > 0 && (
          <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">
            {item.modifierGroups.map((group) => (
              <div key={group.id}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    {group.name}
                  </h4>
                  {group.required && (
                    <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">
                      Required
                    </span>
                  )}
                </div>
                <div className="mt-2.5 space-y-2">
                  {group.options.map((opt) => {
                    const isSelected = selectedModifiers[group.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectModifier(group.id, opt.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                          isSelected
                            ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20"
                            : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-amber-500 bg-amber-500 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm font-medium text-slate-800">{opt.name}</span>
                        </div>
                        {opt.priceDelta > 0 && (
                          <span className="text-xs font-bold text-slate-600">
                            +${opt.priceDelta.toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Special Instructions */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Special Prep Instructions / Dietary Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Extra spicy, dressing on side, allergy to nuts..."
            rows={2}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white"
          />
        </div>

        {/* Quantity and Submit */}
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-100"
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm font-bold text-slate-900">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-100"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 rounded-full bg-amber-500 px-6 py-3.5 text-center text-sm font-black text-slate-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 active:scale-[0.99]"
          >
            Add to Order • ${totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
