import { TidalCalculator } from "./TidalCalculator.js";

const RAGLAN_COORDINATES = {
  latitude: -37.8,
  longitude: 174.87,
};

const SOFAR_SPOTTER_ID = import.meta.env.VITE_SOFAR_SPOTTER_ID || "SPOT-30182R";
console.log("SOFAR_SPOTTER_ID:", SOFAR_SPOTTER_ID);
console.log(
  "VITE_SOFAR_TOKEN:",
  import.meta.env.VITE_SOFAR_TOKEN ? "***SET***" : "NOT SET"
);

const ECMWF_WIND_10M =
  "https://gateway.datamesh.oceanum.io/oceanql/4bfc5eb6f374be45d1e4bfd0c09c8fe38780a49db8fd56eddc4c5043$?auth=rvcg&sig=162c7606a29817817e9ae1d992aaae5d3aa7a68864b45dcea62c3362&f=json";
const ECMWF_T2M =
  "https://gateway.datamesh.oceanum.io/oceanql/e1d7a9e93c0c1f3e40000449fbe8de21608914d98183f4dbe7ad8728$?auth=rvcg&sig=48590012f26f3e917d30a7345f4a9fce5d9b21467cbb3f099101bffc&f=json";
const ECMWF_PRECIP =
  "https://gateway.datamesh.oceanum.io/oceanql/56ad85c97bb03cf7db524c9cb70d8328bc78ddfc2f52f0ad0a8c8468$?auth=rvcg&sig=dab9bda91f5106ba6ee6056f14b346564d2c8174078f01b7665fd71d&f=json";
const OCEANUM_WAVE =
  "https://gateway.datamesh.oceanum.io/oceanql/fde43083639e31b40e4a04aff21274ff4b8a980e30bb2f125d07b061$?auth=rvcg&sig=83df4bcd8176600674ca58b3d1a5805ea32e9e63024c7b2b473f501e&f=json";

const FORECAST_SOURCES = {
  wind: ECMWF_WIND_10M,
  temperature: ECMWF_T2M,
  wave: OCEANUM_WAVE,
};

// Utility to convert UTC time to NZ local time
const convertUTCToNZ = (utcTimeString) => {
  const utcDate = new Date(utcTimeString);
  // Convert to NZ timezone (Pacific/Auckland)
  return new Date(
    utcDate.toLocaleString("en-US", { timeZone: "Pacific/Auckland" })
  );
};

// Get current time in NZ timezone
const getNZTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Pacific/Auckland" })
  );
};

const closest_time_index = (times) => {
  const nowNZ = getNZTime();
  const index = times.findIndex((time) => convertUTCToNZ(time) > nowNZ);
  return index === -1 ? times.length - 1 : index;
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
    const nzTimes = utcTimes.map(convertUTCToNZ);
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
      times: nzTimes,
      currentTime: nzTimes[index],
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
    const nzTimes = utcTimes.map(convertUTCToNZ);
    const index = closest_time_index(utcTimes);

    const temperature = utcTimes.map(
      (time, i) => data.data_vars.t2m.data[i] - 273.15
    );

    return {
      temperature: temperature[index],
      times: nzTimes,
      currentTime: nzTimes[index],
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
    const nzTimes = utcTimes.map(convertUTCToNZ);
    const index = closest_time_index(utcTimes);

    const waveHeight = utcTimes.map((time, i) => data.data_vars.hs.data[i]);
    const wavePeriod = utcTimes.map((time, i) => 1 / data.data_vars.fp.data[i]);
    const waveDirection = utcTimes.map((time, i) => data.data_vars.dp.data[i]);

    return {
      waveHeight: waveHeight[index],
      wavePeriod: wavePeriod[index],
      waveDirection: waveDirection[index],
      times: nzTimes,
      currentTime: nzTimes[index],
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
        `https://api.sofarocean.com/api/latest-data?spotterId=${SOFAR_SPOTTER_ID}&includeWindData=true&includeSurfaceTempData=true`,
        {
          headers: {
            token: import.meta.env.VITE_SOFAR_TOKEN,
          },
        }
      );

      const data = await response.json();
      const utcTimestamp =
        data.data.waves[0]?.timestamp || new Date().toISOString();
      const nzTime = convertUTCToNZ(utcTimestamp);
      const index = data.data.waves.length - 1;
      if (index == -1) {
        console.log("No wave data found");
        return {
          waveHeight: undefined,
          wavePeriod: undefined,
          waveDirection: undefined,
          windSpeed: undefined,
          windDirection: undefined,
          timestamp: nzTime.toISOString(),
        };
      }
      return {
        waveHeight: data.data.waves[index]?.significantWaveHeight || 0,
        wavePeriod: data.data.waves[index]?.meanPeriod || 0,
        waveDirection: data.data.waves[index]?.meanDirection || 0,
        windSpeed: data.data.wind[index]?.windSpeed || 0,
        windDirection: data.data.wind[index]?.windDirection || 0,
        timestamp: nzTime.toISOString(),
        nzTime: nzTime,
      };
    } catch (error) {
      console.error("SOFAR Wave API error:", error);
      throw error;
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
    console.log("Getting tide data...");
    const calculator = await this.initializeCalculator();
    console.log(
      "Calculator initialized, tidalData length:",
      calculator.tidalData?.length
    );
    const now = new Date();
    const tideInfo = calculator.getCurrentTideInfo(now);

    return {
      current: tideInfo.current,
      trend: tideInfo.trend,
      nextStage: tideInfo.nextStage,
      nextStageTime: tideInfo.nextStageTime,
      nextStageHeight: tideInfo.nextStageHeight,
      timestamp: tideInfo.timestamp,
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
      ] = await Promise.all([
        OceanumAPI.getWindForecast(),
        OceanumAPI.getTemperatureForecast(),
        OceanumAPI.getWaveForecast(),
        WaveAPI.getWaveData(),
        TideAPI.getTideData(),
      ]);

      return {
        forecast: {
          wind: windForecast,
          temperature: temperatureForecast,
          wave: waveForecast,
        },
        waves: waveData,
        tides: tideData,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  },
};
