/**
 * Replaces {{variable}} placeholders in a string using context data.
 * Missing keys are left as-is.
 */
export function interpolate(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = ctx[key];
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}
