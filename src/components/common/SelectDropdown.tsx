import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectDropdownOption<T extends string | number = string> {
  value: T;
  label: string;
  shortLabel?: string;
  desc?: string;
  icon?: React.ReactNode;
}

export interface SelectDropdownProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectDropdownOption<T>[];
  label?: string;
  icon?: React.ReactNode;
  menuHeader?: string;
  size?: "xs" | "sm" | "md";
  align?: "left" | "right";
  width?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export function SelectDropdown<T extends string | number = string>({
  value,
  onChange,
  options,
  label,
  icon,
  menuHeader,
  size = "sm",
  align = "right",
  width = "w-60",
  className = "",
  buttonClassName = "",
  menuClassName = "",
  disabled = false,
}: SelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Size styling variants
  const sizeStyles = {
    xs: {
      button: "px-2 py-0.5 text-[11px] rounded-md gap-1.5",
      iconSize: "w-3 h-3",
      chevronSize: "w-3 h-3",
    },
    sm: {
      button: "px-2.5 py-1 text-xs rounded-lg gap-2",
      iconSize: "w-3.5 h-3.5",
      chevronSize: "w-3.5 h-3.5",
    },
    md: {
      button: "px-3 py-1.5 text-xs rounded-xl gap-2",
      iconSize: "w-4 h-4",
      chevronSize: "w-4 h-4",
    },
  }[size];

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between font-mono transition-all border cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${
          sizeStyles.button
        } ${
          isOpen
            ? "bg-neutral-800 text-white border-white/30 shadow-lg ring-1 ring-white/20"
            : "bg-neutral-850 hover:bg-neutral-800 text-neutral-200 hover:text-white border-white/15 hover:border-white/25 shadow-sm"
        } ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && <span className={`text-neutral-400 shrink-0 ${sizeStyles.iconSize}`}>{icon}</span>}
          {label && <span className="text-neutral-400 text-[11px] font-sans shrink-0">{label}</span>}
          <span className="font-semibold text-white tracking-tight truncate">
            {selectedOption?.shortLabel || selectedOption?.label || String(value)}
          </span>
        </div>
        <ChevronDown
          className={`text-neutral-400 transition-transform duration-200 shrink-0 ml-1.5 ${
            sizeStyles.chevronSize
          } ${isOpen ? "rotate-180 text-white" : ""}`}
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute top-full mt-1.5 rounded-xl bg-neutral-900 border border-white/20 shadow-2xl shadow-black/90 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
            align === "right" ? "right-0" : "left-0"
          } ${width} ${menuClassName}`}
        >
          {menuHeader && (
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold border-b border-white/[0.08] mb-1">
              {menuHeader}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    handleClose();
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer select-none ${
                    isSelected
                      ? "bg-white/12 text-white border border-white/20"
                      : "text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {opt.icon && <span className="shrink-0 text-neutral-400">{opt.icon}</span>}
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-xs ${
                          isSelected ? "font-bold text-white" : "font-medium text-neutral-200"
                        }`}
                      >
                        {opt.label}
                      </span>
                      {opt.desc && (
                        <span className="text-[10px] font-mono text-neutral-400 truncate">
                          {opt.desc}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

