package com.example.policechecker.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider
import com.example.policechecker.data.TrafficRepository
import com.example.policechecker.location.AreaLocationResolver
import com.example.policechecker.location.StaticAreaLocationResolver
import com.example.policechecker.location.haversineKm
import com.example.policechecker.model.DayData
import com.example.policechecker.model.EnforcementEntry
import com.example.policechecker.model.RankedEntry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class TrafficWidget : GlanceAppWidget() {

    private val resolver: AreaLocationResolver = StaticAreaLocationResolver()

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val repo = TrafficRepository(context)
        val data = withContext(Dispatchers.IO) { repo.readCache() }
        val today = data?.let { repo.todayEntries(it) }

        // Load last-known location from SharedPreferences (written by MainActivity / UpdateWorker)
        val prefs = context.getSharedPreferences("traffic_prefs", Context.MODE_PRIVATE)
        val lat = prefs.getFloat("lat", Float.NaN).toDouble()
        val lon = prefs.getFloat("lon", Float.NaN).toDouble()
        val hasLocation = !lat.isNaN() && !lon.isNaN()

        val ranked = rankEntries(today, if (hasLocation) lat else null, if (hasLocation) lon else null)

        provideContent {
            WidgetContent(
                today = today,
                ranked = ranked,
                hasLocation = hasLocation,
            )
        }
    }

    private fun rankEntries(day: DayData?, lat: Double?, lon: Double?): List<RankedEntry> {
        if (day == null) return emptyList()
        return day.entries.map { entry ->
            val dist = if (lat != null && lon != null) {
                resolver.resolve(entry.area)?.let { (aLat, aLon) ->
                    haversineKm(lat, lon, aLat, aLon)
                }
            } else null
            RankedEntry(entry, dist)
        }.sortedWith(compareBy(nullsLast()) { it.distanceKm })
    }
}

@Composable
private fun WidgetContent(
    today: DayData?,
    ranked: List<RankedEntry>,
    hasLocation: Boolean,
) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(Color(0xFF1565C0))
            .padding(8.dp),
    ) {
        // Header
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = if (today != null) "${today.date}（${today.weekday}）の取締り" else "今日の取締り情報",
                style = TextStyle(color = ColorProvider(Color.White), fontSize = 13.sp, fontWeight = FontWeight.Bold),
                modifier = GlanceModifier.defaultWeight(),
            )
        }

        if (!hasLocation) {
            Text(
                text = "※位置情報なし — 距離計算スキップ",
                style = TextStyle(color = ColorProvider(Color(0xFFFFCC80)), fontSize = 10.sp),
                modifier = GlanceModifier.padding(bottom = 2.dp),
            )
        }

        if (ranked.isEmpty()) {
            Spacer(GlanceModifier.height(8.dp))
            Text(
                text = "本日のデータなし",
                style = TextStyle(color = ColorProvider(Color(0xFFB3E5FC)), fontSize = 12.sp),
            )
        } else {
            ranked.take(7).forEach { r ->
                EntryRow(r)
            }
        }

        Spacer(GlanceModifier.defaultWeight())

        // Disclaimer
        Text(
            text = "※取締りは予告なく変更・中止の場合あり。参考情報のみ。",
            style = TextStyle(color = ColorProvider(Color(0xFFB3E5FC)), fontSize = 9.sp),
        )
    }
}

@Composable
private fun EntryRow(r: RankedEntry) {
    val e: EnforcementEntry = r.entry
    val distText = r.distanceKm?.let { "約${it.toInt()}km" } ?: "－"
    val typeColor = when (e.type) {
        "飲酒" -> Color(0xFFFF8A65)
        "速度" -> Color(0xFFFFEB3B)
        else -> Color(0xFFA5D6A7)
    }
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = e.type,
            style = TextStyle(color = ColorProvider(typeColor), fontSize = 10.sp, fontWeight = FontWeight.Bold),
            modifier = GlanceModifier.padding(end = 4.dp),
        )
        Text(
            text = e.road,
            style = TextStyle(color = ColorProvider(Color.White), fontSize = 11.sp),
            modifier = GlanceModifier.defaultWeight(),
            maxLines = 1,
        )
        Text(
            text = "${e.area} $distText",
            style = TextStyle(color = ColorProvider(Color(0xFFB3E5FC)), fontSize = 10.sp),
        )
    }
}
