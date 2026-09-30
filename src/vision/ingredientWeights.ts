/**
 * Peso típico de una unidad de cada ingrediente, en gramos.
 *
 * La cámara no es una balanza: sin una referencia de escala no puede saber
 * si esa papa pesa 150 o 250 g. Lo que sí sabe es *qué* es y *cuántas*
 * hay, y con un peso típico por unidad eso alcanza para una estimación que
 * sirve en la cocina ("≈ 450 g" al lado de "la receta pide 500 g"). Por
 * eso el rótulo siempre lleva "≈": es una estimación, y lo dice.
 *
 * Los ingredientes que vienen en paquete o a granel (harina, arroz, leche)
 * usan el envase más común en Argentina.
 */
export const PESO_UNIDAD_G: Record<string, number> = {
  tomate: 120,
  papa: 180,
  cebolla: 150,
  ajo: 5,
  zanahoria: 80,
  morron: 160,
  zapallo: 1500,
  zapallito: 200,
  brocoli: 350,
  coliflor: 600,
  repollo: 900,
  pepino: 250,
  rabanito: 15,
  alcaucil: 250,
  esparrago: 20,
  hongos: 15,
  choclo: 250,
  lechuga: 300,
  espinaca: 250,
  palta: 200,
  manzana: 180,
  banana: 120,
  naranja: 200,
  limon: 100,
  pomelo: 300,
  frutilla: 15,
  uva: 5,
  durazno: 150,
  pera: 180,
  'ananá': 1200,
  mango: 300,
  sandia: 4000,
  melon: 1200,
  granada: 250,
  higo: 50,
  coco: 600,
  huevo: 55,
  pollo: 250,
  carne: 250,
  pescado: 200,
  camaron: 15,
  mariscos: 20,
  queso: 250,
  mozzarella: 250,
  leche: 1000,
  crema: 200,
  manteca: 200,
  yogur: 190,
  pan: 60,
  pasta: 500,
  arroz: 1000,
  harina: 1000,
  lentejas: 500,
  porotos: 500,
  albahaca: 20,
};

export interface PesoEstimado {
  gramos: number;
  unidades: number;
}

/** Estimación de peso para `unidades` piezas del ingrediente, o null si no hay dato. */
export function estimarPeso(ingredientId: string, unidades: number): PesoEstimado | null {
  const porUnidad = PESO_UNIDAD_G[ingredientId];
  if (!porUnidad || unidades <= 0) return null;
  return { gramos: porUnidad * unidades, unidades };
}

/** "≈ 450 g" o "≈ 1,2 kg". */
export function formatearPeso(gramos: number): string {
  if (gramos >= 1000) {
    const kg = Math.round(gramos / 100) / 10;
    return `≈ ${String(kg).replace('.', ',')} kg`;
  }
  // Redondeado a 5 g: más precisión que eso sería mentir.
  return `≈ ${Math.max(5, Math.round(gramos / 5) * 5)} g`;
}
