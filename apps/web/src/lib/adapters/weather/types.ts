export interface WeatherSnapshot {
  temperatureC: number;
  precipitation: "none" | "rain" | "snow";
}

export interface WeatherProvider {
  getCurrentSeoulWeather(now: Date): Promise<WeatherSnapshot>;
}
