import { cn } from "@/lib/utils.ts";
import type { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  variant = "ghost",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ghost" | "outline" | "default"; size?: "md" | "sm" | "icon-sm" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xs text-sm transition-colors",
        size === "md" && "min-h-9 px-3",
        size === "sm" && "min-h-8 px-2.5 text-xs",
        size === "icon-sm" && "size-8",
        variant === "ghost" && "text-muted hover:bg-surface hover:text-fg",
        variant === "outline" && "border border-border text-fg hover:bg-surface",
        variant === "default" && "bg-primary text-primary-fg hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}
