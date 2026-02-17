"""Frequency band definitions for satellite communications."""

from typing import TypedDict


class BandInfo(TypedDict):
    """Information about a frequency band."""

    name: str
    uplink_ghz: tuple[float, float]
    downlink_ghz: tuple[float, float]
    typical_applications: list[str]
    rain_sensitivity: str
    notes: str


FREQUENCY_BANDS: dict[str, BandInfo] = {
    "L": {
        "name": "L-band",
        "uplink_ghz": (1.626, 1.6605),
        "downlink_ghz": (1.525, 1.559),
        "typical_applications": ["海事通信", "航空通信", "IoT", "モバイル衛星"],
        "rain_sensitivity": "低い",
        "notes": "降雨減衰の影響が小さい。帯域幅が狭い。",
    },
    "S": {
        "name": "S-band",
        "uplink_ghz": (2.655, 2.690),
        "downlink_ghz": (2.500, 2.535),
        "typical_applications": ["気象衛星", "科学衛星", "NTN（一部）"],
        "rain_sensitivity": "低い",
        "notes": "干渉を受けやすい。限られた帯域。",
    },
    "C": {
        "name": "C-band",
        "uplink_ghz": (5.925, 6.425),
        "downlink_ghz": (3.700, 4.200),
        "typical_applications": ["TV配信", "通信バックホール", "VSAT"],
        "rain_sensitivity": "低い",
        "notes": "降雨減衰が小さく可用性が高い。地上系との干渉課題。",
    },
    "X": {
        "name": "X-band",
        "uplink_ghz": (7.900, 8.400),
        "downlink_ghz": (7.250, 7.750),
        "typical_applications": ["軍事通信", "政府通信"],
        "rain_sensitivity": "中程度",
        "notes": "主に軍事・政府用途。",
    },
    "Ku": {
        "name": "Ku-band",
        "uplink_ghz": (14.0, 14.5),
        "downlink_ghz": (12.2, 12.7),  # FSS typical
        "typical_applications": ["DTH放送", "VSAT", "船舶通信", "航空Wi-Fi"],
        "rain_sensitivity": "中程度",
        "notes": "最も普及した商用帯域。降雨時のフェードマージン必要。",
    },
    "Ka": {
        "name": "Ka-band",
        "uplink_ghz": (27.5, 30.0),
        "downlink_ghz": (17.7, 21.2),
        "typical_applications": ["HTS", "ブロードバンド", "5G NTN"],
        "rain_sensitivity": "高い",
        "notes": "広帯域が利用可能。降雨減衰が大きくACM/サイトダイバーシティが重要。",
    },
    "Q": {
        "name": "Q-band",
        "uplink_ghz": (42.5, 43.5),
        "downlink_ghz": (37.5, 42.5),
        "typical_applications": ["次世代HTS", "フィーダーリンク"],
        "rain_sensitivity": "非常に高い",
        "notes": "未来の大容量システム向け。厳しい降雨対策必要。",
    },
    "V": {
        "name": "V-band",
        "uplink_ghz": (47.2, 50.2),
        "downlink_ghz": (37.5, 42.5),
        "typical_applications": ["次世代システム", "研究開発"],
        "rain_sensitivity": "非常に高い",
        "notes": "非常に広い帯域。技術的課題多い。",
    },
}

# Common frequency aliases
BAND_ALIASES: dict[str, str] = {
    "l-band": "L",
    "lband": "L",
    "s-band": "S",
    "sband": "S",
    "c-band": "C",
    "cband": "C",
    "x-band": "X",
    "xband": "X",
    "ku-band": "Ku",
    "kuband": "Ku",
    "ku band": "Ku",
    "ka-band": "Ka",
    "kaband": "Ka",
    "ka band": "Ka",
    "q-band": "Q",
    "qband": "Q",
    "v-band": "V",
    "vband": "V",
}


def get_band_info(band_name: str) -> BandInfo | None:
    """Get information about a frequency band.

    Args:
        band_name: Band name (e.g., "Ku", "Ka", "ku-band")

    Returns:
        BandInfo or None if not found.
    """
    # Normalize the band name
    normalized = band_name.strip().lower()

    # Check aliases
    if normalized in BAND_ALIASES:
        band_key = BAND_ALIASES[normalized]
    elif band_name.upper() in FREQUENCY_BANDS:
        band_key = band_name.upper()
    elif band_name.capitalize() in FREQUENCY_BANDS:
        band_key = band_name.capitalize()
    else:
        return None

    return FREQUENCY_BANDS.get(band_key)


def frequency_to_band(frequency_hz: float) -> str | None:
    """Determine the frequency band for a given frequency.

    Args:
        frequency_hz: Frequency in Hz

    Returns:
        Band name or None if not in any known band.
    """
    freq_ghz = frequency_hz / 1e9

    for band_name, info in FREQUENCY_BANDS.items():
        ul_low, ul_high = info["uplink_ghz"]
        dl_low, dl_high = info["downlink_ghz"]

        if ul_low <= freq_ghz <= ul_high:
            return band_name
        if dl_low <= freq_ghz <= dl_high:
            return band_name

    return None


def get_typical_frequencies(band_name: str) -> dict[str, float] | None:
    """Get typical center frequencies for a band.

    Args:
        band_name: Band name (e.g., "Ku")

    Returns:
        Dictionary with uplink_hz and downlink_hz, or None if not found.
    """
    info = get_band_info(band_name)
    if not info:
        return None

    ul_center = (info["uplink_ghz"][0] + info["uplink_ghz"][1]) / 2
    dl_center = (info["downlink_ghz"][0] + info["downlink_ghz"][1]) / 2

    return {
        "uplink_hz": ul_center * 1e9,
        "downlink_hz": dl_center * 1e9,
    }
