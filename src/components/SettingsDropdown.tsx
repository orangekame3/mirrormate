"use client";

import { useState, useRef, useEffect } from "react";

interface SettingsDropdownProps<T> {
  label: string;
  items: T[];
  selectedId: string | number | null;
  onSelect: (id: string | number) => void;
  getId: (item: T) => string | number;
  renderItem: (item: T) => React.ReactNode;
  renderSelected: (item: T | null) => React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
}

export function SettingsDropdown<T>({
  label,
  items,
  selectedId,
  onSelect,
  getId,
  renderItem,
  renderSelected,
  disabled = false,
  placeholder = "Select...",
}: SettingsDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((item) => getId(item) === selectedId) ?? null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-white/40 text-xs block mb-1">{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2 px-3 py-2 rounded-lg
          bg-zinc-800 border border-zinc-700 min-w-[160px] text-left
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-700 cursor-pointer"}
          transition-colors
        `}
      >
        <span className="text-white/80 text-sm truncate">
          {selectedItem ? renderSelected(selectedItem) : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] max-h-[300px] overflow-y-auto rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl">
          {items.length === 0 ? (
            <div className="px-3 py-2 text-white/40 text-sm">No items</div>
          ) : (
            items.map((item) => {
              const id = getId(item);
              const isSelected = id === selectedId;
              return (
                <button
                  key={String(id)}
                  type="button"
                  onClick={() => {
                    onSelect(id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-3 py-2 text-left text-sm
                    ${isSelected ? "bg-zinc-700 text-white" : "text-white/70 hover:bg-zinc-700/50 hover:text-white/90"}
                    transition-colors
                  `}
                >
                  {renderItem(item)}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
