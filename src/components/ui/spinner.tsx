import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { QuantumSpinner } from "@/components/ui/quantum-spinner";

const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
      xl: "h-12 w-12",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      current: "text-current",
    },
  },
  defaultVariants: {
    size: "md",
    tone: "muted",
  },
});

export interface SpinnerProps
  extends Omit<React.SVGAttributes<SVGSVGElement>, "ref">,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, tone, label = "Cargando", ...props }, ref) => (
    <Loader2
      ref={ref}
      role="status"
      aria-label={label}
      className={cn(spinnerVariants({ size, tone }), className)}
      {...props}
    />
  )
);
Spinner.displayName = "Spinner";

interface PageSpinnerProps {
  message?: string;
  className?: string;
  containerClassName?: string;
  size?: SpinnerProps["size"];
  tone?: SpinnerProps["tone"];
}

const quantumSizeMap: Record<NonNullable<SpinnerProps["size"]>, number> = {
  xs: 18,
  sm: 28,
  md: 45,
  lg: 60,
  xl: 80,
};

const quantumToneMap: Record<NonNullable<SpinnerProps["tone"]>, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  current: "text-current",
};

function PageSpinner({
  message,
  className,
  containerClassName,
  size = "md",
  tone = "muted",
}: PageSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12",
        containerClassName
      )}
    >
      <QuantumSpinner
        size={quantumSizeMap[size ?? "md"]}
        className={cn(quantumToneMap[tone ?? "muted"], className)}
      />
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}

export { Spinner, PageSpinner, spinnerVariants };
