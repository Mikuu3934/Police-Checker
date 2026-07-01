package com.example.policechecker

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.glance.appwidget.updateAll
import androidx.lifecycle.lifecycleScope
import com.example.policechecker.data.TrafficRepository
import com.example.policechecker.widget.TrafficWidget
import com.example.policechecker.work.UpdateWorker
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        if (grants.values.any { it }) {
            fetchLocationAndUpdate()
        } else {
            // Proceed without location — widget falls back to unsorted list
            refreshWidget()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        UpdateWorker.schedule(this)

        val hasLocation = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (hasLocation) {
            fetchLocationAndUpdate()
        } else {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                )
            )
        }

        // Also fetch fresh data in the background
        lifecycleScope.launch(Dispatchers.IO) {
            TrafficRepository(applicationContext).fetchAndCache()
            withContext(Dispatchers.Main) { refreshWidget() }
        }
    }

    private fun fetchLocationAndUpdate() {
        val client = LocationServices.getFusedLocationProviderClient(this)
        try {
            client.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, null)
                .addOnSuccessListener { loc ->
                    if (loc != null) {
                        val prefs = getSharedPreferences("traffic_prefs", MODE_PRIVATE)
                        prefs.edit()
                            .putFloat("lat", loc.latitude.toFloat())
                            .putFloat("lon", loc.longitude.toFloat())
                            .apply()
                    }
                    refreshWidget()
                }
                .addOnFailureListener { refreshWidget() }
        } catch (e: SecurityException) {
            refreshWidget()
        }
    }

    private fun refreshWidget() {
        lifecycleScope.launch { TrafficWidget().updateAll(this@MainActivity) }
    }
}
