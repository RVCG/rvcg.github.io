import { useState, useEffect, useRef } from "react";
import {
  Waves,
  Thermometer,
  Wind,
  ArrowLineUp,
  ArrowUpRight,
  ArrowDownRight,
} from "@phosphor-icons/react";
import { useWeatherData, useWeatherDisplay } from "./hooks/useWeatherData";
import "./App.css";

const LOOP = 30000;
const IFRAME = 10000;

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentView, setCurrentView] = useState("grid"); // 'grid', 'camera', or 'radar'
  const iframeRef = useRef(null);

  // Fetch weather data using React Query
  const { data: weatherData, isLoading, isError } = useWeatherData();
  const displayData = useWeatherDisplay(weatherData);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Complete app refresh every 30 minutes
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      //window.location.href = window.location.href;
    }, 30 * 60 * 1000); // 30 minutes in milliseconds

    return () => clearInterval(refreshTimer);
  }, []);

  // Manual view switching function
  const switchToNextView = () => {
    setCurrentView((prev) => {
      if (prev === "grid") return "camera";
      if (prev === "camera") return "windy";
      return "grid";
    });
  };

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

  // Manual view switching on key press or mouse click
  useEffect(() => {
    const handleKeyPress = (event) => {
      switchToNextView();
    };

    const handleClick = (event) => {
      // Prevent switching if clicking on iframe content
      if (event.target.tagName !== "IFRAME") {
        switchToNextView();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  // Focus iframe when camera view becomes active for better autoplay support
  useEffect(() => {
    if (currentView === "camera" && iframeRef.current) {
      // Small delay to ensure iframe is rendered
      setTimeout(() => {
        iframeRef.current?.focus();
        // Simulate user interaction to help with autoplay
        iframeRef.current?.click?.();
      }, 100);
    }
  }, [currentView]);

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
              ref={iframeRef}
              src="https://www.youtube.com/embed/eOnZBBVqwb0?autoplay=1&mute=1&loop=1&controls=1&rel=0"
              title="Raglan Bar Camera"
              frameBorder="0"
              allow="autoplay; encrypted-media; web-share"
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
                <div>
                  Waves (m)
                  <div className="widget-subtitle">
                    {displayData.waves.source}{" "}
                    {localTimestamp(displayData.waves.timestamp)}
                  </div>
                </div>
              </div>
              <div
                className="primary-value"
                style={{ color: displayData.waves.color }}
              >
                {displayData.waves.value}
              </div>
              {displayData.waves.direction && (
                <div className="secondary-value">
                  {displayData.waves.direction} {displayData.waves.period}s
                </div>
              )}
              <div
                className="trend"
                style={{ color: displayData.waves.trendColor }}
              >
                {getTrendIcon(displayData.waves.trend)}{" "}
                {displayData.waves.trend}
              </div>
            </div>
          </div>

          <div className="grid-quadrant se">
            <div className="widget">
              <div className="widget-title">
                <ArrowLineUp size={48} className="widget-icon" />
                <div>
                  Tide (m)
                  <div className="widget-subtitle">
                    Raglan Wharf {localTimestamp(displayData.tides.timestamp)}
                  </div>
                </div>
              </div>
              <div
                className="primary-value"
                style={{ color: displayData.tides.color }}
              >
                {displayData.tides.value}
              </div>
              {displayData.tides.nextStage && (
                <div className="secondary-value">
                  {`${displayData.tides.nextStage} ${displayData.tides.nextStageHeight} @${displayData.tides.nextStageTime}`}
                </div>
              )}
              <div
                className="trend"
                style={{ color: displayData.tides.trendColor }}
              >
                {getTrendIcon(displayData.tides.trend)}{" "}
                {displayData.tides.trend}
              </div>
            </div>
          </div>

          <div className="grid-quadrant sw">
            <div className="widget">
              <div className="widget-title">
                <Wind size={48} className="widget-icon" />
                <div>
                  Wind (kts)
                  <div className="widget-subtitle">
                    {displayData.wind.source}{" "}
                    {localTimestamp(displayData.wind.timestamp)}
                  </div>
                </div>
              </div>
              <div
                className="primary-value"
                style={{ color: displayData.wind.color }}
              >
                {displayData.wind.value}
              </div>
              {displayData.wind.direction && (
                <div
                  className="secondary-value"
                  style={{ color: displayData.wind.chillColor }}
                >
                  {displayData.wind.direction}
                </div>
              )}
              <div
                className="trend"
                style={{ color: displayData.wind.trendColor }}
              >
                {getTrendIcon(displayData.wind.trend)} {displayData.wind.trend}
              </div>
            </div>
          </div>

          <div className="grid-quadrant nw">
            <div className="widget">
              <div className="widget-title">
                <Thermometer size={48} className="widget-icon" />
                <div>
                  Air temp. (°C)
                  <div className="widget-subtitle">
                    Forecast on Bar{" "}
                    {localTimestamp(displayData.temperature.timestamp)}
                  </div>
                </div>
              </div>
              <div
                className="primary-value"
                style={{ color: displayData.temperature.color }}
              >
                {displayData.temperature.value}
              </div>
              {displayData.temperature.windChill && (
                <div className="secondary-value">
                  <span style={{ fontSize: "2rem" }}>Feels like </span>
                  <span
                    style={{
                      fontWeight: "bold",
                      color: displayData.temperature.chillColor,
                    }}
                  >
                    {displayData.temperature.windChill}
                  </span>
                </div>
              )}
              <div
                className="trend"
                style={{ color: displayData.temperature.trendColor }}
              >
                {getTrendIcon(displayData.temperature.trend)}{" "}
                {displayData.temperature.trend}
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
            style={{ color: displayData.waves.trendColor }}
          >
            {getTrendIcon(displayData.waves.trend, 30)}
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
            style={{ color: displayData.tides.trendColor }}
          >
            {getTrendIcon(displayData.tides.trend, 30)}
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
            style={{ color: displayData.wind.trendColor }}
          >
            {getTrendIcon(displayData.wind.trend, 30)}
          </div>
        </div>
      </div>

      <div className="grid-item">
        <div className="mini-widget">
          <div className="mini-title">
            <Thermometer size={32} className="mini-icon" />
            Air Temp
          </div>
          <div
            className="mini-value"
            style={{ color: displayData.temperature.color }}
          >
            {displayData.temperature.value}°C
            {displayData.temperature.windChill !==
              displayData.temperature.value && (
              <div style={{ fontSize: "0.7em", opacity: 0.8 }}>
                ({displayData.temperature.windChill}°C)
              </div>
            )}
          </div>
          <div
            className="mini-trend"
            style={{ color: displayData.temperature.trendColor }}
          >
            {getTrendIcon(displayData.temperature.trend, 30)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility functions for trend icons and text
function getTrendIcon(trend, size = 40) {
  switch (trend) {
    case "increasing":
    case "rising":
      return <ArrowUpRight size={size} weight="bold" />;
    case "decreasing":
    case "falling":
      return <ArrowDownRight size={size} weight="bold" />;
    default:
      return null;
  }
}

function localTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString("en-NZ", {
    timeZone: "Pacific/Auckland",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default App;
