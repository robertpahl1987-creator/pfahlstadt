package de.robert.updater;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** Gibt die heruntergeladene Update-APK an den Paket-Installer weiter. */
public class ApkProvider extends ContentProvider {
    static File file;

    @Override public boolean onCreate() { return true; }

    @Override public String getType(Uri uri) { return "application/vnd.android.package-archive"; }

    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (file == null || !file.exists()) {
            File[] dirs = { getContext().getExternalCacheDir(), getContext().getCacheDir() };
            for (File d : dirs) if (d != null && new File(d, "update.apk").exists()) { file = new File(d, "update.apk"); break; }
        }
        if (file == null || !file.exists()) throw new FileNotFoundException("Keine Update-Datei");
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] args, String sort) {
        MatrixCursor c = new MatrixCursor(new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE });
        c.addRow(new Object[] { "update.apk", file != null ? file.length() : 0L });
        return c;
    }

    @Override public Uri insert(Uri uri, ContentValues values) { return null; }
    @Override public int delete(Uri uri, String selection, String[] args) { return 0; }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] args) { return 0; }
}
