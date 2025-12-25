from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Protocol

from src.core.models.common import CalculationResult, RuntimeParameters


class WaveformStrategy(ABC):
    name: str

    @abstractmethod
    def select_modcod(self, cn0_dbhz: float, bandwidth_hz: float | None = None, rolloff: float | None = None):
        """Return a ModCod entry given CN0 (and optionally bandwidth and rolloff)."""

    @abstractmethod
    def spectral_efficiency(self) -> float:
        """Return waveform spectral efficiency placeholder."""


class CommunicationStrategy(Protocol):
    name: str

    async def calculate(self, runtime: RuntimeParameters, direction: str = "uplink") -> CalculationResult:
        ...
