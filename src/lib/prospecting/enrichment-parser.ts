export type EnrichedData = {
  email: string | null;
  instagram: string | null;
  contactName: string | null;
  contactTitle: string | null;
};

const GENERIC_EMAIL_PREFIXES = new Set([
  "info",
  "contacto",
  "hola",
  "hello",
  "admin",
  "reservas",
  "booking",
  "ventas",
]);

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function extractEmail(content: string) {
  const emails = unique(content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? []).map((email) =>
    email.toLowerCase()
  );
  if (emails.length === 0) return null;

  return (
    emails.find((email) => {
      const prefix = email.split("@")[0];
      return !GENERIC_EMAIL_PREFIXES.has(prefix);
    }) ?? emails[0]
  );
}

function extractInstagram(content: string) {
  const patterns = [
    /instagram\.com\/@?([a-zA-Z0-9._]+)/g,
    /@([a-zA-Z0-9._]+)\s+en\s+Instagram/gi,
    /Instagram[^@a-zA-Z0-9._]+@([a-zA-Z0-9._]+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = [...content.matchAll(pattern)]
      .map((match) => match[1])
      .filter((handle) => handle && !["p", "reel", "stories", "explore"].includes(handle.toLowerCase()));
    if (matches.length > 0) return matches[0].replace(/\.$/, "");
  }

  return null;
}

function extractContact(content: string) {
  const patterns = [
    /<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i,
    /Hola,\s+soy\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})/i,
    /Fundado\s+por\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})/i,
    /(Chef|Director|Directora|Gerente)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (!match) continue;
    if (match[2]) return { name: match[2].trim(), title: match[1].trim() };
    return { name: match[1].trim(), title: null };
  }

  return { name: null, title: null };
}

export function parseEnrichedData(pageContent: string, pageUrl: string): EnrichedData {
  const content = `${pageContent}\n${pageUrl}`;
  const contact = extractContact(content);

  return {
    email: extractEmail(content),
    instagram: extractInstagram(content),
    contactName: contact.name,
    contactTitle: contact.title,
  };
}
