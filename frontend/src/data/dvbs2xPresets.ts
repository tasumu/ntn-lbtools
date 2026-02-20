export interface ModcodPresetEntry {
  readonly id: string;
  readonly modulation: string;
  readonly code_rate: string;
  readonly required_ebno_db: number;
  readonly info_bits_per_symbol: number;
}

export interface ModcodPreset {
  readonly name: string;
  readonly entries: readonly ModcodPresetEntry[];
}

/**
 * DVB-S2X ModCod presets based on ETSI EN 302 307-2 ideal AWGN thresholds.
 * Eb/N0 values are quasi-error-free (QEF) thresholds for BER ~1e-5 (pre-LDPC).
 */
export const DVB_S2X_PRESETS: readonly ModcodPreset[] = Object.freeze([
  {
    name: "DVB-S2X Normal Frames",
    entries: Object.freeze([
      { id: "qpsk-1/4",     modulation: "QPSK",   code_rate: "1/4",   required_ebno_db: -2.35, info_bits_per_symbol: 0.50 },
      { id: "qpsk-1/3",     modulation: "QPSK",   code_rate: "1/3",   required_ebno_db: -1.24, info_bits_per_symbol: 0.67 },
      { id: "qpsk-2/5",     modulation: "QPSK",   code_rate: "2/5",   required_ebno_db: -0.30, info_bits_per_symbol: 0.80 },
      { id: "qpsk-1/2",     modulation: "QPSK",   code_rate: "1/2",   required_ebno_db: 1.00,  info_bits_per_symbol: 1.00 },
      { id: "qpsk-3/5",     modulation: "QPSK",   code_rate: "3/5",   required_ebno_db: 2.23,  info_bits_per_symbol: 1.20 },
      { id: "qpsk-2/3",     modulation: "QPSK",   code_rate: "2/3",   required_ebno_db: 3.10,  info_bits_per_symbol: 1.33 },
      { id: "qpsk-3/4",     modulation: "QPSK",   code_rate: "3/4",   required_ebno_db: 4.03,  info_bits_per_symbol: 1.50 },
      { id: "qpsk-4/5",     modulation: "QPSK",   code_rate: "4/5",   required_ebno_db: 4.68,  info_bits_per_symbol: 1.60 },
      { id: "qpsk-5/6",     modulation: "QPSK",   code_rate: "5/6",   required_ebno_db: 5.18,  info_bits_per_symbol: 1.67 },
      { id: "qpsk-8/9",     modulation: "QPSK",   code_rate: "8/9",   required_ebno_db: 6.20,  info_bits_per_symbol: 1.78 },
      { id: "qpsk-9/10",    modulation: "QPSK",   code_rate: "9/10",  required_ebno_db: 6.42,  info_bits_per_symbol: 1.80 },
      { id: "8psk-3/5",     modulation: "8PSK",   code_rate: "3/5",   required_ebno_db: 5.50,  info_bits_per_symbol: 1.80 },
      { id: "8psk-2/3",     modulation: "8PSK",   code_rate: "2/3",   required_ebno_db: 6.62,  info_bits_per_symbol: 2.00 },
      { id: "8psk-3/4",     modulation: "8PSK",   code_rate: "3/4",   required_ebno_db: 7.91,  info_bits_per_symbol: 2.25 },
      { id: "8psk-5/6",     modulation: "8PSK",   code_rate: "5/6",   required_ebno_db: 9.35,  info_bits_per_symbol: 2.50 },
      { id: "8psk-8/9",     modulation: "8PSK",   code_rate: "8/9",   required_ebno_db: 10.69, info_bits_per_symbol: 2.67 },
      { id: "8psk-9/10",    modulation: "8PSK",   code_rate: "9/10",  required_ebno_db: 10.98, info_bits_per_symbol: 2.70 },
      { id: "16apsk-2/3",   modulation: "16APSK", code_rate: "2/3",   required_ebno_db: 8.97,  info_bits_per_symbol: 2.67 },
      { id: "16apsk-3/4",   modulation: "16APSK", code_rate: "3/4",   required_ebno_db: 10.21, info_bits_per_symbol: 3.00 },
      { id: "16apsk-4/5",   modulation: "16APSK", code_rate: "4/5",   required_ebno_db: 11.03, info_bits_per_symbol: 3.20 },
      { id: "16apsk-5/6",   modulation: "16APSK", code_rate: "5/6",   required_ebno_db: 11.61, info_bits_per_symbol: 3.33 },
      { id: "16apsk-8/9",   modulation: "16APSK", code_rate: "8/9",   required_ebno_db: 12.89, info_bits_per_symbol: 3.56 },
      { id: "16apsk-9/10",  modulation: "16APSK", code_rate: "9/10",  required_ebno_db: 13.13, info_bits_per_symbol: 3.60 },
      { id: "32apsk-3/4",   modulation: "32APSK", code_rate: "3/4",   required_ebno_db: 12.73, info_bits_per_symbol: 3.75 },
      { id: "32apsk-4/5",   modulation: "32APSK", code_rate: "4/5",   required_ebno_db: 13.64, info_bits_per_symbol: 4.00 },
      { id: "32apsk-5/6",   modulation: "32APSK", code_rate: "5/6",   required_ebno_db: 14.28, info_bits_per_symbol: 4.17 },
      { id: "32apsk-8/9",   modulation: "32APSK", code_rate: "8/9",   required_ebno_db: 15.69, info_bits_per_symbol: 4.44 },
      { id: "32apsk-9/10",  modulation: "32APSK", code_rate: "9/10",  required_ebno_db: 16.05, info_bits_per_symbol: 4.50 },
    ]),
  },
  {
    name: "DVB-S2X Short Frames",
    entries: Object.freeze([
      { id: "qpsk-s-1/4",   modulation: "QPSK", code_rate: "1/4",  required_ebno_db: -1.70, info_bits_per_symbol: 0.50 },
      { id: "qpsk-s-1/3",   modulation: "QPSK", code_rate: "1/3",  required_ebno_db: -0.55, info_bits_per_symbol: 0.67 },
      { id: "qpsk-s-2/5",   modulation: "QPSK", code_rate: "2/5",  required_ebno_db: 0.40,  info_bits_per_symbol: 0.80 },
      { id: "qpsk-s-1/2",   modulation: "QPSK", code_rate: "1/2",  required_ebno_db: 1.68,  info_bits_per_symbol: 1.00 },
      { id: "qpsk-s-3/5",   modulation: "QPSK", code_rate: "3/5",  required_ebno_db: 2.92,  info_bits_per_symbol: 1.20 },
      { id: "qpsk-s-2/3",   modulation: "QPSK", code_rate: "2/3",  required_ebno_db: 3.70,  info_bits_per_symbol: 1.33 },
      { id: "qpsk-s-3/4",   modulation: "QPSK", code_rate: "3/4",  required_ebno_db: 4.73,  info_bits_per_symbol: 1.50 },
      { id: "qpsk-s-4/5",   modulation: "QPSK", code_rate: "4/5",  required_ebno_db: 5.37,  info_bits_per_symbol: 1.60 },
      { id: "qpsk-s-5/6",   modulation: "QPSK", code_rate: "5/6",  required_ebno_db: 5.80,  info_bits_per_symbol: 1.67 },
      { id: "qpsk-s-8/9",   modulation: "QPSK", code_rate: "8/9",  required_ebno_db: 6.89,  info_bits_per_symbol: 1.78 },
      { id: "8psk-s-3/5",   modulation: "8PSK", code_rate: "3/5",  required_ebno_db: 6.20,  info_bits_per_symbol: 1.80 },
      { id: "8psk-s-2/3",   modulation: "8PSK", code_rate: "2/3",  required_ebno_db: 7.30,  info_bits_per_symbol: 2.00 },
      { id: "8psk-s-3/4",   modulation: "8PSK", code_rate: "3/4",  required_ebno_db: 8.60,  info_bits_per_symbol: 2.25 },
      { id: "8psk-s-5/6",   modulation: "8PSK", code_rate: "5/6",  required_ebno_db: 10.00, info_bits_per_symbol: 2.50 },
      { id: "8psk-s-8/9",   modulation: "8PSK", code_rate: "8/9",  required_ebno_db: 11.40, info_bits_per_symbol: 2.67 },
    ]),
  },
]);
