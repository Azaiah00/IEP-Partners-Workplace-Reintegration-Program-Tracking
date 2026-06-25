import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary",
        secondary: "bg-raised text-muted-foreground",
        outline: "border border-border text-foreground",
        success: "bg-[#5FE08A]/15 text-[#5FE08A]",
        danger: "bg-[#FF6B6B]/15 text-[#FF6B6B]",
        info: "bg-[#5B9DFF]/15 text-[#5B9DFF]",
        violet: "bg-[#A78BFA]/15 text-[#A78BFA]",
        warning: "bg-[#F5B14C]/15 text-[#F5B14C]",
        muted: "bg-muted-foreground/10 text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
