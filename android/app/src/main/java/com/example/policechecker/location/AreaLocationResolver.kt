package com.example.policechecker.location

/**
 * Resolves a representative lat/lon for a given area name.
 *
 * Level 1 implementation uses static representative points.
 * Future levels can geocode road names or use OSM polyline data.
 */
interface AreaLocationResolver {
    /** Returns (lat, lon) for the given area, or null if unknown. */
    fun resolve(area: String): Pair<Double, Double>?
}

/**
 * Static representative coordinates for each of the 7 Hyogo areas.
 *
 * Sources: approximate geographic centres of each police district.
 * 「高速」spans the entire prefecture; central Hyogo is used as a placeholder.
 * TODO(level2): replace with per-road geocoding for higher accuracy.
 */
class StaticAreaLocationResolver : AreaLocationResolver {

    private val coords: Map<String, Pair<Double, Double>> = mapOf(
        "神戸" to Pair(34.6901, 135.1956),  // Kobe city centre
        "阪神" to Pair(34.7355, 135.4141),  // Amagasaki area
        "東播" to Pair(34.7573, 134.8437),  // Kakogawa area
        "西播" to Pair(34.8394, 134.3393),  // Himeji area
        "但馬" to Pair(35.5317, 134.3545),  // Toyooka area
        "淡路" to Pair(34.3198, 134.8953),  // Awaji island centre
        // TODO(level2): 高速 spans the whole prefecture; a single point is a rough approximation
        "高速" to Pair(34.8500, 135.0000),  // Hyogo prefecture centre
    )

    override fun resolve(area: String): Pair<Double, Double>? = coords[area]
}
