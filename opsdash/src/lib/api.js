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

  getTrend(currentValue, nextHourValue) {
    if (!currentValue || !nextHourValue) return "stable";
    const difference = nextHourValue - currentValue;
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
  calculateTide(tidalConstituents, dateTime) {
    const now = new Date(dateTime);
    const tideLevel = this.harmonicAnalysis(tidalConstituents, now);
    return tideLevel;
  },

  harmonicAnalysis(constituents, dateTime) {
    const J2000 = new Date("2000-01-01T12:00:00Z");
    const hoursSinceJ2000 = (dateTime - J2000) / (1000 * 60 * 60);

    let tideLevel = 0;

    Object.entries(constituents).forEach(([name, [amplitude, phase]]) => {
      const frequency = this.getConstituentFrequency(name);
      const argument = frequency * hoursSinceJ2000 + phase;
      tideLevel += amplitude * Math.cos(argument);
    });

    return tideLevel + 1.962; // Add datum offset for Raglan
  },

  getConstituentFrequency(name) {
    const frequencies = {
      M2: 0.0805114007, // Principal lunar semi-diurnal
      S2: 0.0833333333, // Principal solar semi-diurnal
      N2: 0.0789992488, // Lunar elliptic semi-diurnal
      K1: 0.0417807462, // Lunar diurnal
      O1: 0.0387306544, // Lunar diurnal
      P1: 0.0415525855, // Solar diurnal
      Q1: 0.0372185025, // Larger lunar elliptic diurnal
      K2: 0.0835613891, // Lunisolar semi-diurnal
      L2: 0.0819899919, // Smaller lunar elliptic semi-diurnal
      T2: 0.0832664019, // Larger lunar elliptic semi-diurnal
      M3: 0.1207671011, // Lunar terdiurnal
      M4: 0.1610228014, // Shallow water overtide of M2
      M6: 0.2415342021, // Shallow water overtide of M2
      MU2: 0.0776737251, // Variational
      NU2: 0.0802851726, // Lunar elliptic semi-diurnal second-order
      "2N2": 0.0774914713, // Lunar elliptic semi-diurnal
      H1: 0.0416807447, // Solar diurnal
      H2: 0.0833073199, // Solar semi-diurnal second harmonic
      MN4: 0.1595106502, // Shallow water quarter diurnal
      MS4: 0.163844734, // Shallow water quarter diurnal
      SK3: 0.1250640925, // Shallow water terdiurnal
      "2MS6": 0.2444114673, // Shallow water sixth-diurnal
      EPS2: 0.0761570533, // Lunar elliptic semi-diurnal second-order
      LDA2: 0.0843479847, // Lunisolar semi-diurnal
    };

    return frequencies[name] || 0;
  },

  async getTideData(tidalConstituentsData) {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

    const constituents = tidalConstituentsData.cons[0];

    const currentTide = this.calculateTide(constituents, now);
    const nextTide = this.calculateTide(constituents, nextHour);

    return {
      current: currentTide,
      next: nextTide,
      trend: this.getTrend(currentTide, nextTide),
      timestamp: now.toISOString(),
    };
  },

  getTrend(current, next) {
    const difference = next - current;
    if (Math.abs(difference) < 0.05) return "stable";
    return difference > 0 ? "rising" : "falling";
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
          trend: "stable", // Would need historical data for proper trend
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
