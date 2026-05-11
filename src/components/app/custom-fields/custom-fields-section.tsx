"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  field_type: "text" | "number" | "date" | "select" | "checkbox";
  options: { value: string; label: string }[];
  is_required: boolean;
  position: number;
}

interface CustomFieldsSectionProps {
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  editing: boolean;
  onChange?: (values: Record<string, unknown>) => void;
}

export function CustomFieldsSection({ fields, values, editing, onChange }: CustomFieldsSectionProps) {
  if (fields.length === 0) return null;

  function handleChange(name: string, value: unknown) {
    onChange?.({ ...values, [name]: value });
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <Label>
            {field.label}
            {field.is_required && <span className="ml-1 text-destructive">*</span>}
          </Label>
          {editing ? (
            <>
              {field.field_type === "text" && (
                <Input
                  value={(values[field.name] as string) ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                />
              )}
              {field.field_type === "number" && (
                <Input
                  type="number"
                  value={(values[field.name] as string) ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value ? Number(e.target.value) : "")}
                />
              )}
              {field.field_type === "date" && (
                <Input
                  type="date"
                  value={(values[field.name] as string) ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                />
              )}
              {field.field_type === "select" && (
                <Select
                  value={(values[field.name] as string) ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              )}
              {field.field_type === "checkbox" && (
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id={`cf-${field.name}`}
                    className="h-4 w-4 rounded border-input"
                    checked={Boolean(values[field.name])}
                    onChange={(e) => handleChange(field.name, e.target.checked)}
                  />
                  <label htmlFor={`cf-${field.name}`} className="text-sm cursor-pointer">
                    {field.label}
                  </label>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm py-2">
              {field.field_type === "checkbox"
                ? (values[field.name] ? "Sí" : "No")
                : (values[field.name] as string) || <span className="text-muted-foreground">—</span>}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
