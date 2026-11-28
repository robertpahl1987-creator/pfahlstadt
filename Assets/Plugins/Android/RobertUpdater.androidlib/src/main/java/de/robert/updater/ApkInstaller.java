package de.robert.updater;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import java.io.File;

/** Startet die Installation einer heruntergeladenen APK (für die automatische Aktualisierung).
 *  Die Methoden holen die Activity selbst und geben statt Ausnahmen einen Text zurück:
 *  "" = gestartet, "PERM" = Erlaubnis fehlt, sonst die Fehlermeldung. */
public class ApkInstaller {
    static Activity act() throws Exception {
        return (Activity) Class.forName("com.unity3d.player.UnityPlayer").getField("currentActivity").get(null);
    }

    static String err(Throwable t) { return t.getClass().getSimpleName() + ": " + t.getMessage(); }

    public static String start(String path) {
        try {
            Activity a = act();
            if (a == null) return "Keine Activity";
            if (Build.VERSION.SDK_INT >= 26 && !a.getPackageManager().canRequestPackageInstalls()) return "PERM";
            File f = new File(path);
            if (!f.exists()) return "Update-Datei fehlt";
            ApkProvider.file = f;
            Uri uri = Uri.parse("content://" + a.getPackageName() + ".apkprovider/update.apk");
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            a.startActivity(i);
            return "";
        } catch (Throwable t) { return err(t); }
    }

    public static String openSettings() {
        try {
            Activity a = act();
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            a.startActivity(i);
            return "";
        } catch (Throwable t) { return err(t); }
    }
}
