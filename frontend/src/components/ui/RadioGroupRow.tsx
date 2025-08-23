import * as React from "react";

type Option = { label: string; value: string };

export default function RadioGroupRow({
  label,
  name,
  value,
  onChange,
  options
}: {
  label?: string;
  name: string;
  value?: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <div>
      {label && <div className="text-sm font-medium mb-1">{label}</div>}
      <div className="flex flex-wrap gap-4">
        {options.map((opt) => (
          <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange(e.target.value)}
              className="accent-neutral-900"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
