import { useQuery } from "@tanstack/react-query";
import { DataAPI } from "../lib/api.js";

export function useWeatherData() {
  return useQuery({
    queryKey: ["weatherData"],
    queryFn: async () => {
      console.log("Fetching weather data...");
      try {
        const data = await DataAPI.getAllData();
        console.log("Weather data received:", data);
        return data;
      } catch (error) {
        console.error("Weather data fetch failed:", error);
        throw error;
      }
    },
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    staleTime: 4 * 60 * 1000, // Data is fresh for 4 minutes
    retry: 2,
  });
}

export function useWeatherDisplay(weatherData) {
  if (!weatherData) {
    return {
      wind: { value: "--", color: "#888", trend: "stable" },
      temperature: { value: "--", color: "#888", trend: "stable" },
      waves: { value: "--", color: "#888", trend: "stable" },
      tides: { value: "--", color: "#888", trend: "stable" },
    };
  }

  const { forecast, waves, tides } = weatherData;

  const windChill = calculateWindChill(
    forecast.temperature.temperature,
    waves.windSpeed || forecast.wind.speed
  );

  return {
    wind: {
      value: waves.windSpeed
        ? Math.round(waves.windSpeed)
        : Math.round(forecast.wind.speed),
      color: getWindColor(waves.windSpeed || forecast.wind.speed),
      trend: forecast.wind.trend,
      trendColor:
        forecast.wind.trend === "stable"
          ? "#888888"
          : forecast.wind.trend === "increasing"
          ? "#ff4444"
          : "#44ff44",
      direction: getDirection(forecast.wind.direction),
      source: waves.windSpeed ? "Jackson's Reef" : "Forecast on Bar",
    },
    temperature: {
      value: forecast.temperature.temperature
        ? Math.round(forecast.temperature.temperature)
        : "--",
      windChill: Math.round(windChill),
      chillColor: getTemperatureColor(windChill),
      color: getTemperatureColor(forecast.temperature.temperature),
      trend: forecast.temperature.trend,
      trendColor:
        forecast.temperature.trend === "stable"
          ? "#888888"
          : forecast.temperature.trend === "decreasing"
          ? "#ff4444"
          : "#44ff44",
    },
    waves: {
      value: waves.waveHeight
        ? waves.waveHeight.toFixed(1)
        : forecast.wave.waveHeight.toFixed(1),
      color: getWaveColor(waves.waveHeight),
      trend: forecast.wave.trend,
      trendColor:
        forecast.wave.trend === "stable"
          ? "#888888"
          : forecast.wave.trend === "increasing"
          ? "#ff4444"
          : "#44ff44",
      period: waves.wavePeriod
        ? Math.round(waves.wavePeriod)
        : Math.round(forecast.wave.wavePeriod),
      direction: waves.waveDirection
        ? getDirection(waves.waveDirection)
        : getDirection(forecast.wave.waveDirection),
      source: waves.waveHeight ? "Jackson's Reef" : "Forecast on Bar",
    },
    tides: {
      value: tides.current ? tides.current.toFixed(1) : "--",
      color: getTideColor(tides.current),
      nextStage: tides.nextStage === "high" ? "HW" : "LW",
      nextStageTime: new Date(tides.nextStageTime).toLocaleTimeString("en-NZ", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      nextStageHeight: tides.nextStageHeight,
      trend: tides.trend,
      trendColor: tides.trend === "falling" ? "#ff4444" : "#44ff44",
    },
  };
}

function getDirection(direction) {
  // Convert to octant direction from true north
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

  const index = Math.round(((direction + 22.5) % 360) / 45);
  return directions[index];
}

function getWindColor(windSpeed) {
  if (windSpeed > 20) return "#ff4444";
  if (windSpeed >= 12) return "#ffaa00";
  return "#44ff44";
}

function getTemperatureColor(temperature) {
  if (temperature > 18) return "#44ff44";
  if (temperature >= 10) return "#ffaa00";
  return "#ff4444";
}

function getWaveColor(waveHeight) {
  if (waveHeight > 2.0) return "#ff4444";
  if (waveHeight >= 1.0) return "#ffaa00";
  return "#44ff44";
}

function getTideColor(tideLevel) {
  return tideLevel > 1.9 ? "#44ff44" : tideLevel < 0.5 ? "#ff4444" : "#ffaa00";
}

function calculateWindChill(tempCelsius, windSpeedKnots) {
  // Convert knots to km/h for the formula
  const windSpeedKmh = windSpeedKnots * 1.852;

  // Environment Canada wind chill formula
  const windChill =
    13.12 +
    0.6215 * tempCelsius -
    11.37 * Math.pow(windSpeedKmh, 0.16) +
    0.3965 * tempCelsius * Math.pow(windSpeedKmh, 0.16);

  return Math.min(windChill, tempCelsius); // Wind chill can't be higher than actual temp
}
