from __future__ import annotations

from collections.abc import Iterable, Sequence

from src.core.strategies.dvbs2x import BaseModcodStrategy, ModcodEntry


class NrStrategy(BaseModcodStrategy):
    """5G NR waveform strategy (OFDM-based).

    Uses overhead fraction instead of roll-off factor for effective spectral
    efficiency calculation:  SE = info_bits_per_symbol × (1 - overhead).

    The ``rolloff`` parameter in ModCod entries and runtime parameters is
    interpreted as the OFDM overhead fraction (CP + DMRS + guard band).
    """

    name = "5G_NR"
    default_overhead = 0.14

    def __init__(self, table: Sequence[ModcodEntry] | Iterable[dict] | None = None):
        super().__init__(table=table, default_table=None)

    def _resolve_overhead(self, entry: ModcodEntry, rolloff: float | None) -> float:
        """Resolve overhead fraction from explicit value, entry, or default."""
        overhead = rolloff if rolloff is not None else entry.rolloff
        if overhead is None:
            overhead = self.default_overhead
        return max(min(overhead, 1.0), 0.0)

    def _effective_spectral_efficiency(self, entry: ModcodEntry, rolloff: float | None) -> float:
        overhead = self._resolve_overhead(entry, rolloff)
        info_bits = self._info_bits_per_symbol(entry, rolloff)
        return info_bits * (1 - overhead)

    def spectral_efficiency(self) -> float:
        entries = self._sorted_entries()
        if not entries:
            return 1.0 * (1 - self.default_overhead)
        return self._effective_spectral_efficiency(entries[-1], self.default_overhead)
