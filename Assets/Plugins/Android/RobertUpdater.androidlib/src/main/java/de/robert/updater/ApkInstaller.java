package de.robert.updater;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import java.io.File;

/** Startet die Installation einer heruntergeladenen APK (für die automatische Aktualisierung). */
public class ApkInstaller {
    public static boolean canInstall(Activity a) {
        if (Build.VERSION.SDK_INT >= 26) return a.getPackageManager().canRequestPackageInstalls();
        return true;
    }

    public static void openInstallSettings(Activity a) {
        Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.getPackageName()));
        a.startActivity(i);
    }

    public static void install(Activity a, String path) {
        ApkProvider.file = new File(path);
        Uri uri = Uri.parse("content://" + a.getPackageName() + ".apkprovider/update.apk");
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(uri, "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        a.startActivity(i);
    }
}
