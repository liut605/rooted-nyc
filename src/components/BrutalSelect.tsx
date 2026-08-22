import React, { useEffect, useRef, useState } from 'react';

export interface BrutalSelectOption {
  value: string;
  label: string;
}

export const BrutalSelect: React.FC<{
  value: string;
  options: BrutalSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  menuClassName?: string;
  fullWidth?: boolean;
}> = ({ value, options, onChange, ariaLabel, className = '', menuClassName = '', fullWidth = false }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative pointer-events-auto ${fullWidth ? 'w-full' : ''}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`nb-press flex items-center gap-4 bg-[#fbf7ff] text-[#3f3f3f] border-2 border-[#3f3f3f] shadow-[4px_4px_0_0_#3f3f3f] rounded-[15px] ${
          fullWidth ? 'w-full' : ''
        } ${open ? 'is-pressed' : ''} ${className}`}
      >
        <span className="flex-1 text-left font-normal whitespace-nowrap overflow-hidden text-ellipsis">{selected?.label}</span>
        <img
          src="/figma-map/chevron.svg"
          alt=""
          className={`w-[19px] h-[9px] shrink-0 transition-transform duration-[120ms] ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-30 mt-2 min-w-full max-h-64 overflow-y-auto bg-[#fbf7ff] border-2 border-[#3f3f3f] rounded-[15px] shadow-[4px_4px_0_0_#3f3f3f] py-1 ${menuClassName}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left font-normal tracking-[-0.05em] transition-colors duration-[120ms] ${
                    isSelected
                      ? 'bg-[#d8f6e7] text-[#3f3f3f]'
                      : 'text-[#3f3f3f] hover:bg-[#ede8f7] active:bg-[#d8f6e7]'
                  }`}
                >
                  <span
                    className="size-[18px] shrink-0 rounded-full border-2 border-[#3f3f3f] flex items-center justify-center"
                    aria-hidden
                  >
                    {isSelected && (
                      <svg viewBox="0 0 16 16" className="size-3" fill="none">
                        <path
                          d="M3.2 8.2l3 3.1 6.6-6.8"
                          stroke="#306a4e"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="whitespace-nowrap">{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
