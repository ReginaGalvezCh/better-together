import assert from "node:assert/strict";
import test from "node:test";
import { packingWeatherTips } from "../lib/packing-guide.ts";
import type { WeatherForecast } from "../lib/weather.ts";

const forecast: WeatherForecast = { date: "2026-10-14", code: 61, label: "Lluvia", kind: "rain", max: 17, min: 8, rainProbability: 73 };
test("packing suggestions adapt to rain and cold without implying admission permission", () => {
  const tips = packingWeatherTips(forecast, forecast.date);
  assert.equal(tips.length, 2);
  assert.match(tips[0], /si está permitida/);
  assert.match(tips[1], /abrigo/);
});
test("packing never substitutes another day's forecast or invents missing weather", () => {
  assert.deepEqual(packingWeatherTips(forecast, "2026-10-16"), []);
  assert.deepEqual(packingWeatherTips(undefined, forecast.date), []);
});
test("packing handles warmth and mild weather independently", () => {
  assert.match(packingWeatherTips({ ...forecast, kind: "clear", max: 26, min: 15, rainProbability: 0 }, forecast.date)[0], /gorro/);
  assert.deepEqual(packingWeatherTips({ ...forecast, kind: "cloudy", max: 20, min: 15, rainProbability: 0 }, forecast.date), ["Ropa en capas para adaptarte a la espera y al regreso."]);
});
