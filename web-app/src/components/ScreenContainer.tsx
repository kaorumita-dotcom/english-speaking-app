import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ScreenContainerProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

/**
 * A container component for screen layouts
 *
 * Usage:
 * ```tsx
 * <ScreenContainer className="p-4">
 *   <h1 className="text-2xl font-bold text-foreground">
 *     Welcome
 *   </h1>
 * </ScreenContainer>
 * ```
 */
export function ScreenContainer({
  children,
  className,
  containerClassName,
}: ScreenContainerProps) {
  return (
    <div
      className={cn(
        "min-h-screen",
        "bg-background",
        containerClassName
      )}
    >
      <div className={cn("h-full", className)}>{children}</div>
    </div>
  );
}
