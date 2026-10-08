import assert from "node:assert/strict";
import test from "node:test";
import { describeWeather, forecastForDate } from "../lib/weather.ts";

test("maps WMO weather codes to friendly labels", () => {
  assert.deepEqual(describeWeather(0), { label: "Despejado", kind: "clear" });
  assert.deepEqual(describeWeather(61), { label: "Lluvia", kind: "rain" });
  assert.deepEqual(describeWeather(95), { label: "Tormentas", kind: "storm" });
});

test("extracts and rounds the forecast for a concert date", () => {
  const forecast = forecastForDate({
    daily: {
      time: ["2026-10-14"],
      weather_code: [2],
      temperature_2m_max: [22.6],
      temperature_2m_min: [10.4],
      precipitation_probability_max: [18.6],
    },
  }, "2026-10-14");

  assert.deepEqual(forecast, {
    date: "2026-10-14",
    code: 2,
    label: "Algo nublado",
    kind: "partly-cloudy",
    max: 23,
    min: 10,
    rainProbability: 19,
  });
});

test("returns null when the date or required data is unavailable", () => {
  assert.equal(forecastForDate({ daily: { time: ["2026-10-13"] } }, "2026-10-14"), null);
  assert.equal(forecastForDate({}, "2026-10-14"), null);
});
