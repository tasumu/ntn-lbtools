"""ITU-R recommendation knowledge base for propagation analysis."""

from typing import TypedDict


class GuidanceInfo(TypedDict, total=False):
    """Guidance information for a specific condition."""

    description: str
    mitigations: list[str]
    typical_values: dict[str, str]


class RecommendationInfo(TypedDict):
    """Information about an ITU-R recommendation."""

    title: str
    purpose: str
    key_factors: list[str]
    guidance: dict[str, GuidanceInfo]


ITU_R_KNOWLEDGE: dict[str, RecommendationInfo] = {
    "P.618": {
        "title": "Propagation data and prediction methods for satellite systems",
        "purpose": "降雨減衰の予測モデル。地球-宇宙パスにおける降雨による信号減衰を計算。",
        "key_factors": [
            "降雨強度 (mm/hr)",
            "仰角 (deg)",
            "周波数 (GHz)",
            "偏波 (水平/垂直/円)",
            "地上局位置 (緯度/経度)",
        ],
        "guidance": {
            "high_loss": {
                "description": "降雨減衰が大きい場合の対策",
                "mitigations": [
                    "仰角を上げる（雨域通過距離短縮）",
                    "低い周波数へ変更（Ku→C帯など）",
                    "フェードマージンを大きく設計",
                    "サイトダイバーシティの導入",
                    "アダプティブ符号化変調（ACM）の使用",
                ],
                "typical_values": {
                    "C_band": "0.01%可用性で0.1-1 dB",
                    "Ku_band_temperate": "0.01%可用性で2-10 dB",
                    "Ku_band_tropical": "0.01%可用性で5-20 dB",
                    "Ka_band_temperate": "0.01%可用性で5-15 dB",
                    "Ka_band_tropical": "0.01%可用性で10-40 dB",
                },
            },
            "frequency_scaling": {
                "description": "周波数による減衰の変化",
                "mitigations": [
                    "周波数の2乗に比例して増加",
                    "高周波数ほど対策が重要",
                ],
                "typical_values": {
                    "scaling": "減衰(f2)/減衰(f1) ≈ (f2/f1)^2 (概算)",
                },
            },
            "elevation_effect": {
                "description": "仰角の影響",
                "mitigations": [
                    "仰角が低いほど雨域通過距離が長い",
                    "10度以下では減衰が急増",
                ],
                "typical_values": {
                    "low_elevation": "5度で高仰角の3-5倍の減衰",
                },
            },
        },
    },
    "P.676": {
        "title": "Attenuation by atmospheric gases",
        "purpose": "大気ガス（酸素・水蒸気）による減衰予測。10 GHz以上で重要。",
        "key_factors": [
            "周波数 (GHz)",
            "仰角 (deg)",
            "温度 (K)",
            "水蒸気密度 (g/m³)",
            "気圧 (hPa)",
        ],
        "guidance": {
            "absorption_peaks": {
                "description": "吸収ピーク周波数",
                "mitigations": [
                    "水蒸気: 22.2 GHz付近でピーク",
                    "酸素: 60 GHz付近で強いピーク",
                    "ピーク周波数を避けて設計",
                ],
                "typical_values": {
                    "22_GHz": "水蒸気吸収 ≈ 0.2 dB/km（地表付近）",
                    "60_GHz": "酸素吸収 ≈ 15 dB/km（地表付近）",
                },
            },
            "high_humidity": {
                "description": "高湿度環境での対策",
                "mitigations": [
                    "乾燥地域では水蒸気減衰が小さい",
                    "熱帯地域では追加マージンが必要",
                ],
                "typical_values": {
                    "tropical": "水蒸気密度 20+ g/m³",
                    "temperate": "水蒸気密度 7.5 g/m³（標準）",
                    "dry": "水蒸気密度 3-5 g/m³",
                },
            },
            "ka_band": {
                "description": "Ka帯での大気ガス減衰",
                "mitigations": [
                    "Ka帯（26.5-40 GHz）では無視できない",
                    "晴天時でも0.5-2 dBの減衰",
                ],
                "typical_values": {
                    "clear_sky_30GHz": "仰角30度で0.3-0.5 dB",
                    "clear_sky_40GHz": "仰角30度で0.5-1.0 dB",
                },
            },
        },
    },
    "P.840": {
        "title": "Attenuation due to clouds and fog",
        "purpose": "雲・霧による減衰予測。降雨がない場合でも発生。",
        "key_factors": [
            "周波数 (GHz)",
            "仰角 (deg)",
            "地上局位置 (緯度/経度)",
            "可用性 (%)",
        ],
        "guidance": {
            "frequency_dependence": {
                "description": "周波数依存性",
                "mitigations": [
                    "10 GHz以下では通常無視可能",
                    "周波数の2乗に比例",
                ],
                "typical_values": {
                    "10_GHz": "< 0.1 dB",
                    "20_GHz": "0.2-0.5 dB",
                    "30_GHz": "0.5-1.5 dB",
                },
            },
            "cloudy_regions": {
                "description": "雲の多い地域での対策",
                "mitigations": [
                    "年間雲量が多い地域では追加マージン",
                    "雨とは独立して発生",
                ],
                "typical_values": {
                    "tropical": "年間雲量が多く減衰大",
                    "desert": "雲量が少なく減衰小",
                },
            },
        },
    },
    "P.453": {
        "title": "The radio refractive index",
        "purpose": "大気屈折率の予測。仰角計算の補正に使用。",
        "key_factors": [
            "温度 (K)",
            "気圧 (hPa)",
            "水蒸気分圧 (hPa)",
        ],
        "guidance": {
            "low_elevation": {
                "description": "低仰角での影響",
                "mitigations": [
                    "仰角5度以下で屈折効果が顕著",
                    "幾何学的仰角と見かけ仰角の差",
                ],
                "typical_values": {
                    "refraction": "仰角5度で約0.5度の補正",
                },
            },
        },
    },
    "P.525": {
        "title": "Calculation of free-space attenuation",
        "purpose": "自由空間伝搬損失（FSPL）の計算。基本的な経路損失。",
        "key_factors": [
            "周波数 (Hz)",
            "距離 (km)",
        ],
        "guidance": {
            "formula": {
                "description": "計算式",
                "mitigations": [
                    "FSPL(dB) = 20 log₁₀(d) + 20 log₁₀(f) + 20 log₁₀(4π/c)",
                    "距離2倍で6 dB増加",
                    "周波数2倍で6 dB増加",
                ],
                "typical_values": {
                    "GEO_C_band": "約196 dB（6 GHz, 36,000 km）",
                    "GEO_Ku_band": "約206 dB（14 GHz, 36,000 km）",
                    "GEO_Ka_band": "約213 dB（30 GHz, 36,000 km）",
                },
            },
        },
    },
}


def get_recommendation_guidance(
    recommendation: str,
    condition: str | None = None,
) -> dict:
    """Get guidance for a specific ITU-R recommendation.

    Args:
        recommendation: ITU-R recommendation identifier (e.g., "P.618")
        condition: Specific condition to get guidance for (e.g., "high_loss")

    Returns:
        Dictionary containing recommendation information and guidance.
    """
    rec_info = ITU_R_KNOWLEDGE.get(recommendation)
    if not rec_info:
        return {"error": f"Unknown recommendation: {recommendation}"}

    if condition:
        guidance = rec_info.get("guidance", {}).get(condition)
        if guidance:
            return {
                "recommendation": recommendation,
                "title": rec_info["title"],
                "condition": condition,
                **guidance,
            }
        return {"error": f"Unknown condition: {condition} for {recommendation}"}

    return {
        "recommendation": recommendation,
        **rec_info,
    }


def explain_loss(
    loss_type: str,
    value_db: float,
    frequency_hz: float | None = None,
    elevation_deg: float | None = None,
) -> str:
    """Generate an explanation for a specific loss value.

    Args:
        loss_type: Type of loss ("rain", "gas", "cloud", "fspl", "pointing")
        value_db: Loss value in dB
        frequency_hz: Operating frequency (optional)
        elevation_deg: Elevation angle (optional)

    Returns:
        Human-readable explanation of the loss.
    """
    freq_ghz = frequency_hz / 1e9 if frequency_hz else None

    if loss_type == "rain":
        rec = ITU_R_KNOWLEDGE["P.618"]
        if value_db < 1:
            severity = "小さい（晴天または軽い雨）"
        elif value_db < 5:
            severity = "中程度（雨天時の典型値）"
        elif value_db < 15:
            severity = "大きい（豪雨時）"
        else:
            severity = "非常に大きい（激しい豪雨）"

        explanation = f"降雨減衰: {value_db:.1f} dB - {severity}\n"
        explanation += f"ITU-R {rec['title']}\n\n"

        if value_db > 5:
            guidance = rec["guidance"]["high_loss"]
            explanation += "対策:\n"
            for m in guidance["mitigations"][:3]:
                explanation += f"  - {m}\n"

        return explanation

    if loss_type == "gas":
        rec = ITU_R_KNOWLEDGE["P.676"]
        if value_db < 0.5:
            severity = "小さい（低周波数または高仰角）"
        elif value_db < 2:
            severity = "中程度（Ka帯の典型値）"
        else:
            severity = "大きい（高周波数または低仰角）"

        explanation = f"大気ガス減衰: {value_db:.1f} dB - {severity}\n"
        explanation += f"ITU-R {rec['title']}\n\n"

        if freq_ghz and freq_ghz > 20:
            explanation += "注意: 22 GHz付近で水蒸気吸収ピークあり\n"

        return explanation

    if loss_type == "cloud":
        rec = ITU_R_KNOWLEDGE["P.840"]
        if value_db < 0.2:
            severity = "無視可能"
        elif value_db < 1:
            severity = "小さい"
        else:
            severity = "考慮が必要"

        explanation = f"雲減衰: {value_db:.1f} dB - {severity}\n"
        explanation += f"ITU-R {rec['title']}\n"

        return explanation

    if loss_type == "fspl":
        rec = ITU_R_KNOWLEDGE["P.525"]
        explanation = f"自由空間損失: {value_db:.1f} dB\n"
        explanation += f"ITU-R {rec['title']}\n\n"

        if freq_ghz:
            if freq_ghz < 10:
                band = "C帯"
            elif freq_ghz < 20:
                band = "Ku帯"
            else:
                band = "Ka帯"
            explanation += f"周波数帯: {band} ({freq_ghz:.1f} GHz)\n"

        return explanation

    if loss_type == "pointing":
        if value_db < 0.2:
            explanation = f"ポインティング損失: {value_db:.1f} dB - 良好なアンテナ指向\n"
        else:
            explanation = f"ポインティング損失: {value_db:.1f} dB - 低仰角または指向誤差\n"

        if elevation_deg and elevation_deg < 20:
            explanation += f"注意: 仰角 {elevation_deg:.1f}° は低い（大気通過距離が長い）\n"

        return explanation

    return f"未知の損失タイプ: {loss_type}"
