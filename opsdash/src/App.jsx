import { useState, useEffect } from "react";
import {
  Waves,
  Thermometer,
  Wind,
  ArrowLineUp,
  ArrowUpRight,
  ArrowDownRight,
} from "@phosphor-icons/react";
import {
  useWeatherData,
  useWeatherDisplay,
  getTrendColor,
} from "./hooks/useWeatherData";
import { raglanTideData } from "./data/raglanTideData";
import "./App.css";

const LOOP = 20000;
const IFRAME = 5000;

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentView, setCurrentView] = useState("grid"); // 'grid', 'camera', or 'radar'

  // Fetch weather data using React Query
  const {
    data: weatherData,
    isLoading,
    isError,
  } = useWeatherData(raglanTideData);
  const displayData = useWeatherDisplay(weatherData);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Screen rotation effect - 40s grid, 15s camera, 15s radar
  useEffect(() => {
    const rotationTimer = setInterval(() => {
      setCurrentView((prev) => {
        if (prev === "grid") {
          // Switch to camera for 15s
          setTimeout(() => setCurrentView("windy"), IFRAME);
          return "camera";
        }
        if (prev === "camera") {
          // Switch to radar for 15s
          setTimeout(() => setCurrentView("grid"), IFRAME);
          return "windy";
        }
        return "grid"; // Will stay on grid for 40s (interval default)
      });
    }, LOOP); // Total cycle: 70 seconds

    return () => clearInterval(rotationTimer);
  }, []);

  return (
    <div className="app">
      <div className="time-bar">
        <div className="time-display">
          {currentTime.toLocaleString("en-NZ", {
            timeZone: "Pacific/Auckland",
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
        <div className="time-display">
          {currentTime.toLocaleString("en-NZ", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })}
        </div>
      </div>

      {currentView === "camera" ? (
        <div className="iframe-view">
          <div className="iframe-container">
            <iframe
              src="https://www.youtube.com/embed/eOnZBBVqwb0?autoplay=1"
              title="Raglan Bar Camera"
              frameBorder="0"
              allow="autoplay; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <div className="vertical-grid">
            <WeatherGrid displayData={displayData} />
          </div>
        </div>
      ) : currentView === "windy" ? (
        <div className="iframe-view">
          <div className="iframe-container">
            <iframe
              src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=kt&zoom=5&overlay=rain&product=ecmwf&level=surface&lat=-40.413&lon=176.968&detailLat=-37.788&detailLon=-185.221&detail=true&pressure=true"
              title="MetService Weather Radar - Auckland/Waikato"
              frameBorder="0"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <div className="vertical-grid">
            <WeatherGrid displayData={displayData} />
          </div>
        </div>
      ) : (
        <div className="main-grid">
          <div className="grid-quadrant ne">
            <div className="widget">
              <div className="widget-title">
                <Waves size={48} className="widget-icon" />
                Waves (m)
              </div>
              <div className="data-source">Jackson's reef</div>
              <div
                className="large-value"
                style={{ color: displayData.waves.color }}
              >
                {displayData.waves.value}
              </div>
              <div
                className="trend"
                style={{ color: getTrendColor(displayData.waves.trend) }}
              >
                {getTrendIcon(displayData.waves.trend)}{" "}
                {getTrendText(displayData.waves.trend)}
              </div>
            </div>
          </div>

          <div className="grid-quadrant se">
            <div className="widget">
              <div className="widget-title">
                <ArrowLineUp size={48} className="widget-icon" />
                Tide (m)
              </div>
              <div className="data-source">Predicted</div>
              <div
                className="large-value"
                style={{ color: displayData.tides.color }}
              >
                {displayData.tides.value}
              </div>
              <div
                className="trend"
                style={{ color: getTrendColor(displayData.tides.trend) }}
              >
                {getTrendIcon(displayData.tides.trend)}{" "}
                {getTrendText(displayData.tides.trend)}
              </div>
            </div>
          </div>

          <div className="grid-quadrant sw">
            <div className="widget">
              <div className="widget-title">
                <Wind size={48} className="widget-icon" />
                Wind (kts)
              </div>
              <div className="data-source">Jackson's Reef</div>
              <div
                className="large-value"
                style={{ color: displayData.wind.color }}
              >
                {displayData.wind.value}
              </div>
              <div
                className="trend"
                style={{ color: getTrendColor(displayData.wind.trend) }}
              >
                {getTrendIcon(displayData.wind.trend)}{" "}
                {getTrendText(displayData.wind.trend)}
              </div>
            </div>
          </div>

          <div className="grid-quadrant nw">
            <div className="widget">
              <div className="widget-title">
                <Thermometer size={48} className="widget-icon" />
                Temperature (°C)
              </div>
              <div className="data-source">ECMWF forecast </div>
              <div
                className="large-value"
                style={{ color: displayData.temperature.color }}
              >
                {displayData.temperature.value}
              </div>
              <div
                className="trend"
                style={{ color: getTrendColor(displayData.temperature.trend) }}
              >
                {getTrendIcon(displayData.temperature.trend)}{" "}
                {getTrendText(displayData.temperature.trend)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Weather grid component for the vertical sidebar
function WeatherGrid({ displayData }) {
  return (
    <div className="weather-grid">
      <div className="grid-item">
        <div className="mini-widget">
          <div className="mini-title">
            <Waves size={32} className="mini-icon" />
            Waves
          </div>
          <div
            className="mini-value"
            style={{ color: displayData.waves.color }}
          >
            {displayData.waves.value}m
          </div>
          <div
            className="mini-trend"
            style={{ color: getTrendColor(displayData.waves.trend) }}
          >
            {getTrendIcon(displayData.waves.trend, 20)}
          </div>
        </div>
      </div>

      <div className="grid-item">
        <div className="mini-widget">
          <div className="mini-title">
            <ArrowLineUp size={32} className="mini-icon" />
            Tide
          </div>
          <div
            className="mini-value"
            style={{ color: displayData.tides.color }}
          >
            {displayData.tides.value}m
          </div>
          <div
            className="mini-trend"
            style={{ color: getTrendColor(displayData.tides.trend) }}
          >
            {getTrendIcon(displayData.tides.trend, 20)}
          </div>
        </div>
      </div>

      <div className="grid-item">
        <div className="mini-widget">
          <div className="mini-title">
            <Wind size={32} className="mini-icon" />
            Wind
          </div>
          <div className="mini-value" style={{ color: displayData.wind.color }}>
            {displayData.wind.value}kts
          </div>
          <div
            className="mini-trend"
            style={{ color: getTrendColor(displayData.wind.trend) }}
          >
            {getTrendIcon(displayData.wind.trend, 20)}
          </div>
        </div>
      </div>

      <div className="grid-item">
        <div className="mini-widget">
          <div className="mini-title">
            <Thermometer size={32} className="mini-icon" />
            Temp
          </div>
          <div
            className="mini-value"
            style={{ color: displayData.temperature.color }}
          >
            {displayData.temperature.value}°C
          </div>
          <div
            className="mini-trend"
            style={{ color: getTrendColor(displayData.temperature.trend) }}
          >
            {getTrendIcon(displayData.temperature.trend, 20)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility functions for trend icons and text
function getTrendIcon(trend, size = 32) {
  switch (trend) {
    case "increasing":
    case "rising":
      return <ArrowUpRight size={size} />;
    case "decreasing":
    case "falling":
      return <ArrowDownRight size={size} />;
    default:
      return null;
  }
}

function getTrendText(trend) {
  switch (trend) {
    case "increasing":
      return "Increasing";
    case "decreasing":
      return "Decreasing";
    case "rising":
      return "Rising";
    case "falling":
      return "Falling";
    default:
      return "Stable";
  }
}

export default App;
