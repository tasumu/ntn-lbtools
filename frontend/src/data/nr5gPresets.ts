import type { ModcodPresetEntry, ModcodPreset } from "./dvbs2xPresets";

/**
 * 5G NR MCS presets based on 3GPP TS 38.214 Table 5.1.3.1-2
 * (MCS index table 2 for PDSCH, up to 64QAM).
 *
 * Eb/N0 thresholds are representative AWGN values for BLER ≈ 10%.
 * info_bits_per_symbol = modulation_order × (target_code_rate / 1024).
 */
export const NR_5G_PRESETS: readonly ModcodPreset[] = Object.freeze([
  {
    name: "5G NR MCS Table 2 (64QAM)",
    entries: Object.freeze<ModcodPresetEntry[]>([
      { id: "mcs0",  modulation: "QPSK",  code_rate: "120/1024",  required_ebno_db: -6.70, info_bits_per_symbol: 0.2344 },
      { id: "mcs1",  modulation: "QPSK",  code_rate: "193/1024",  required_ebno_db: -4.70, info_bits_per_symbol: 0.3770 },
      { id: "mcs2",  modulation: "QPSK",  code_rate: "308/1024",  required_ebno_db: -2.30, info_bits_per_symbol: 0.6016 },
      { id: "mcs3",  modulation: "QPSK",  code_rate: "449/1024",  required_ebno_db: -0.20, info_bits_per_symbol: 0.8770 },
      { id: "mcs4",  modulation: "QPSK",  code_rate: "602/1024",  required_ebno_db:  1.70, info_bits_per_symbol: 1.1758 },
      { id: "mcs5",  modulation: "16QAM", code_rate: "378/1024",  required_ebno_db:  3.70, info_bits_per_symbol: 1.4766 },
      { id: "mcs6",  modulation: "16QAM", code_rate: "434/1024",  required_ebno_db:  5.00, info_bits_per_symbol: 1.6953 },
      { id: "mcs7",  modulation: "16QAM", code_rate: "490/1024",  required_ebno_db:  6.20, info_bits_per_symbol: 1.9141 },
      { id: "mcs8",  modulation: "16QAM", code_rate: "553/1024",  required_ebno_db:  7.40, info_bits_per_symbol: 2.1602 },
      { id: "mcs9",  modulation: "16QAM", code_rate: "616/1024",  required_ebno_db:  8.50, info_bits_per_symbol: 2.4063 },
      { id: "mcs10", modulation: "64QAM", code_rate: "466/1024",  required_ebno_db:  9.80, info_bits_per_symbol: 2.7305 },
      { id: "mcs11", modulation: "64QAM", code_rate: "517/1024",  required_ebno_db: 10.80, info_bits_per_symbol: 3.0293 },
      { id: "mcs12", modulation: "64QAM", code_rate: "567/1024",  required_ebno_db: 11.70, info_bits_per_symbol: 3.3223 },
      { id: "mcs13", modulation: "64QAM", code_rate: "616/1024",  required_ebno_db: 12.50, info_bits_per_symbol: 3.6094 },
      { id: "mcs14", modulation: "64QAM", code_rate: "666/1024",  required_ebno_db: 13.40, info_bits_per_symbol: 3.9023 },
      { id: "mcs15", modulation: "64QAM", code_rate: "719/1024",  required_ebno_db: 14.20, info_bits_per_symbol: 4.2129 },
      { id: "mcs16", modulation: "64QAM", code_rate: "772/1024",  required_ebno_db: 15.10, info_bits_per_symbol: 4.5234 },
      { id: "mcs17", modulation: "64QAM", code_rate: "822/1024",  required_ebno_db: 15.90, info_bits_per_symbol: 4.8164 },
      { id: "mcs18", modulation: "64QAM", code_rate: "873/1024",  required_ebno_db: 16.80, info_bits_per_symbol: 5.1152 },
      { id: "mcs19", modulation: "64QAM", code_rate: "910/1024",  required_ebno_db: 17.40, info_bits_per_symbol: 5.3320 },
    ]),
  },
  {
    name: "5G NR MCS Table 1 (256QAM)",
    entries: Object.freeze<ModcodPresetEntry[]>([
      { id: "mcs0-t1",  modulation: "QPSK",   code_rate: "120/1024",  required_ebno_db: -6.70, info_bits_per_symbol: 0.2344 },
      { id: "mcs1-t1",  modulation: "QPSK",   code_rate: "157/1024",  required_ebno_db: -5.50, info_bits_per_symbol: 0.3066 },
      { id: "mcs2-t1",  modulation: "QPSK",   code_rate: "193/1024",  required_ebno_db: -4.70, info_bits_per_symbol: 0.3770 },
      { id: "mcs3-t1",  modulation: "QPSK",   code_rate: "251/1024",  required_ebno_db: -3.30, info_bits_per_symbol: 0.4902 },
      { id: "mcs4-t1",  modulation: "QPSK",   code_rate: "308/1024",  required_ebno_db: -2.30, info_bits_per_symbol: 0.6016 },
      { id: "mcs5-t1",  modulation: "QPSK",   code_rate: "379/1024",  required_ebno_db: -1.00, info_bits_per_symbol: 0.7402 },
      { id: "mcs6-t1",  modulation: "QPSK",   code_rate: "449/1024",  required_ebno_db: -0.20, info_bits_per_symbol: 0.8770 },
      { id: "mcs7-t1",  modulation: "QPSK",   code_rate: "526/1024",  required_ebno_db:  0.70, info_bits_per_symbol: 1.0273 },
      { id: "mcs8-t1",  modulation: "QPSK",   code_rate: "602/1024",  required_ebno_db:  1.70, info_bits_per_symbol: 1.1758 },
      { id: "mcs9-t1",  modulation: "QPSK",   code_rate: "679/1024",  required_ebno_db:  2.50, info_bits_per_symbol: 1.3262 },
      { id: "mcs10-t1", modulation: "16QAM",  code_rate: "340/1024",  required_ebno_db:  4.30, info_bits_per_symbol: 1.3281 },
      { id: "mcs11-t1", modulation: "16QAM",  code_rate: "378/1024",  required_ebno_db:  5.20, info_bits_per_symbol: 1.4766 },
      { id: "mcs12-t1", modulation: "16QAM",  code_rate: "434/1024",  required_ebno_db:  6.00, info_bits_per_symbol: 1.6953 },
      { id: "mcs13-t1", modulation: "16QAM",  code_rate: "490/1024",  required_ebno_db:  6.90, info_bits_per_symbol: 1.9141 },
      { id: "mcs14-t1", modulation: "16QAM",  code_rate: "553/1024",  required_ebno_db:  7.80, info_bits_per_symbol: 2.1602 },
      { id: "mcs15-t1", modulation: "16QAM",  code_rate: "616/1024",  required_ebno_db:  8.70, info_bits_per_symbol: 2.4063 },
      { id: "mcs16-t1", modulation: "64QAM",  code_rate: "438/1024",  required_ebno_db: 10.30, info_bits_per_symbol: 2.5664 },
      { id: "mcs17-t1", modulation: "64QAM",  code_rate: "466/1024",  required_ebno_db: 10.80, info_bits_per_symbol: 2.7305 },
      { id: "mcs18-t1", modulation: "64QAM",  code_rate: "517/1024",  required_ebno_db: 11.50, info_bits_per_symbol: 3.0293 },
      { id: "mcs19-t1", modulation: "64QAM",  code_rate: "567/1024",  required_ebno_db: 12.20, info_bits_per_symbol: 3.3223 },
      { id: "mcs20-t1", modulation: "64QAM",  code_rate: "616/1024",  required_ebno_db: 13.00, info_bits_per_symbol: 3.6094 },
      { id: "mcs21-t1", modulation: "64QAM",  code_rate: "666/1024",  required_ebno_db: 13.70, info_bits_per_symbol: 3.9023 },
      { id: "mcs22-t1", modulation: "64QAM",  code_rate: "719/1024",  required_ebno_db: 14.50, info_bits_per_symbol: 4.2129 },
      { id: "mcs23-t1", modulation: "64QAM",  code_rate: "772/1024",  required_ebno_db: 15.30, info_bits_per_symbol: 4.5234 },
      { id: "mcs24-t1", modulation: "256QAM", code_rate: "567/1024",  required_ebno_db: 16.10, info_bits_per_symbol: 4.4297 },
      { id: "mcs25-t1", modulation: "256QAM", code_rate: "616/1024",  required_ebno_db: 17.00, info_bits_per_symbol: 4.8125 },
      { id: "mcs26-t1", modulation: "256QAM", code_rate: "666/1024",  required_ebno_db: 18.00, info_bits_per_symbol: 5.1953 },
      { id: "mcs27-t1", modulation: "256QAM", code_rate: "772/1024",  required_ebno_db: 19.30, info_bits_per_symbol: 6.0313 },
    ]),
  },
]);
