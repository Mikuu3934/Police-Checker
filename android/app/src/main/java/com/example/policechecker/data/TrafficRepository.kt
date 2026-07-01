package com.example.policechecker.data

import android.content.Context
import com.example.policechecker.model.TrafficData
import com.google.gson.Gson
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class TrafficRepository(private val context: Context) {

    // Replace with your GitHub Pages URL after enabling Pages on the repo.
    // Example: https://<user>.github.io/<repo>/traffic.json
    private val dataUrl = "https://mikuu3934.github.io/police-checker/traffic.json"

    private val cacheFile: File get() = File(context.cacheDir, "traffic.json")
    private val client = OkHttpClient()
    private val gson = Gson()

    fun fetchAndCache(): TrafficData? {
        return try {
            val request = Request.Builder().url(dataUrl).build()
            val body = client.newCall(request).execute().use { resp ->
                if (!resp.isSuccessful) return null
                resp.body?.string() ?: return null
            }
            cacheFile.writeText(body)
            gson.fromJson(body, TrafficData::class.java)
        } catch (e: Exception) {
            android.util.Log.e("TrafficRepository", "Fetch failed", e)
            readCache()
        }
    }

    fun readCache(): TrafficData? {
        return try {
            if (!cacheFile.exists()) return null
            gson.fromJson(cacheFile.readText(), TrafficData::class.java)
        } catch (e: Exception) {
            android.util.Log.e("TrafficRepository", "Cache read failed", e)
            null
        }
    }

    fun todayEntries(data: TrafficData) =
        data.days.find { it.date == LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE) }
}
