import * as React from "react";
import { cn } from "@/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
}

export function Progress({ value, className, ...props }: ProgressProps) {
  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-zinc-800", className)}
      {...props}
    >
      <div
        className="h-full bg-indigo-500 transition-all duration-300 ease-in-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
