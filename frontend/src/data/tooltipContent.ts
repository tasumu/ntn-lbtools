export interface TooltipEntry {
  readonly description: string;
  readonly typicalRange: string;
}

export const TOOLTIP_CONTENT: Readonly<Record<string, TooltipEntry>> =
  Object.freeze({
    // Asset selectors
    waveform: {
      description: "Digital modulation standard used for the link (e.g. DVB-S2X).",
      typicalRange: "DVB-S2X, 5G-NR",
    },
    transponder_type: {
      description: "Satellite transponder architecture. Transparent: bent-pipe relay. Regenerative: onboard demod/remod.",
      typicalRange: "Transparent or Regenerative",
    },
    modcod_table: {
      description: "Modulation & coding lookup table that maps C/N to spectral efficiency.",
      typicalRange: "DVB-S2X standard table",
    },
    satellite: {
      description: "GEO satellite asset providing EIRP and G/T for the link budget.",
      typicalRange: "GEO, 0.05\u00b0 inclination",
    },
    earth_station_tx: {
      description: "Transmitting ground station with antenna gain, EIRP, and location.",
      typicalRange: "3\u201313 m dish, 50\u201370 dBW EIRP",
    },
    earth_station_rx: {
      description: "Receiving ground station with G/T and noise temperature.",
      typicalRange: "3\u201313 m dish, 20\u201335 dB/K G/T",
    },

    // General link parameters
    rolloff: {
      description: "Root-raised-cosine filter rolloff factor controlling excess bandwidth.",
      typicalRange: "0.05\u20130.35 (DVB-S2X: 0.05, 0.10, 0.20)",
    },
    bandwidth_hz: {
      description: "Transponder channel bandwidth shared by uplink and downlink (transparent mode).",
      typicalRange: "24\u201372 MHz",
    },

    // Uplink parameters
    uplink_frequency: {
      description: "Center frequency of the uplink carrier from earth station to satellite.",
      typicalRange: "Ku: 14.0\u201314.5 GHz, Ka: 27\u201331 GHz",
    },
    uplink_bandwidth: {
      description: "Uplink channel bandwidth (regenerative mode only).",
      typicalRange: "24\u201372 MHz",
    },
    uplink_ground_lat: {
      description: "Latitude of the transmitting earth station used for atmospheric modeling.",
      typicalRange: "-60\u00b0 to +60\u00b0",
    },
    uplink_ground_lon: {
      description: "Longitude of the transmitting earth station used for slant path geometry.",
      typicalRange: "-180\u00b0 to +180\u00b0",
    },
    uplink_ground_alt: {
      description: "Altitude of the transmitting earth station above sea level.",
      typicalRange: "0\u20133000 m",
    },
    uplink_rain_rate: {
      description: "Local rain rate for ITU-R P.618 uplink rain attenuation model.",
      typicalRange: "0\u201350 mm/hr (0.01% exceedance)",
    },
    uplink_modcod: {
      description: "Per-direction ModCod table for the uplink (regenerative mode only).",
      typicalRange: "DVB-S2X standard table",
    },

    // Downlink parameters
    downlink_frequency: {
      description: "Center frequency of the downlink carrier from satellite to earth station.",
      typicalRange: "Ku: 10.7\u201312.75 GHz, Ka: 17\u201321 GHz",
    },
    downlink_bandwidth: {
      description: "Downlink channel bandwidth (regenerative mode only).",
      typicalRange: "24\u201372 MHz",
    },
    downlink_ground_lat: {
      description: "Latitude of the receiving earth station used for atmospheric modeling.",
      typicalRange: "-60\u00b0 to +60\u00b0",
    },
    downlink_ground_lon: {
      description: "Longitude of the receiving earth station used for slant path geometry.",
      typicalRange: "-180\u00b0 to +180\u00b0",
    },
    downlink_ground_alt: {
      description: "Altitude of the receiving earth station above sea level.",
      typicalRange: "0\u20133000 m",
    },
    downlink_rain_rate: {
      description: "Local rain rate for ITU-R P.618 downlink rain attenuation model.",
      typicalRange: "0\u201350 mm/hr (0.01% exceedance)",
    },
    downlink_modcod: {
      description: "Per-direction ModCod table for the downlink (regenerative mode only).",
      typicalRange: "DVB-S2X standard table",
    },

    // Interference parameters
    adjacent_sat_ci: {
      description: "Carrier-to-interference ratio from adjacent satellite systems.",
      typicalRange: "20\u201335 dB",
    },
    cross_polar_ci: {
      description: "Carrier-to-interference ratio from cross-polarization leakage.",
      typicalRange: "25\u201340 dB",
    },
    other_carrier_ci: {
      description: "Carrier-to-interference ratio from other co-frequency carriers.",
      typicalRange: "20\u201335 dB",
    },

    // Intermodulation parameters
    input_backoff: {
      description: "Transponder input power back-off from saturation to reduce intermodulation products.",
      typicalRange: "0\u201310 dB",
    },
    output_backoff: {
      description: "Transponder output power back-off, related to IBO by the AM/AM curve.",
      typicalRange: "0\u20136 dB",
    },
    saturation_power: {
      description: "Transponder saturated output power, sets the maximum available EIRP.",
      typicalRange: "20\u201360 dBW",
    },
    composite_carriers: {
      description: "Number of carriers sharing the transponder, affecting intermodulation noise.",
      typicalRange: "1\u201320",
    },
    reference_bandwidth: {
      description: "Reference bandwidth for intermodulation noise density calculation.",
      typicalRange: "24\u201372 MHz",
    },
  });
