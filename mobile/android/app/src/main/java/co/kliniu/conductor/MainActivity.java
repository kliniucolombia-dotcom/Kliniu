package co.kliniu.conductor;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ConductorTrackingPlugin.class);
        super.onCreate(savedInstanceState);
        openRouteLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openRouteLink(intent);
    }

    // El enlace de WhatsApp (https://<dominio>/conductor/<token>) se abre dentro de la app; solo del mismo servidor.
    private void openRouteLink(Intent intent) {
        Uri link = intent != null ? intent.getData() : null;
        if (link == null || link.getPath() == null || !link.getPath().startsWith("/conductor/")) return;
        Uri server = Uri.parse(getBridge().getServerUrl());
        if (!"https".equals(link.getScheme()) || !link.getHost().equals(server.getHost())) return;
        getBridge().getWebView().loadUrl(link.toString());
    }
}
