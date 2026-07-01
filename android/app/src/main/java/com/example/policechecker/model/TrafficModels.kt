package com.example.policechecker.model

data class EnforcementEntry(
    val area: String,
    val road: String,
    val type: String,
)

data class DayData(
    val date: String,
    val weekday: String,
    val entries: List<EnforcementEntry>,
)

data class TrafficData(
    val updatedAt: String,
    val days: List<DayData>,
)

/** Entry enriched with distance from current location (null = location unknown). */
data class RankedEntry(
    val entry: EnforcementEntry,
    val distanceKm: Double?,
)
