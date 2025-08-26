export class TidalCalculator {
  constructor(tidalConstituents, datumOffset = 0) {
    this.constituents = tidalConstituents;
    this.datumOffset = datumOffset;
    
    // Tidal constituent frequencies in degrees per hour
    this.frequencies = {
      'M2': 28.984104, // Principal lunar semi-diurnal
      'S2': 30.000000, // Principal solar semi-diurnal
      'N2': 28.439730, // Lunar elliptic semi-diurnal
      'K1': 15.041069, // Lunar diurnal
      'O1': 13.943035, // Lunar diurnal
      'P1': 14.958931, // Solar diurnal
      'Q1': 13.398661, // Larger lunar elliptic diurnal
      'K2': 30.082137, // Lunisolar semi-diurnal
      'L2': 29.528479, // Smaller lunar elliptic semi-diurnal
      'T2': 29.958933, // Larger lunar elliptic semi-diurnal
      'M3': 43.476156, // Lunar terdiurnal
      'M4': 57.968208, // Shallow water overtide of M2
      'M6': 86.952312, // Shallow water overtide of M2
      'MU2': 27.968208, // Variational
      'NU2': 28.512583, // Lunar elliptic semi-diurnal second-order
      '2N2': 27.895355, // Lunar elliptic semi-diurnal
      'H1': 15.000000, // Solar diurnal
      'H2': 30.000000, // Solar semi-diurnal second harmonic
      'MN4': 57.423832, // Shallow water quarter diurnal
      'MS4': 58.984104, // Shallow water quarter diurnal
      'SK3': 45.041069, // Shallow water terdiurnal
      '2MS6': 87.968208, // Shallow water sixth-diurnal
      'EPS2': 27.423832, // Lunar elliptic semi-diurnal second-order
      'LDA2': 30.410686  // Lunisolar semi-diurnal
    };
  }

  /**
   * Calculate tidal level for a specific date/time
   * @param {Date} dateTime - The date and time to calculate tide for
   * @returns {number} Tidal level in meters
   */
  calculateTide(dateTime) {
    const now = new Date(dateTime);
    
    // Calculate hours since a reference epoch (J2000.0)
    const j2000 = new Date('2000-01-01T12:00:00Z');
    const hoursSinceJ2000 = (now - j2000) / (1000 * 60 * 60);
    
    let tideLevel = 0;
    
    // Apply harmonic analysis for each constituent
    Object.entries(this.constituents).forEach(([name, [amplitude, phase]]) => {
      const frequency = this.frequencies[name];
      if (frequency) {
        // Convert phase from radians to degrees if needed
        let phaseInDegrees = phase;
        if (Math.abs(phase) <= Math.PI * 2) {
          // Assume phase is in radians, convert to degrees
          phaseInDegrees = phase * (180 / Math.PI);
        }
        
        // Calculate the argument in degrees
        const argument = (frequency * hoursSinceJ2000 + phaseInDegrees) % 360;
        
        // Convert to radians for Math.cos
        const argumentRadians = argument * (Math.PI / 180);
        
        // Add constituent contribution
        tideLevel += amplitude * Math.cos(argumentRadians);
      }
    });
    
    // Add datum offset
    return tideLevel + this.datumOffset;
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
    const endTime = new Date(startTime.getTime() + (hours * 60 * 60 * 1000));
    
    for (let time = new Date(startTime); time <= endTime; time = new Date(time.getTime() + intervalMs)) {
      results.push({
        time: new Date(time),
        level: this.calculateTide(time)
      });
    }
    
    return results;
  }

  /**
   * Find the next high or low tide
   * @param {Date} startTime - Time to start searching from
   * @param {number} hoursAhead - How many hours ahead to search
   * @returns {Object} {time, level, type} where type is 'high' or 'low'
   */
  findNextTidalExtreme(startTime, hoursAhead = 12) {
    const interval = 6; // Check every 6 minutes
    const tideData = this.calculateTideRange(startTime, hoursAhead, interval);
    
    let extremes = [];
    
    // Find turning points (local maxima and minima)
    for (let i = 1; i < tideData.length - 1; i++) {
      const prev = tideData[i - 1];
      const current = tideData[i];
      const next = tideData[i + 1];
      
      // Local maximum (high tide)
      if (current.level > prev.level && current.level > next.level) {
        extremes.push({
          time: current.time,
          level: current.level,
          type: 'high'
        });
      }
      // Local minimum (low tide)
      else if (current.level < prev.level && current.level < next.level) {
        extremes.push({
          time: current.time,
          level: current.level,
          type: 'low'
        });
      }
    }
    
    return extremes.length > 0 ? extremes[0] : null;
  }

  /**
   * Get tidal trend (rising or falling)
   * @param {Date} dateTime - Current time
   * @returns {string} 'rising', 'falling', or 'stable'
   */
  getTrend(dateTime) {
    const now = new Date(dateTime);
    const later = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutes later
    
    const currentLevel = this.calculateTide(now);
    const laterLevel = this.calculateTide(later);
    
    const difference = laterLevel - currentLevel;
    
    if (Math.abs(difference) < 0.02) return 'stable'; // Less than 2cm change
    return difference > 0 ? 'rising' : 'falling';
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
      nextExtreme: nextExtreme,
      timestamp: dateTime.toISOString()
    };
  }
}