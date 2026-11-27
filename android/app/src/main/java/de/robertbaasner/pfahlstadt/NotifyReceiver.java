package de.robertbaasner.pfahlstadt;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Zeigt eine geplante Spiel-Benachrichtigung an (Bau fertig, Truppen zurück …). */
public class NotifyReceiver extends BroadcastReceiver {
    static final String CHANNEL = "pfahlstadt";

    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm.getNotificationChannel(CHANNEL) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, "Spiel-Meldungen", NotificationManager.IMPORTANCE_DEFAULT);
                ch.setDescription("Bauten fertig, Truppen zurück, Händler da");
                nm.createNotificationChannel(ch);
            }
        }
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        ensureChannel(ctx);
        int id = intent.getIntExtra("id", 1);
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        b.setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(intent.getStringExtra("title"))
                .setContentText(intent.getStringExtra("text"))
                .setStyle(new Notification.BigTextStyle().bigText(intent.getStringExtra("text")))
                .setContentIntent(pi)
                .setAutoCancel(true);
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        try { nm.notify(id, b.build()); } catch (SecurityException e) { /* keine Erlaubnis */ }
    }
}
