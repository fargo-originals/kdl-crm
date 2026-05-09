import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

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

interface PageSpinnerProps extends SpinnerProps {
  message?: string;
  className?: string;
  containerClassName?: string;
}

function PageSpinner({
  message,
  className,
  containerClassName,
  size = "md",
  tone = "muted",
  ...props
}: PageSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12",
        containerClassName
      )}
    >
      <Spinner size={size} tone={tone} className={className} {...props} />
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}

export { Spinner, PageSpinner, spinnerVariants };
