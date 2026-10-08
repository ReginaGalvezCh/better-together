export const weatherApiUrl =
  "https://api.open-meteo.com/v1/forecast?latitude=-33.464&longitude=-70.610&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FSantiago&forecast_days=16";

export type WeatherKind = "clear" | "partly-cloudy" | "cloudy" | "fog" | "rain" | "storm" | "snow";

export type WeatherForecast = {
  date: string;
  code: number;
  label: string;
  kind: WeatherKind;
  max: number;
  min: number;
  rainProbability: number;
};

export type WeatherResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

export function describeWeather(code: number): Pick<WeatherForecast, "label" | "kind"> {
  if (code === 0) return { label: "Despejado", kind: "clear" };
  if (code <= 2) return { label: "Algo nublado", kind: "partly-cloudy" };
  if (code === 3) return { label: "Nublado", kind: "cloudy" };
  if (code === 45 || code === 48) return { label: "Niebla", kind: "fog" };
  if (code >= 95) return { label: "Tormentas", kind: "storm" };
  if (code >= 71 && code <= 77) return { label: "Nieve", kind: "snow" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { label: "Lluvia", kind: "rain" };
  return { label: "Variable", kind: "cloudy" };
}

export function forecastForDate(payload: WeatherResponse, date: string): WeatherForecast | null {
  const daily = payload.daily;
  const index = daily?.time?.indexOf(date) ?? -1;
  if (!daily || index < 0) return null;

  const code = daily.weather_code?.[index];
  const max = daily.temperature_2m_max?.[index];
  const min = daily.temperature_2m_min?.[index];
  const rainProbability = daily.precipitation_probability_max?.[index];
  if (![code, max, min, rainProbability].every(Number.isFinite)) return null;

  return {
    date,
    code: code as number,
    max: Math.round(max as number),
    min: Math.round(min as number),
    rainProbability: Math.round(rainProbability as number),
    ...describeWeather(code as number),
  };
}
