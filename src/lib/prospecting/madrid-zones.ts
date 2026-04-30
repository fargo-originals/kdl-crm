export const MADRID_DISTRICTS = [
  "Centro",
  "Arganzuela",
  "Retiro",
  "Salamanca",
  "Chamartin",
  "Tetuan",
  "Chamberi",
  "Fuencarral-El Pardo",
  "Moncloa-Aravaca",
  "Latina",
  "Carabanchel",
  "Usera",
  "Puente de Vallecas",
  "Moratalaz",
  "Ciudad Lineal",
  "Hortaleza",
  "Villaverde",
  "Villa de Vallecas",
  "Vicalvaro",
  "San Blas-Canillejas",
  "Barajas",
] as const;

export const MADRID_NEIGHBORHOODS: Record<string, string[]> = {
  Centro: ["Malasana", "Chueca", "Sol", "La Latina", "Lavapies", "Huertas", "Conde Duque"],
  Arganzuela: ["Imperial", "Acacias", "Palos de Moguer", "Delicias", "Legazpi"],
  Retiro: ["Pacifico", "Adelfas", "Ibiza", "Jerónimos", "Nino Jesus"],
  Salamanca: ["Recoletos", "Goya", "Lista", "Castellana", "Fuente del Berro", "Guindalera"],
  Chamartin: ["El Viso", "Prosperidad", "Ciudad Jardin", "Hispanoamerica", "Nueva Espana", "Castilla"],
  Tetuan: ["Bellas Vistas", "Cuatro Caminos", "Castillejos", "Almenara", "Valdeacederas", "Berruguete"],
  Chamberi: ["Almagro", "Trafalgar", "Rios Rosas", "Gaztambide", "Arapiles", "Vallehermoso"],
  "Ciudad Lineal": ["Ventas", "Pueblo Nuevo", "Quintana", "Concepcion", "San Pascual"],
  Hortaleza: ["Pinar del Rey", "Canillas", "Valdefuentes", "Apostol Santiago"],
};

export type MadridDistrict = (typeof MADRID_DISTRICTS)[number];

export function getMadridZoneOptions() {
  return MADRID_DISTRICTS.flatMap((district) => [
    { label: district, value: district, type: "distrito" as const },
    ...(MADRID_NEIGHBORHOODS[district] ?? []).map((neighborhood) => ({
      label: neighborhood,
      value: neighborhood,
      type: "barrio" as const,
    })),
  ]);
}
