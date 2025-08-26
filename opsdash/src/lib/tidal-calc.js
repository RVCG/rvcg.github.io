/**
 * JavaScript Tidal Height Calculator
 * Ported from Python tide calculation code
 * Calculates tidal heights from harmonic constituents
 */

class TidalCalculator {
    constructor() {
        // Constants
        this.T0 = Date.parse('1899-12-31 12:00:00') / 1000; // Unix timestamp in seconds
        this.R2D = 180.0 / Math.PI;
        this.D2R = 1.0 / this.R2D;
        this.PI2 = 2 * Math.PI;
        this.INV2PI = 1.0 / (2.0 * Math.PI);
        this.I2PI = 2.0 * Math.PI; // For complex calculations
        
        // Astronomical constants matrix
        this.ASTRO_C = [
            [270.434164, 13.1763965268, -0.0000850, 0.000000039],
            [279.696678, 0.9856473354, 0.00002267, 0.000000000],
            [334.329556, 0.1114040803, -0.0007739, -0.00000026],
            [-259.183275, 0.0529539222, -0.0001557, -0.000000050],
            [281.220844, 0.0000470684, 0.0000339, 0.000000070]
        ];
        
        // Default constituents
        this.DEFAULT_CONS = ["Z0", "M2", "S2", "N2", "K2", "K1", "O1", "P1", "Q1"];
        
        // Shallow water constituents
        this.S_CONS = ["K1", "K2", "L2", "M2", "N2", "O1", "P1", "S2"];
        
        // Constituent definitions [frequency(rad/day), doodson(6)+semi or shallow_factors]
        this.CONS_STR = {
            "Z0": [0.000000000, 0, 0, 0, 0, 0, 0, 0],
            "SA": [0.017201969, 0, 0, 1, 0, 0, -1, 0],
            "SSA": [0.034405582, 0, 0, 2, 0, 0, 0, 0],
            "MSM": [0.197510291, 0, 1, -2, 1, 0, 0, 0],
            "MM": [0.228027119, 0, 1, 0, -1, 0, 0, 0],
            "MSF": [0.425537426, 0, 2, -2, 0, 0, 0, 0],
            "MF": [0.459943008, 0, 2, 0, 0, 0, 0, 0],
            "Q1": [5.612417969, 1, -2, 0, 1, 0, 0, -0.25],
            "O1": [5.840445088, 1, -1, 0, 0, 0, 0, -0.25],
            "P1": [6.265982514, 1, 1, -2, 0, 0, 0, -0.25],
            "S1": [6.283186127, 1, 1, -1, 0, 0, 1, -0.75],
            "K1": [6.300388096, 1, 1, 0, 0, 0, 0, -0.75],
            "N2": [11.912806064, 2, -1, 0, 1, 0, 0, 0],
            "M2": [12.140833199, 2, 0, 0, 0, 0, 0, 0],
            "L2": [12.368860318, 2, 1, 0, -1, 0, 0, -0.5],
            "S2": [12.566370609, 2, 2, -2, 0, 0, 0, 0],
            "K2": [12.600776191, 2, 2, 0, 0, 0, 0, 0],
            "M3": [18.211249790, 3, 0, 0, 0, 0, 0, -0.5],
            "M4": [24.281666382, {'M2': 2}],
            "M6": [36.422499581, {'M2': 3}],
            "2N2": [11.684778945, 2, -2, 0, 2, 0, 0, 0],
            "MU2": [11.715295773, 2, -2, 2, 0, 0, 0, 0],
            "NU2": [11.943322892, 2, -1, 2, -1, 0, 0, 0],
            "T2": [12.549168640, 2, 2, -3, 0, 0, 1, 0],
            "EPS2": [11.487268638, 2, -3, 2, 1, 0, 0, 0],
            "LDA2": [12.338343490, 2, 1, -2, 1, 0, 0, -0.5],
            "MN4": [24.053639263, {'M2': 1, 'N2': 1}],
            "MS4": [24.707203808, {'M2': 1, 'S2': 1}],
            "2MS6": [36.848037006, {'M2': 2, 'S2': 1}],
            "SK3": [18.866758720, {'S2': 1, 'K1': 1}]
        };
        
        // Satellite factors for latitude corrections
        this.SAT_FAC = {
            cons: ["O1", "O1", "O1", "O1", "O1", "O1", "O1", "O1", "P1", "P1", "P1", "P1", "P1", "P1", "K1", "K1", "K1", "K1", "K1", "K1", "K1", "K1", "K1", "K1", "N2", "N2", "N2", "N2", "M2", "M2", "M2", "M2", "M2", "M2", "M2", "M2", "M2", "L2", "L2", "L2", "L2", "L2", "S2", "S2", "S2", "K2", "K2", "K2", "K2", "K2"],
            amprat: [0.0003, 0.0058, 0.1885, 0.0004, 0.0029, 0.0004, 0.0064, 0.001, 0.0008, 0.0112, 0.0004, 0.0004, 0.0015, 0.0003, 0.0002, 0.0001, 0.0007, 0.0001, 0.0001, 0.0198, 0.1356, 0.0029, 0.0002, 0.0001, 0.0039, 0.0008, 0.0005, 0.0373, 0.0001, 0.0004, 0.0005, 0.0373, 0.0001, 0.0009, 0.0002, 0.0006, 0.0002, 0.0366, 0.0047, 0.2505, 0.1102, 0.0156, 0.0022, 0.0001, 0.0001, 0.0024, 0.0004, 0.0128, 0.298, 0.0324],
            phcorr: [0.25, 0.5, 0, 0.25, 0.75, 0.25, 0.5, 0.5, 0, 0.5, 0.5, 0.75, 0.5, 0.5, 0, 0.75, 0.25, 0.75, 0, 0.5, 0, 0.5, 0.25, 0.25, 0.5, 0, 0, 0.5, 0.75, 0.75, 0, 0.5, 0.25, 0.75, 0.75, 0, 0, 0.5, 0, 0.5, 0.5, 0.5, 0, 0.75, 0, 0.75, 0.75, 0.5, 0, 0],
            ilatfac: [1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 2, 2, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 2, 0, 0, 0],
            deldood: [
                [-1, 0, 0, 1, 1, 1, 2, 2, 0, 0, 0, 1, 2, 2, -2, -1, -1, -1, 0, 0, 0, 0, 1, 1, -2, -1, 0, 0, -1, -1, 0, 0, 1, 1, 1, 2, 2, 0, 2, 2, 2, 2, 0, 1, 2, -1, -1, 0, 0, 0],
                [0, -2, -1, -1, 0, 1, 0, 1, -2, -1, 0, 0, 0, 1, -1, -1, 0, 1, -2, -1, 1, 2, 0, 1, -2, 0, -2, -1, -1, 0, -2, -1, -1, 0, 1, 0, 1, -1, -1, 0, 1, 2, -1, 0, 0, 0, 1, -1, 1, 2],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            ]
        };
    }
    
    /**
     * Calculate astronomical arguments for given time and constituents
     * @param {Array} constituents - Array of constituent names
     * @param {number} t - Unix timestamp in seconds
     * @param {number} lat - Latitude in degrees (optional)
     * @returns {Object} - {v, u, f} astronomical arguments, phase corrections, and amplitude factors
     */
    getAstro(constituents, t, lat = null) {
        const cons = constituents.map(c => c.trim());
        const days = (t - this.T0) / 86400;
        const D = days / 10000;
        
        // Compute astronomical constants
        const args = [1, days, D * D, D ** 3];
        
        // Coefficients from Explanatory Supplement
        const sc = [270.434164, 13.1763965268, -8.5e-05, 3.9e-08];
        const hc = [279.696678, 0.9856473354, 2.267e-05, 0.0];
        const pc = [334.329556, 0.1114040803, -0.0007739, -2.6e-07];
        const npc = [-259.183275, 0.0529539222, -0.0001557, -5e-08];
        const ppc = [281.220844, 4.70684e-05, 3.39e-05, 7e-08];
        const coef = [sc, hc, pc, npc, ppc];
        
        // Compute the parameters (fractional part of cycle)
        const astro = coef.map(c => this.fmod(this.dotProduct(c, args) / 360.0, 1));
        
        // Compute lunar time tau
        const tau = this.fmod(t / 86400, 1) + astro[1] - astro[0];
        astro.unshift(tau);
        
        // Calculate V (astronomical argument)
        const v = [];
        for (const c of cons) {
            if (this.CONS_STR[c]) {
                const consData = this.CONS_STR[c];
                if (consData.length > 3) {
                    const vdot = this.vectorDotProduct(consData.slice(1, 7), astro);
                    v.push(this.PI2 * this.fmod(vdot + consData[7], 1.0));
                } else {
                    v.push(0.0);
                }
            } else {
                console.warn(`Constituent ${c} not resolved`);
                v.push(NaN);
            }
        }
        
        let u = new Array(cons.length).fill(0);
        let f = new Array(cons.length).fill(1);
        
        // Apply latitude corrections if provided
        if (lat !== null) {
            if (lat < 5 && lat >= 0) lat = 5;
            if (lat > -5 && lat < 0) lat = -5;
            
            const slat = Math.sin(this.D2R * lat);
            let rr = [...this.SAT_FAC.amprat];
            const diufac = 0.36309 * (1.0 - 5.0 * slat * slat) / slat;
            
            // Apply latitude factors
            for (let i = 0; i < this.SAT_FAC.ilatfac.length; i++) {
                if (this.SAT_FAC.ilatfac[i] === 1) {
                    rr[i] = diufac * rr[i];
                } else if (this.SAT_FAC.ilatfac[i] === 2) {
                    rr[i] = 2.59808 * slat * rr[i];
                }
            }
            
            // Calculate phase corrections
            const uu = [];
            for (let i = 0; i < this.SAT_FAC.phcorr.length; i++) {
                let sum = 0;
                for (let j = 0; j < 3; j++) {
                    sum += astro[j + 3] * this.SAT_FAC.deldood[j][i];
                }
                uu.push(this.fmod(sum + this.SAT_FAC.phcorr[i], 1.0));
            }
            
            // Initialize complex factors
            const fsum = cons.map(() => ({ real: 1, imag: 0 }));
            
            // Apply satellite corrections
            for (let isat = 0; isat < this.SAT_FAC.cons.length; isat++) {
                const csat = this.SAT_FAC.cons[isat];
                const consIndex = cons.indexOf(csat);
                if (consIndex !== -1) {
                    const phase = this.PI2 * uu[isat];
                    fsum[consIndex].real += rr[isat] * Math.cos(phase);
                    fsum[consIndex].imag += rr[isat] * Math.sin(phase);
                }
            }
            
            // Convert to amplitude and phase
            f = fsum.map(fs => Math.sqrt(fs.real * fs.real + fs.imag * fs.imag));
            u = fsum.map(fs => Math.atan2(fs.imag, fs.real));
        }
        
        // Handle NaN values
        for (let i = 0; i < v.length; i++) {
            if (isNaN(v[i])) {
                v[i] = 0.0;
                u[i] = 0.0;
                f[i] = 0.0;
            }
        }
        
        return { v, u, f };
    }
    
    /**
     * Get constituent frequencies in rad/s
     * @param {Array} constituents - Array of constituent names
     * @returns {Array} - Array of frequencies in rad/s
     */
    getFreqs(constituents) {
        return constituents.map(c => {
            const consData = this.CONS_STR[c.trim()];
            return consData ? consData[0] / 86400.0 : 0.0;
        });
    }
    
    /**
     * Calculate tidal height for given time and harmonic constituents
     * @param {Object} constituents - Object with constituent names as keys and [amplitude, phase] as values
     * @param {number} timestamp - Unix timestamp in seconds
     * @param {number} lat - Latitude in degrees (optional)
     * @param {number} datumOffset - Datum offset in meters (optional)
     * @returns {number} - Calculated tidal height in meters
     */
    calculateTide(constituents, timestamp, lat = null, datumOffset = 0) {
        const consNames = Object.keys(constituents);
        const consData = Object.values(constituents);
        
        // Get astronomical arguments
        const { v, u, f } = this.getAstro(consNames, timestamp, lat);
        
        // Get frequencies
        const freqs = this.getFreqs(consNames);
        
        // Calculate tidal height
        let height = datumOffset;
        
        for (let i = 0; i < consNames.length; i++) {
            if (consData[i] && consData[i].length >= 2) {
                const [amplitude, phase] = consData[i];
                const V = v[i] + u[i];
                
                height += f[i] * amplitude * Math.cos(freqs[i] * 0 + V - phase);
            }
        }
        
        return height;
    }
    
    /**
     * Calculate tidal height time series
     * @param {Object} constituents - Object with constituent names as keys and [amplitude, phase] as values
     * @param {Array} timestamps - Array of Unix timestamps in seconds
     * @param {number} lat - Latitude in degrees (optional)
     * @param {number} datumOffset - Datum offset in meters (optional)
     * @returns {Array} - Array of calculated tidal heights in meters
     */
    calculateTideSeries(constituents, timestamps, lat = null, datumOffset = 0) {
        return timestamps.map(t => this.calculateTide(constituents, t, lat, datumOffset));
    }
    
    // Helper functions
    fmod(a, b) {
        return a - b * Math.floor(a / b);
    }
    
    dotProduct(a, b) {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }
    
    vectorDotProduct(a, b) {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TidalCalculator;
} else if (typeof window !== 'undefined') {
    window.TidalCalculator = TidalCalculator;
}