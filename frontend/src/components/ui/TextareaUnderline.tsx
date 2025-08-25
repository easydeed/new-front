import * as React from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
};

export default function TextareaUnderline({ label, hint, className, ...props }: Props) {
  const baseClasses = [
    "w-full bg-transparent outline-none border-0 border-b",
    "border-neutral-300 focus:border-neutral-900",
    "placeholder:opacity-60 py-2 transition-colors min-h-[140px]"
  ].join(" ");
  
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <label className="block">
      {label && <span className="block text-sm font-medium mb-1">{label}</span>}
      <textarea
        {...props}
        className={combinedClasses}
      />
      {hint && <p className="text-xs opacity-70 mt-1">{hint}</p>}
    </label>
  );
}
