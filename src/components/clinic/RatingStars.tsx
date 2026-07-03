import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-4";

  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            i < Math.round(value)
              ? "fill-warning text-warning"
              : "fill-transparent text-muted-foreground"
          )}
        />
      ))}
    </div>
  );
}
