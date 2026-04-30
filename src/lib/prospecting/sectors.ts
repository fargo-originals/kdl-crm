export const SECTORS = [
  {
    id: "restaurantes",
    label: "Restaurantes",
    keywords: ["restaurante", "bar de tapas", "taberna", "bistro"],
    googleType: "restaurant",
  },
  {
    id: "cafeterias",
    label: "Cafeterias y Brunch",
    keywords: ["cafeteria", "cafe", "brunch", "desayunos"],
    googleType: "cafe",
  },
  {
    id: "hoteles",
    label: "Hoteles",
    keywords: ["hotel", "hostal", "pension"],
    googleType: "lodging",
  },
  {
    id: "dentistas",
    label: "Clinicas Dentales",
    keywords: ["clinica dental", "dentista", "odontologia"],
    googleType: "dentist",
  },
  {
    id: "fisioterapia",
    label: "Fisioterapia",
    keywords: ["fisioterapia", "fisioterapeuta", "rehabilitacion"],
    googleType: "physiotherapist",
  },
  {
    id: "peluquerias",
    label: "Peluquerias",
    keywords: ["peluqueria", "barberia", "salon de belleza"],
    googleType: "hair_care",
  },
] as const;

export type SectorId = (typeof SECTORS)[number]["id"];

export function getSector(id: string) {
  return SECTORS.find((sector) => sector.id === id) ?? null;
}
