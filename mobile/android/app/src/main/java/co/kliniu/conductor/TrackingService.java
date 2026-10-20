package co.kliniu.conductor;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

// Servicio en primer plano (como la ubicación en tiempo real de WhatsApp): sobrevive a la pantalla bloqueada y a
// otras apps, y manda las posiciones directo al servidor sin pasar por el WebView (que Android congela).
public class TrackingService extends Service {
    static final String PREFS = "kliniu_tracking";
    private static final String CHANNEL = "kliniu_tracking";
    private static final int NOTIFICATION_ID = 28351;
    private static final long INTERVAL_MS = 15_000;
    private static final int MAX_PENDING = 2000; // ponytail: cola en memoria; si matan el proceso se pierde lo no enviado

    // Estado que lee el plugin para mostrarlo en la página.
    static volatile boolean running = false;
    static volatile long lastSentAt = 0, lastFixAt = 0;
    static volatile double lastLat, lastLng, lastAccuracy;
    static volatile String lastError = null;
    static volatile boolean routeStopped = false;
    static volatile int pendingCount = 0;

    private FusedLocationProviderClient client;
    private LocationCallback callback;
    private final ExecutorService net = Executors.newSingleThreadExecutor();
    private final List<JSONObject> pending = new ArrayList<>();
    private String token, baseUrl;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (intent != null && intent.getStringExtra("token") != null) {
            token = intent.getStringExtra("token");
            baseUrl = intent.getStringExtra("baseUrl");
            prefs.edit().putString("token", token).putString("baseUrl", baseUrl).apply();
        } else { // reinicio por el sistema tras matar el proceso: se retoma con lo guardado
            token = prefs.getString("token", null);
            baseUrl = prefs.getString("baseUrl", null);
        }
        if (token == null || baseUrl == null) { stopSelf(); return START_NOT_STICKY; }

        startInForeground();
        routeStopped = false;
        lastError = null;
        if (callback == null) startUpdates();
        running = true;
        return START_STICKY;
    }

    private void startInForeground() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Ubicación de la ruta", NotificationManager.IMPORTANCE_DEFAULT));
        }
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent tap = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new NotificationCompat.Builder(this, CHANNEL)
                .setContentTitle("KLINIU Conductor")
                .setContentText("Compartiendo la ubicación de la ruta")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setContentIntent(tap)
                .build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        else startForeground(NOTIFICATION_ID, n);
    }

    private void startUpdates() {
        client = LocationServices.getFusedLocationProviderClient(this);
        LocationRequest req = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS).setMinUpdateIntervalMillis(INTERVAL_MS / 2).build();
        callback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                Location l = result.getLastLocation();
                if (l == null) return;
                lastFixAt = System.currentTimeMillis();
                lastLat = l.getLatitude(); lastLng = l.getLongitude(); lastAccuracy = l.getAccuracy();
                try {
                    JSONObject p = new JSONObject();
                    p.put("lat", l.getLatitude()).put("lng", l.getLongitude());
                    p.put("accuracy", l.hasAccuracy() ? (double) l.getAccuracy() : JSONObject.NULL);
                    p.put("speed", l.hasSpeed() ? l.getSpeed() * 3.6 : JSONObject.NULL); // el servidor espera km/h
                    p.put("recordedAt", l.getTime());
                    synchronized (pending) { pending.add(p); if (pending.size() > MAX_PENDING) pending.remove(0); pendingCount = pending.size(); }
                } catch (Exception ignored) { return; }
                net.execute(TrackingService.this::flush);
            }
        };
        try {
            client.requestLocationUpdates(req, callback, getMainLooper());
        } catch (SecurityException e) {
            lastError = "NOT_AUTHORIZED";
            stopSelf();
        }
    }

    // Lote al servidor; el índice único del servidor evita duplicados si un reintento se repite.
    private void flush() {
        List<JSONObject> batch;
        synchronized (pending) { batch = new ArrayList<>(pending.subList(0, Math.min(pending.size(), 100))); }
        if (batch.isEmpty()) return;
        HttpURLConnection c = null;
        try {
            JSONObject body = new JSONObject().put("sentAt", System.currentTimeMillis()).put("positions", new JSONArray(batch));
            c = (HttpURLConnection) new URL(baseUrl + "/api/conductor/" + token + "/posicion").openConnection();
            c.setRequestMethod("POST");
            c.setConnectTimeout(10_000); c.setReadTimeout(15_000);
            c.setRequestProperty("Content-Type", "application/json");
            c.setDoOutput(true);
            try (OutputStream os = c.getOutputStream()) { os.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
            int code = c.getResponseCode();
            if (code == 200 || code == 400) { // 400: lote inválido o demasiado viejo, no sirve reintentar
                synchronized (pending) { pending.subList(0, batch.size()).clear(); pendingCount = pending.size(); }
                if (code == 200) { lastSentAt = System.currentTimeMillis(); lastError = null; }
            } else if (code == 409) { // la ruta ya no está en curso
                routeStopped = true;
                stopSelf();
            } else lastError = "HTTP " + code;
        } catch (Exception e) {
            lastError = "Sin conexión"; // queda en la cola; se reintenta con la siguiente lectura
        } finally {
            if (c != null) c.disconnect();
        }
    }

    @Override
    public void onDestroy() {
        if (client != null && callback != null) client.removeLocationUpdates(callback);
        callback = null;
        running = false;
        net.shutdown();
        super.onDestroy();
    }
}
