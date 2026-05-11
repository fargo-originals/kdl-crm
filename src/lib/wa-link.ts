export function waHref(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.startsWith('34') ? digits
    : (digits.startsWith('6') || digits.startsWith('7')) ? `34${digits}`
    : digits;
  const base = `https://wa.me/${normalized}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function buildWaMessage(businessName: string, hasWebsite: boolean): string {
  if (!hasWebsite) {
    return `Hola, soy Felipe de KentoDevLab. Vi que ${businessName} no tiene web propia todavía. Creamos páginas web para negocios locales desde 397€. ¿Te puedo explicar en 2 minutos?`;
  }
  return `Hola, soy Felipe de KentoDevLab. Vi la web de ${businessName} y tengo ideas para mejorarla. ¿Tienes 2 minutos para que te cuente?`;
}
