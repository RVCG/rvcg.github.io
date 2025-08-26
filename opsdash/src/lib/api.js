import { TidalCalculator } from "./TidalCalculator.js";
import raglanTideJson from "./raglan_tide_cons.json";

const RAGLAN_COORDINATES = {
  latitude: -37.8,
  longitude: 174.87,
};

const SOFAR_SPOTTER_ID = import.meta.env.REACT_APP_SPOTTER_ID || "0320";

export const WeatherAPI = {
  async getWeatherData() {
    const params = new URLSearchParams({
      latitude: RAGLAN_COORDINATES.latitude,
      longitude: RAGLAN_COORDINATES.longitude,
      hourly: "temperature_2m,wind_speed_10m,wind_direction_10m",
      current: "temperature_2m,wind_speed_10m,wind_direction_10m",
      wind_speed_unit: "kn",
      timezone: "Pacific/Auckland",
      forecast_days: 3,
    });

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`
    );
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      current: {
        temperature: data.current.temperature_2m,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        time: data.current.time,
      },
      hourly: {
        time: data.hourly.time,
        temperature: data.hourly.temperature_2m,
        windSpeed: data.hourly.wind_speed_10m,
        windDirection: data.hourly.wind_direction_10m,
      },
    };
  },

  getTrend(currentValue, nextValue) {
    if (!currentValue || !nextValue) return "stable";
    const difference = nextValue - currentValue;
    if (Math.abs(difference) < 0.1) return "stable";
    return difference > 0 ? "increasing" : "decreasing";
  },

  getWindColorCode(windSpeed) {
    if (windSpeed > 20) return "#ff4444"; // red
    if (windSpeed >= 12) return "#ffaa00"; // amber
    return "#44ff44"; // green
  },

  getTemperatureColorCode(temperature) {
    if (temperature > 18) return "#44ff44"; // green
    if (temperature >= 10) return "#ffaa00"; // amber
    return "#ff4444"; // red
  },
};

export const WaveAPI = {
  async getWaveData() {
    try {
      const response = await fetch(
        `https://api.sofarocean.com/api/latest-data?spotterId=${SOFAR_SPOTTER_ID}`,
        {
          headers: {
            token: import.meta.env.REACT_APP_SOFAR_TOKEN || "", // You'll need to set this
          },
        }
      );

      if (!response.ok) {
        console.warn("SOFAR API unavailable, using mock data");
        return this.getMockWaveData();
      }

      const data = await response.json();
      return {
        waveHeight: data.data.waves[0]?.significantWaveHeight || 0,
        wavePeriod: data.data.waves[0]?.meanPeriod || 0,
        waveDirection: data.data.waves[0]?.meanDirection || 0,
        timestamp: data.data.waves[0]?.timestamp || new Date().toISOString(),
      };
    } catch (error) {
      console.warn("Wave API error, using mock data:", error);
      return this.getMockWaveData();
    }
  },

  getMockWaveData() {
    return {
      waveHeight: 1.5 + (Math.random() - 0.5) * 0.4, // 1.3-1.7m
      wavePeriod: 8 + Math.random() * 4, // 8-12s
      waveDirection: 220 + Math.random() * 40, // 220-260 degrees
      timestamp: new Date().toISOString(),
    };
  },

  getTrend(currentValue, previousValue) {
    if (!currentValue || !previousValue) return "stable";
    const difference = currentValue - previousValue;
    if (Math.abs(difference) < 0.1) return "stable";
    return difference > 0 ? "increasing" : "decreasing";
  },

  getWaveColorCode(waveHeight) {
    if (waveHeight > 2.0) return "#ff4444"; // red
    if (waveHeight >= 1.0) return "#ffaa00"; // amber
    return "#44ff44"; // green
  },
};

export const TideAPI = {
  tidalCalculator: null,

  initializeTidalCalculator(tidalConstituentsData) {
    if (!this.tidalCalculator && tidalConstituentsData) {
      const constituents = tidalConstituentsData.cons[0];
      const datumOffset = tidalConstituentsData.datum_offset[0] || 1.962; // Raglan datum offset
      this.tidalCalculator = new TidalCalculator(constituents, datumOffset);
    }
    return this.tidalCalculator;
  },

  async getTideData(tidalConstituentsData) {
    const calculator = this.initializeTidalCalculator(tidalConstituentsData);

    if (!calculator) {
      throw new Error("Unable to initialize tidal calculator");
    }

    const now = new Date();
    const tideInfo = calculator.getCurrentTideInfo(now);

    return {
      current: tideInfo.current,
      trend: tideInfo.trend,
      nextExtreme: tideInfo.nextExtreme,
      timestamp: tideInfo.timestamp,
    };
  },

  getTideColorCode(tideLevel) {
    return tideLevel > 1.9 ? "#44ff44" : "#ff4444"; // green if high, red if low
  },
};

export const DataAPI = {
  async getAllData(tidalConstituentsData) {
    try {
      const [weatherData, waveData, tideData] = await Promise.all([
        WeatherAPI.getWeatherData(),
        WaveAPI.getWaveData(),
        TideAPI.getTideData(tidalConstituentsData),
      ]);

      return {
        weather: {
          ...weatherData,
          temperatureTrend: WeatherAPI.getTrend(
            weatherData.current.temperature,
            weatherData.hourly.temperature[1]
          ),
          windTrend: WeatherAPI.getTrend(
            weatherData.current.windSpeed,
            weatherData.hourly.windSpeed[1]
          ),
        },
        waves: {
          ...waveData,
          trend: "stable",
        },
        tides: tideData,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  },
};
