"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface QuantumSpinnerProps {
  size?: number;
  speed?: number;
  color?: string;
  className?: string;
  label?: string;
}

export function QuantumSpinner({
  size = 45,
  speed = 1.75,
  color = "currentColor",
  className,
  label = "Cargando",
}: QuantumSpinnerProps) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    import("ldrs").then(({ quantum }) => {
      quantum.register();
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {ready ? <l-quantum size={size} speed={speed} color={color} /> : null}
    </span>
  );
}

interface PageQuantumSpinnerProps extends QuantumSpinnerProps {
  message?: string;
  containerClassName?: string;
}

export function PageQuantumSpinner({
  message,
  containerClassName,
  ...props
}: PageQuantumSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground",
        containerClassName
      )}
    >
      <QuantumSpinner {...props} />
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
