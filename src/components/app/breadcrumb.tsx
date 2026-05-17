import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb — shows a path like "Pipeline › Renovación web Café Central"
 * Usage:
 *   <Breadcrumb items={[{ label: "Pipeline", href: "/deals" }, { label: deal.name }]} />
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-1" aria-label="Breadcrumb">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1 min-w-0">
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-foreground transition-colors truncate">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-foreground font-medium truncate max-w-[200px]" : "truncate"}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
