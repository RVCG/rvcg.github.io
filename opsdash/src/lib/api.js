import { TidalCalculator } from "./TidalCalculator.js";

const RAGLAN_COORDINATES = {
  latitude: -37.8,
  longitude: 174.87,
};

const SOFAR_SPOTTER_ID = import.meta.env.VITE_SOFAR_SPOTTER_ID || "SPOT-30182R";

const ECMWF_WIND_10M =
  "https://gateway.datamesh.oceanum.io/oceanql/9bfcb138fdcf3a29c5e13a4ce481c6e1c4bfb6b355f099757bb311ae$?auth=rvcg&sig=26c9737bba00513b92cf6e7dde5d02cc5b962f37f5b95f3cf1f09693&f=json";
const ECMWF_T2M =
  "https://gateway.datamesh.oceanum.io/oceanql/20e376047e479bfa1e7df9161a9a8468ce67f73a5ca086d96119763a$?auth=rvcg&sig=cdb290164c153d11335c3d842a9ff0355366f8fa4c12b085d423bf1d&f=json";
const ECMWF_PRECIP =
  "https://gateway.datamesh.oceanum.io/oceanql/56ad85c97bb03cf7db524c9cb70d8328bc78ddfc2f52f0ad0a8c8468$?auth=rvcg&sig=dab9bda91f5106ba6ee6056f14b346564d2c8174078f01b7665fd71d&f=json";
const OCEANUM_WAVE =
  "https://gateway.datamesh.oceanum.io/oceanql/fde43083639e31b40e4a04aff21274ff4b8a980e30bb2f125d07b061$?auth=rvcg&sig=83df4bcd8176600674ca58b3d1a5805ea32e9e63024c7b2b473f501e&f=json";

const FORECAST_SOURCES = {
  wind: ECMWF_WIND_10M,
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

    const waveHeight = utcTimes.map((time, i) => data.data_vars.hs.data[i]);
    const wavePeriod = utcTimes.map((time, i) => 1 / data.data_vars.fp.data[i]);
    const waveDirection = utcTimes.map((time, i) => data.data_vars.dp.data[i]);

    return {
      waveHeight: waveHeight[index],
      wavePeriod: wavePeriod[index],
      waveDirection: waveDirection[index],
      timestamp: utcTimes[index],
      trend: getTrend(
        waveHeight[index],
        waveHeight[index + 1] || waveHeight[index],
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
      return {
        waveHeight: data.data.waves[waveIndex]?.significantWaveHeight,
        wavePeriod: data.data.waves[waveIndex]?.meanPeriod,
        waveDirection: data.data.waves[waveIndex]?.meanDirection,
        waveTimestamp,
        windSpeed: data.data.wind[windIndex]?.speed,
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

  getTideColorCode(tideLevel) {
    return tideLevel > 1.9 ? "#44ff44" : "#ff4444"; // green if high, red if low
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
