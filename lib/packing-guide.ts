import type { WeatherForecast } from "./weather.ts";

export const packingOfficialSource = "https://help.ticketmaster.cl/hc/es-cl/articles/45167383157905-BTS-WORLD-TOUR-ARIRANG";
export const packingBasics = [
  "Tu entrada en el formato de tu compra y tu cédula o pasaporte.",
];
export const packingPracticalTips = [
  "Calzado cómodo para caminar y esperar.",
  "Pañuelos y artículos de higiene que puedas necesitar, como toallas higiénicas.",
  "Teléfono cargado; batería externa y cable si el recinto los permite.",
];

// Comfort suggestions, not venue permission, medical advice or safety assessment.
export function packingWeatherTips(forecast: WeatherForecast | null | undefined, date: string): string[] {
  if (!forecast || forecast.date !== date) return [];
  const tips: string[] = [];
  if (["rain", "storm", "snow"].includes(forecast.kind) || forecast.rainProbability >= 40) {
    tips.push("Una capa impermeable ligera para la espera, si está permitida. Confirma las reglas antes de llevarla.");
  }
  if (forecast.min <= 12) tips.push("Una capa de abrigo para la vuelta: la mínima prevista es baja.");
  if (forecast.max >= 25 || forecast.kind === "clear") tips.push("Ropa ligera y un gorro para la espera al sol, según los artículos permitidos.");
  if (!tips.length) tips.push("Ropa en capas para adaptarte a la espera y al regreso.");
  return tips;
}
