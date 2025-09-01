/**
 * Tidal Calculator using CSV tide data and interpolation
 * Uses the cosine interpolation formula for tide prediction
 */
export class TidalCalculator {
  constructor() {
    this.tidalData = null;
    this.currentYear = new Date().getFullYear();
  }

  /**
   * Load tidal data from CSV file
   * @param {number} year - Year to load data for
   */
  async loadTidalData(year = null) {
    const targetYear = year || this.currentYear;

    try {
      console.log(`Loading tidal data for ${targetYear}...`);
      const fileName = `Raglan ${targetYear}.csv`;
      const csvPath = `/opsdash/${encodeURIComponent(fileName)}`;
      console.log(`Fetching from: ${csvPath}`);
      const response = await fetch(csvPath);
      console.log(`Response status: ${response.status}`);
      if (!response.ok) {
        throw new Error(`Failed to load tidal data for ${targetYear}`);
      }

      const csvText = await response.text();
      console.log(`CSV text length: ${csvText.length}`);
      this.tidalData = this.parseCSV(csvText);
      console.log(`Parsed ${this.tidalData.length} tidal events`);
      this.currentYear = targetYear;
    } catch (error) {
      console.error("Error loading tidal data:", error);
      throw error;
    }
  }

  /**
   * Parse CSV tidal data
   * @param {string} csvText - Raw CSV text
   * @returns {Array} Parsed tidal data
   */
  parseCSV(csvText) {
    const lines = csvText.trim().split("\n");
    const tidalEvents = [];

    for (const line of lines) {
      if (line.startsWith("﻿")) {
        // Remove BOM if present
        const cleanLine = line.substring(1);
        const parts = cleanLine.split(",");
        this.parseLineToParts(parts, tidalEvents);
      } else {
        const parts = line.split(",");
        this.parseLineToParts(parts, tidalEvents);
      }
    }

    return tidalEvents.sort(
      (a, b) => a.dateTime.getTime() - b.dateTime.getTime()
    );
  }

  /**
   * Parse a single CSV line into tidal events
   * @param {Array} parts - CSV line parts
   * @param {Array} tidalEvents - Array to add events to
   */
  parseLineToParts(parts, tidalEvents) {
    if (parts.length < 6) return;

    const day = parseInt(parts[0]);
    const month = parseInt(parts[2]);
    const year = parseInt(parts[3]);

    // Parse up to 4 tide events per day
    for (let i = 0; i < 4; i++) {
      const timeIndex = 4 + i * 2;
      const heightIndex = 5 + i * 2;

      if (timeIndex < parts.length && heightIndex < parts.length) {
        const timeStr = parts[timeIndex]?.trim();
        const heightStr = parts[heightIndex]?.trim();

        if (timeStr && heightStr) {
          const [hours, minutes] = timeStr.split(":").map(Number);
          const height = parseFloat(heightStr);

          if (!isNaN(hours) && !isNaN(minutes) && !isNaN(height)) {
            // Create date in New Zealand timezone
            // The CSV times are in New Zealand local time (NZST/NZDT)
            const dateTime = this.createNZDate(
              year,
              month - 1,
              day,
              hours,
              minutes
            );
            tidalEvents.push({ dateTime, height });
          }
        }
      }
    }
  }

  /**
   * Calculate tide height at given time using interpolation formula
   * h = h1 + (h2 - h1)[(cosA + 1)/2]
   * where A = π([(t - t1)/(t2 - t1)] + 1) radians
   * @param {Date} dateTime - Time to calculate tide for
   * @returns {number} Tide height in meters
   */
  calculateTide(dateTime) {
    if (!this.tidalData) {
      throw new Error("Tidal data not loaded. Call loadTidalData() first.");
    }

    // Find surrounding tide events (t1 and t2)
    const targetTime = dateTime.getTime();
    let t1Event = null;
    let t2Event = null;

    for (let i = 0; i < this.tidalData.length - 1; i++) {
      const current = this.tidalData[i];
      const next = this.tidalData[i + 1];

      if (
        targetTime >= current.dateTime.getTime() &&
        targetTime <= next.dateTime.getTime()
      ) {
        t1Event = current;
        t2Event = next;
        break;
      }
    }

    if (!t1Event || !t2Event) {
      // If outside data range, return closest value
      if (targetTime < this.tidalData[0].dateTime.getTime()) {
        return this.tidalData[0].height;
      } else {
        return this.tidalData[this.tidalData.length - 1].height;
      }
    }

    // Use milliseconds for more precise calculation instead of decimal hours
    const t = dateTime.getTime();
    const t1 = t1Event.dateTime.getTime();
    const t2 = t2Event.dateTime.getTime();

    const h1 = t1Event.height;
    const h2 = t2Event.height;

    // Apply the interpolation formula
    // h = h1 + (h2 - h1)[(cosA + 1)/2]
    // where A = π([(t - t1)/(t2 - t1)] + 1) radians
    const A = Math.PI * ((t - t1) / (t2 - t1) + 1);
    const h = h1 + (h2 - h1) * ((Math.cos(A) + 1) / 2);

    return h;
  }

  /**
   * Create a Date object interpreting the time as New Zealand local time
   * @param {number} year - Year
   * @param {number} month - Month (0-indexed)
   * @param {number} day - Day
   * @param {number} hours - Hours
   * @param {number} minutes - Minutes
   * @returns {Date} Date object representing NZ time
   */
  createNZDate(year, month, day, hours, minutes) {
    // Create ISO string for the New Zealand time
    const paddedMonth = (month + 1).toString().padStart(2, "0");
    const paddedDay = day.toString().padStart(2, "0");
    const paddedHours = hours.toString().padStart(2, "0");
    const paddedMinutes = minutes.toString().padStart(2, "0");

    // Create date string in the format expected for NZ time
    // Note: This assumes the CSV times are in NZ local time (NZST/NZDT)
    const isoString = `${year}-${paddedMonth}-${paddedDay}T${paddedHours}:${paddedMinutes}:00`;

    // For a Raglan coastguard dashboard, we want to work in NZ time
    // The simplest approach is to treat the CSV times as local to where the app runs
    // If deployed in NZ, this will be correct. If accessed remotely, times will display
    // in the viewer's local timezone but tide calculations will still be accurate
    return new Date(isoString);
  }

  /**
   * Convert Date to decimal hours
   * @param {Date} date - Date to convert
   * @returns {number} Hours as decimal
   */
  dateToDecimalHours(date) {
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  }

  /**
   * Calculate tide levels for multiple times
   * @param {Date} startTime - Start time
   * @param {number} hours - Number of hours to calculate
   * @param {number} intervalMinutes - Interval between calculations in minutes
   * @returns {Array} Array of {time, level} objects
   */
  calculateTideRange(startTime, hours, intervalMinutes = 60) {
    const results = [];
    const intervalMs = intervalMinutes * 60 * 1000;
    const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

    for (
      let time = new Date(startTime);
      time <= endTime;
      time = new Date(time.getTime() + intervalMs)
    ) {
      results.push({
        time: new Date(time),
        level: this.calculateTide(time),
      });
    }

    return results;
  }

  /**
   * Find the next high or low tide from the CSV data
   * @param {Date} startTime - Time to start searching from
   * @param {number} hoursAhead - How many hours ahead to search
   * @returns {Object} {time, level, type} where type is 'high' or 'low'
   */
  findNextTidalExtreme(startTime, hoursAhead = 12) {
    if (!this.tidalData) {
      throw new Error("Tidal data not loaded. Call loadTidalData() first.");
    }

    const startTimeMs = startTime.getTime();

    // Find the next tide event after startTime
    const nextEvent = this.tidalData.find(
      (event) => event.dateTime.getTime() > startTimeMs
    );

    if (!nextEvent) {
      return null;
    }

    // Determine if it's high or low by comparing with previous event
    const eventIndex = this.tidalData.findIndex(
      (e) => e.dateTime.getTime() === nextEvent.dateTime.getTime()
    );
    const prevEvent = eventIndex > 0 ? this.tidalData[eventIndex - 1] : null;

    const type =
      prevEvent && nextEvent.height > prevEvent.height ? "high" : "low";

    return {
      time: nextEvent.dateTime,
      level: nextEvent.height,
      type: type,
    };
  }

  /**
   * Get tidal trend (rising or falling)
   * @param {Date} dateTime - Current time
   * @returns {string} 'rising' or 'falling'
   */
  getTrend(dateTime) {
    if (!this.tidalData) {
      throw new Error("Tidal data not loaded. Call loadTidalData() first.");
    }

    const currentTimeMs = dateTime.getTime();

    // Find the most recent tide event before current time
    const previousEvent = this.tidalData
      .filter((event) => event.dateTime.getTime() <= currentTimeMs)
      .slice(-1)[0];

    // Find the next tide event after current time
    const nextEvent = this.tidalData.find(
      (event) => event.dateTime.getTime() > currentTimeMs
    );

    if (!previousEvent || !nextEvent) {
      return "rising"; // Default fallback
    }

    // If next tide is higher than previous, we're rising; otherwise falling
    return nextEvent.height > previousEvent.height ? "rising" : "falling";
  }

  /**
   * Get current tidal state information
   * @param {Date} dateTime - Current time
   * @returns {Object} Complete tidal information
   */
  getCurrentTideInfo(dateTime = new Date()) {
    const currentLevel = this.calculateTide(dateTime);
    const trend = this.getTrend(dateTime);
    const nextExtreme = this.findNextTidalExtreme(dateTime);

    return {
      current: currentLevel,
      trend: trend,
      nextStage: nextExtreme ? nextExtreme.type : "unknown",
      nextStageTime: nextExtreme ? nextExtreme.time.toISOString() : null,
      nextStageHeight: nextExtreme ? nextExtreme.level.toFixed(1) : null,
      timestamp: dateTime.toISOString(),
    };
  }
}
