import { useQuery } from '@tanstack/react-query';
import { DataAPI } from '../lib/api.js';

export function useWeatherData(tidalConstituentsData) {
  return useQuery({
    queryKey: ['weatherData'],
    queryFn: () => DataAPI.getAllData(tidalConstituentsData),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 4 * 60 * 1000, // Data is fresh for 4 minutes
    retry: 2,
    enabled: !!tidalConstituentsData, // Only run when tidal data is available
  });
}

export function useWeatherDisplay(weatherData) {
  if (!weatherData) {
    return {
      wind: { value: '--', color: '#888', trend: 'stable' },
      temperature: { value: '--', color: '#888', trend: 'stable' },
      waves: { value: '--', color: '#888', trend: 'stable' },
      tides: { value: '--', color: '#888', trend: 'stable' }
    };
  }

  const { weather, waves, tides } = weatherData;

  return {
    wind: {
      value: Math.round(weather.current.windSpeed),
      color: getWindColor(weather.current.windSpeed),
      trend: weather.windTrend,
      direction: weather.current.windDirection
    },
    temperature: {
      value: Math.round(weather.current.temperature),
      color: getTemperatureColor(weather.current.temperature),
      trend: weather.temperatureTrend
    },
    waves: {
      value: waves.waveHeight.toFixed(1),
      color: getWaveColor(waves.waveHeight),
      trend: waves.trend,
      period: Math.round(waves.wavePeriod),
      direction: Math.round(waves.waveDirection)
    },
    tides: {
      value: tides.current.toFixed(1),
      color: getTideColor(tides.current),
      trend: tides.trend
    }
  };
}

function getWindColor(windSpeed) {
  if (windSpeed > 20) return '#ff4444';
  if (windSpeed >= 12) return '#ffaa00';
  return '#44ff44';
}

function getTemperatureColor(temperature) {
  if (temperature > 18) return '#44ff44';
  if (temperature >= 10) return '#ffaa00';
  return '#ff4444';
}

function getWaveColor(waveHeight) {
  if (waveHeight > 2.0) return '#ff4444';
  if (waveHeight >= 1.0) return '#ffaa00';
  return '#44ff44';
}

function getTideColor(tideLevel) {
  return tideLevel > 1.9 ? '#44ff44' : '#ff4444';
}

export function getTrendColor(trend) {
  switch (trend) {
    case 'increasing':
    case 'rising':
      return trend === 'rising' ? '#44ff44' : '#ff4444'; // green for tide rising, red for others increasing
    case 'decreasing':
    case 'falling':
      return trend === 'falling' ? '#ff4444' : '#44ff44'; // red for tide falling, green for others decreasing
    default:
      return '#888888';
  }
}