package co.kliniu.conductor;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

// Puente entre la página del conductor y TrackingService.
@CapacitorPlugin(name = "ConductorTracking", permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" })
})
public class ConductorTrackingPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        if (call.getString("token") == null) { call.reject("Falta el token"); return; }
        if (getPermissionState("location") != PermissionState.GRANTED || getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAliases(new String[] { "location", "notifications" }, call, "permsCallback");
            return;
        }
        launch(call);
    }

    @PermissionCallback
    private void permsCallback(PluginCall call) {
        // Sin ubicación no hay servicio. Sin notificaciones sí corre, pero la notificación fija no se ve: se avisa.
        if (getPermissionState("location") != PermissionState.GRANTED) { call.reject("Permiso de ubicación denegado", "NOT_AUTHORIZED"); return; }
        launch(call);
    }

    private void launch(PluginCall call) {
        Uri server = Uri.parse(getBridge().getServerUrl());
        Intent i = new Intent(getContext(), TrackingService.class)
                .putExtra("token", call.getString("token"))
                .putExtra("baseUrl", server.getScheme() + "://" + server.getAuthority());
        ContextCompat.startForegroundService(getContext(), i);
        JSObject r = new JSObject();
        r.put("notifications", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(r);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().getSharedPreferences(TrackingService.PREFS, 0).edit().clear().apply();
        getContext().stopService(new Intent(getContext(), TrackingService.class));
        TrackingService.running = false;
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("running", TrackingService.running);
        r.put("lastSentAt", TrackingService.lastSentAt);
        r.put("lastFixAt", TrackingService.lastFixAt);
        r.put("lat", TrackingService.lastLat);
        r.put("lng", TrackingService.lastLng);
        r.put("accuracy", TrackingService.lastAccuracy);
        r.put("pending", TrackingService.pendingCount);
        r.put("error", TrackingService.lastError);
        r.put("routeStopped", TrackingService.routeStopped);
        r.put("batteryUnrestricted", ((PowerManager) getContext().getSystemService(android.content.Context.POWER_SERVICE)).isIgnoringBatteryOptimizations(getContext().getPackageName()));
        call.resolve(r);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    // Diálogo del sistema "permitir que la app siempre se ejecute en segundo plano" (ColorOS/MIUI matan servicios sin esto).
    @PluginMethod
    public void allowBackground(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }
}
