import * as React from "react";
import InputUnderline from "./InputUnderline";

export default function MoneyInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <InputUnderline
      {...props}
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      rightSlot={<span className="text-sm opacity-70">$</span>}
    />
  );
}
