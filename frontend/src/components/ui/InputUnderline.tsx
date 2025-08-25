import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  rightSlot?: React.ReactNode;
};

export default function InputUnderline({ label, hint, rightSlot, className, ...props }: Props) {
  const baseClasses = [
    "w-full bg-transparent outline-none border-0 border-b",
    "border-neutral-300 focus:border-neutral-900",
    "placeholder:opacity-60 py-2 transition-colors"
  ].join(" ");
  
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <label className="block">
      {label && <span className="block text-sm font-medium mb-1">{label}</span>}
      <div className="flex items-center gap-2">
        <input
          {...props}
          className={combinedClasses}
        />
        {rightSlot}
      </div>
      {hint && <p className="text-xs opacity-70 mt-1">{hint}</p>}
    </label>
  );
}
