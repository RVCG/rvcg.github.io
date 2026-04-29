import { TidalCalculator } from "./TidalCalculator.js";

const RAGLAN_COORDINATES = {
  latitude: -37.8,
  longitude: 174.87,
};

const SOFAR_SPOTTER_ID = import.meta.env.VITE_SOFAR_SPOTTER_ID || "SPOT-30182R";

const PW_WIND_10M = 
  "https://datamesh.oceanum.io/oceanql/63b01a3abea368a4b8d44c9cbf979faf64333b6e2c2f3c04fd163296$?auth=rvcg&sig=5380057bbdd95951c9a178e4726e408b2c48d6c9cc4461d137d0e0d3&f=json";
const ECMWF_WIND_10M =
  "https://datamesh.oceanum.io/oceanql/91a64129b576804d8a616a65957db4e08d6b30ad20ae5230a9db05b1$?auth=rvcg&sig=10a6bb5517bc3ed59a11a6e16edc49a10bea396574273593b1debca7&f=json";
const ECMWF_T2M =
  "https://datamesh.oceanum.io/oceanql/b8419b0b9fcf2781e71b2c30a511aedc189948fdf8c8f174618958d4$?auth=rvcg&sig=333ef9a68ed54d34895d1dc0b33a7040530d6181b43ed918c99b0d5f&f=json";
const OCEANUM_WAVE =
  "https://datamesh.oceanum.io/oceanql/55584b2cf4d6f9f7f70be2c635a329432a329327ddc9a50bddc6907b$?auth=rvcg&sig=740a53875e70b0d4daa91f0c1e3ae1440876f66bd02da65f2220379e&f=json";

const FORECAST_SOURCES = {
  wind: PW_WIND_10M,
  temperature: ECMWF_T2M,
  wave: OCEANUM_WAVE,
};

// Return the index of the closest time to now
// If now is after the last time, return the last index
const closest_time_index = (times) => {
  const now = new Date().getTime();
  let closestIndex = 0;
  let minDifference = Math.abs(new Date(times[0]).getTime() - now);

  for (let i = 1; i < times.length; i++) {
    const difference = Math.abs(new Date(times[i]).getTime() - now);
    if (difference < minDifference) {
      minDifference = difference;
      closestIndex = i;
    }
  }

  return closestIndex;
};

const getTrend = (currentValue, nextValue, threshold) => {
  const difference = nextValue - currentValue;
  if (Math.abs(difference) < threshold) return "stable";
  return difference > 0 ? "increasing" : "decreasing";
};

export const OceanumAPI = {
  async getWindForecast() {
    const response = await fetch(FORECAST_SOURCES.wind);
    if (!response.ok) {
      throw new Error(`Oceanum API error: ${response.statusText}`);
    }

    const data = await response.json();
    const utcTimes = data.coords.time.data;
    const index = closest_time_index(utcTimes);

    const speed = utcTimes.map(
      (time, i) =>
        1.943 *
        Math.sqrt(
          data.data_vars.u10.data[i] * data.data_vars.u10.data[i] +
            data.data_vars.v10.data[i] * data.data_vars.v10.data[i]
        )
    );
    //Get direction as degress from true north
    //atan2 returns -pi to pi, so we need to convert to 0 to 2pi
    const direction = utcTimes.map(
      (time, i) =>
        (270 -
          (180 *
            Math.atan2(
              data.data_vars.v10.data[i],
              data.data_vars.u10.data[i]
            )) /
            Math.PI) %
        360
    );

    return {
      speed: speed[index],
      direction: direction[index],
      timestamp: utcTimes[index],
      trend: getTrend(speed[index], speed[index + 1] || speed[index], 1),
    };
  },

  async getTemperatureForecast() {
    const response = await fetch(FORECAST_SOURCES.temperature);
    if (!response.ok) {
      throw new Error(`Oceanum API error: ${response.statusText}`);
    }

    const data = await response.json();
    const utcTimes = data.coords.time.data;
    const index = closest_time_index(utcTimes);

    const temperature = utcTimes.map(
      (time, i) => data.data_vars.t2m.data[i] - 273.15
    );

    return {
      temperature: temperature[index],
      timestamp: utcTimes[index],
      trend: getTrend(temperature[index], temperature[index + 1], 1),
    };
  },

  async getWaveForecast() {
    const response = await fetch(FORECAST_SOURCES.wave);
    if (!response.ok) {
      throw new Error(`Oceanum API error: ${response.statusText}`);
    }

    const data = await response.json();
    const utcTimes = data.coords.time.data;
    const index = closest_time_index(utcTimes);

    const waveHeight = utcTimes.map((time, i) => data.data_vars.hs.data[i][0]);
    const wavePeriod = utcTimes.map((time, i) => data.data_vars.tps.data[i][0]);
    const waveDirection = utcTimes.map(
      (time, i) => data.data_vars.dpm.data[i][0]
    );

    return {
      waveHeight: waveHeight[index],
      wavePeriod: wavePeriod[index],
      waveDirection: waveDirection[index],
      timestamp: utcTimes[index],
      trend: getTrend(
        waveHeight[index],
        waveHeight[index + 3] || waveHeight[index],
        0.1
      ),
    };
  },
};

export const WaveAPI = {
  async getWaveData() {
    try {
      const response = await fetch(
        `https://api.sofarocean.com/api/wave-data?spotterId=${SOFAR_SPOTTER_ID}&includeWindData=true&includeSurfaceTempData=true&limit=10`,
        {
          headers: {
            token: import.meta.env.VITE_SOFAR_TOKEN,
          },
        }
      );

      const data = await response.json();

      const waveIndex = data.data.waves.length - 1;
      const waveTimestamp = data.data.waves[waveIndex]?.timestamp;
      const windIndex = data.data.wind.length - 1;
      const windTimestamp = data.data.wind[windIndex]?.timestamp;
      if (new Date() - new Date(waveTimestamp) > 3 * 3600 * 1000) {
        console.warn("Wave data is older than 3 hours");
        return {
          waveHeight: undefined,
          wavePeriod: undefined,
          waveDirection: undefined,
          waveTimestamp: undefined,
          windSpeed: undefined,
          windDirection: undefined,
          windTimestamp: undefined,
        };
      }
      return {
        waveHeight: data.data.waves[waveIndex]?.significantWaveHeight,
        wavePeriod: data.data.waves[waveIndex]?.meanPeriod,
        waveDirection: data.data.waves[waveIndex]?.meanDirection,
        waveTimestamp,
        windSpeed: 1.943 * data.data.wind[windIndex]?.speed,
        windDirection: data.data.wind[windIndex]?.direction,
        windTimestamp,
      };
    } catch (error) {
      console.error("SOFAR Wave API error:", error);
      // Return fallback values instead of throwing to prevent complete app failure
      return {
        waveHeight: undefined,
        wavePeriod: undefined,
        waveDirection: undefined,
        waveTimestamp: undefined,
        windSpeed: undefined,
        windDirection: undefined,
        windTimestamp: undefined,
      };
    }
  },
};

export const TideAPI = {
  tidalCalculator: null,

  async initializeCalculator() {
    if (!this.tidalCalculator) {
      this.tidalCalculator = new TidalCalculator();
      try {
        await this.tidalCalculator.loadTidalData();
      } catch (error) {
        console.error("Failed to initialize tidal calculator:", error);
        this.tidalCalculator = null; // Reset so we can try again
        throw error;
      }
    }
    return this.tidalCalculator;
  },

  async getTideData() {
    const calculator = await this.initializeCalculator();
    const now = new Date();
    const tideInfo = calculator.getCurrentTideInfo(now);

    return {
      current: tideInfo.current,
      trend: tideInfo.trend,
      nextStage: tideInfo.nextStage,
      nextStageTime: tideInfo.nextStageTime,
      nextStageHeight: tideInfo.nextStageHeight,
      timestamp: now.toISOString(),
    };
  },
};

export const DataAPI = {
  async getAllData() {
    try {
      const [
        windForecast,
        temperatureForecast,
        waveForecast,
        waveData,
        tideData,
      ] = await Promise.allSettled([
        OceanumAPI.getWindForecast(),
        OceanumAPI.getTemperatureForecast(),
        OceanumAPI.getWaveForecast(),
        WaveAPI.getWaveData(),
        TideAPI.getTideData(),
      ]);

      return {
        forecast: {
          wind:
            windForecast.status === "fulfilled"
              ? windForecast.value
              : undefined,
          temperature:
            temperatureForecast.status === "fulfilled"
              ? temperatureForecast.value
              : undefined,
          wave:
            waveForecast.status === "fulfilled"
              ? waveForecast.value
              : undefined,
        },
        waves: waveData.status === "fulfilled" ? waveData.value : undefined,
        tides: tideData.status === "fulfilled" ? tideData.value : undefined,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  },
};
