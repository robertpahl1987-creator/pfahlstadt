package de.robertbaasner.pfahlstadt;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Startet das Spiel (WebGL) im Vollbild.
 * Beim Öffnen wird automatisch nach neuen Spieldateien gesucht. Gibt es eine neuere Version,
 * wird sie heruntergeladen und sofort benutzt – ohne Installation, ohne Bestätigung.
 */
public class MainActivity extends Activity {
    /** Version der App-Hülle. Spieldateien, die eine neuere Hülle brauchen, werden nicht geladen. */
    private static final int SHELL = 2;
    private static final String[] FILES = {"index.html", "game.js", "version.js", "web-version.json"};

    private WebView web;
    private TextView splash;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        splash = new TextView(this);
        splash.setText("Pfahlstadt\n\nsuche Updates …");
        splash.setTextColor(Color.rgb(200, 225, 230));
        splash.setTextSize(20);
        splash.setGravity(Gravity.CENTER);
        splash.setBackgroundColor(Color.rgb(11, 26, 32));
        setContentView(splash);
        hideSystemBars(splash);

        new Thread(() -> {
            String note = null;
            try { note = checkForUpdate(); } catch (Throwable t) { note = null; }
            final String n = note;
            runOnUiThread(() -> startGame(n));
        }).start();
    }

    private File webDir() { return new File(getFilesDir(), "web"); }

    private static int buildOf(String json) {
        try { return new JSONObject(json).optInt("build", 0); } catch (Exception e) { return 0; }
    }

    private static int minShellOf(String json) {
        try { return new JSONObject(json).optInt("min_shell", 1); } catch (Exception e) { return 1; }
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return out.toString("UTF-8");
    }

    private int bundledBuild() {
        try { return buildOf(readAll(getAssets().open("web-version.json"))); } catch (Exception e) { return 0; }
    }

    private int localBuild() {
        File f = new File(webDir(), "web-version.json");
        if (!f.exists()) return -1;
        try { return buildOf(readAll(new FileInputStream(f))); } catch (Exception e) { return -1; }
    }

    private static byte[] download(String url, int timeout) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(timeout);
        c.setReadTimeout(timeout * 3);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("Cache-Control", "no-cache");
        int code = c.getResponseCode();
        if (code != 200) throw new Exception("HTTP " + code);
        InputStream in = c.getInputStream();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[32768];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        c.disconnect();
        return out.toByteArray();
    }

    /** Lädt neue Spieldateien, falls vorhanden. Gibt einen Hinweistext zurück oder null. */
    private String checkForUpdate() throws Exception {
        String base = getString(R.string.update_base);
        String remote = new String(download(base + "web-version.json?t=" + System.currentTimeMillis(), 3000), "UTF-8");
        int remoteBuild = buildOf(remote);
        int have = Math.max(bundledBuild(), localBuild());
        if (remoteBuild <= have) return null;
        if (minShellOf(remote) > SHELL) return "shell";

        File tmp = new File(getFilesDir(), "web-tmp");
        deleteDir(tmp);
        if (!tmp.mkdirs()) throw new Exception("mkdir");
        for (String f : FILES) {
            byte[] data = download(base + f + "?t=" + System.currentTimeMillis(), 5000);
            if (data.length == 0) throw new Exception("leer: " + f);
            FileOutputStream out = new FileOutputStream(new File(tmp, f));
            out.write(data);
            out.close();
        }
        File dir = webDir();
        deleteDir(dir);
        if (!tmp.renameTo(dir)) throw new Exception("rename");
        return "updated";
    }

    private static void deleteDir(File d) {
        if (!d.exists()) return;
        File[] list = d.listFiles();
        if (list != null) for (File f : list) { if (f.isDirectory()) deleteDir(f); else f.delete(); }
        d.delete();
    }

    private void startGame(String note) {
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(11, 26, 32));
        setContentView(web);
        hideSystemBars(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.addJavascriptInterface(new Bridge(), "PfNative");
        NotifyReceiver.ensureChannel(this);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 7);
        }
        cancelAllNotifications();

        File dir = webDir();
        dir.mkdirs();
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .addPathHandler("/files/", new WebViewAssetLoader.InternalStoragePathHandler(this, dir))
                .build();
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
        });

        // Heruntergeladene Version nur nehmen, wenn sie neuer ist als die im APK
        boolean useLocal = new File(dir, "index.html").exists() && localBuild() > bundledBuild();
        String url = "https://appassets.androidplatform.net/" + (useLocal ? "files/" : "assets/") + "index.html";
        if (note != null) url += "?update=" + note;
        web.loadUrl(url);
    }

    @SuppressWarnings("deprecation")
    private void hideSystemBars(View v) {
        v.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars(web != null ? web : splash);
    }

    @Override
    protected void onPause() {
        if (web != null) {
            web.evaluateJavascript("window.__save && window.__save(); window.__notify && window.__notify()", null);
            web.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        cancelAllNotifications();
    }

    // ---------- Benachrichtigungen (vom Spiel geplant, wenn die App in den Hintergrund geht) ----------
    private PendingIntent notifyIntent(int id, String title, String text) {
        Intent i = new Intent(this, NotifyReceiver.class);
        i.putExtra("id", id); i.putExtra("title", title); i.putExtra("text", text);
        return PendingIntent.getBroadcast(this, id, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private void cancelAllNotifications() {
        SharedPreferences sp = getSharedPreferences("notify", MODE_PRIVATE);
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        for (int id = 1; id <= sp.getInt("max", 0); id++) am.cancel(notifyIntent(id, "", ""));
        sp.edit().putInt("max", 0).apply();
    }

    private class Bridge {
        @JavascriptInterface
        public void schedule(int id, double seconds, String title, String text) {
            if (id < 1 || id > 40 || seconds < 5) return;
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            am.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + (long) (seconds * 1000), notifyIntent(id, title, text));
            SharedPreferences sp = getSharedPreferences("notify", MODE_PRIVATE);
            if (id > sp.getInt("max", 0)) sp.edit().putInt("max", id).apply();
        }

        @JavascriptInterface
        public void cancelAll() { cancelAllNotifications(); }

        @JavascriptInterface
        public int shell() { return SHELL; }
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
