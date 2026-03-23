import * as React from "react";
import { cn } from "@/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const variantStyles: Record<string, string> = {
  default: "bg-indigo-600 text-white hover:bg-indigo-700",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  outline: "border border-zinc-600 bg-transparent hover:bg-zinc-800 text-zinc-200",
  secondary: "bg-zinc-700 text-zinc-200 hover:bg-zinc-600",
  ghost: "hover:bg-zinc-800 text-zinc-300",
  link: "text-indigo-400 underline-offset-4 hover:underline",
};

const sizeStyles: Record<string, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-8 w-8",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button };
