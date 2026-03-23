import * as React from "react";
import { cn } from "@/utils";

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, min = 0, max = 100, step = 1, onChange, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange?.(Number(e.target.value))}
      className={cn(
        "w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500",
        className
      )}
      {...props}
    />
  )
);
Slider.displayName = "Slider";

export { Slider };
