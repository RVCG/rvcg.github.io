import { useQuery } from "@tanstack/react-query";
import { DataAPI } from "../lib/api.js";

export function useWeatherData() {
  return useQuery({
    queryKey: ["weatherData"],
    queryFn: () => DataAPI.getAllData(),
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

  const windChill = forecast?.temperature?.temperature && (waves?.windSpeed || forecast?.wind?.speed) 
    ? calculateWindChill(forecast.temperature.temperature, waves.windSpeed || forecast.wind.speed)
    : undefined;

  return {
    wind: {
      value: waves?.windSpeed
        ? Math.round(waves.windSpeed)
        : forecast?.wind?.speed ? Math.round(forecast.wind.speed) : "--",
      color: getWindColor(waves?.windSpeed || forecast?.wind?.speed || 0),
      trend: forecast?.wind?.trend || "stable",
      trendColor:
        forecast?.wind?.trend === "stable"
          ? "#888888"
          : forecast?.wind?.trend === "increasing"
          ? "#ff4444"
          : "#44ff44",
      direction: forecast?.wind?.direction ? getDirection(forecast.wind.direction) : "--",
      source: waves?.windSpeed ? "Jackson's Reef" : "Forecast on Bar",
    },
    temperature: {
      value: forecast?.temperature?.temperature
        ? Math.round(forecast.temperature.temperature)
        : "--",
      windChill: windChill ? Math.round(windChill) : undefined,
      chillColor: windChill ? getTemperatureColor(windChill) : "#888",
      color: forecast?.temperature?.temperature ? getTemperatureColor(forecast.temperature.temperature) : "#888",
      trend: forecast?.temperature?.trend || "stable",
      trendColor:
        forecast?.temperature?.trend === "stable"
          ? "#888888"
          : forecast?.temperature?.trend === "decreasing"
          ? "#ff4444"
          : "#44ff44",
    },
    waves: {
      value: waves?.waveHeight
        ? waves.waveHeight.toFixed(1)
        : forecast?.wave?.waveHeight ? forecast.wave.waveHeight.toFixed(1) : "--",
      color: getWaveColor(waves?.waveHeight || forecast?.wave?.waveHeight || 0),
      trend: forecast?.wave?.trend || "stable",
      trendColor:
        forecast?.wave?.trend === "stable"
          ? "#888888"
          : forecast?.wave?.trend === "increasing"
          ? "#ff4444"
          : "#44ff44",
      period: waves?.wavePeriod
        ? Math.round(waves.wavePeriod)
        : forecast?.wave?.wavePeriod ? Math.round(forecast.wave.wavePeriod) : "--",
      direction: waves?.waveDirection
        ? getDirection(waves.waveDirection)
        : forecast?.wave?.waveDirection ? getDirection(forecast.wave.waveDirection) : "--",
      source: waves?.waveHeight ? "Jackson's Reef" : "Forecast on Bar",
    },
    tides: {
      value: tides?.current ? tides.current.toFixed(1) : "--",
      color: tides?.current ? getTideColor(tides.current) : "#888",
      nextStage: tides?.nextStage === "high" ? "HW" : tides?.nextStage === "low" ? "LW" : "--",
      nextStageTime: tides?.nextStageTime ? new Date(tides.nextStageTime).toLocaleTimeString("en-NZ", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) : "--",
      nextStageHeight: tides?.nextStageHeight || "--",
      trend: tides?.trend || "stable",
      trendColor: tides?.trend === "falling" ? "#ff4444" : tides?.trend === "rising" ? "#44ff44" : "#888",
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
