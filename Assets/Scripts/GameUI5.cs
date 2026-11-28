using UnityEngine;

namespace Pfahlstadt
{
    /// Menü mit Reitern: Spiel · Grafik · Konto · Hilfe
    public partial class GameUI
    {
        float SettingsContent(Colony c, float y)
        {
            switch (tab)
            {
                case "gfx": return GfxTab(y);
                case "acc": return AccountContent(c, y);
                case "help": return HelpTab(y);
            }
            return GameTab(c, y);
        }

        float GameTab(Colony c, float y)
        {
            var o = Online.I;
            y = Sub(y, "Spielstand");
            y = Txt(y, $"Tag {c.S.days} · {c.S.survivors} Siedler · Gezeitenturm Stufe {c.TowerLevel}", stSmall);
            if (Btn(new Rect(0, y, W, 66), "<b>Jetzt speichern</b>")) { c.Save(); c.Msg("Spielstand gespeichert."); }
            y += 74f;
            y = Txt(y, "Das Spiel speichert außerdem automatisch.", stTiny);

            y = Sub(y, "Online");
            bool on = o != null && o.Active;
            y = Txt(y, on ? $"Angemeldet als <b>{o.PlayerName}</b>" : "Du spielst gerade offline.", stSmall);
            if (Btn(new Rect(0, y, W, 62), on ? "Konto & Umzugscode" : "Online gehen")) { tab = "acc"; scrollY = 0; }
            y += 70f;
            if (on && o.IsAdmin) { if (Btn(new Rect(0, y, W, 62), "Spielleiter-Bereich")) OpenPanel("admin"); y += 70f; }

            y = Sub(y, "Neu anfangen");
            if (!confirmNew) { if (Btn(new Rect(0, y, W, 62), "Neues Spiel")) confirmNew = true; }
            else
            {
                y = Txt(y, "<color=#FFB0A0>Deine Stadt wird gelöscht und du fängst bei Tag 1 an. Das kann man nicht rückgängig machen.</color>", stSmall);
                if (Btn(new Rect(0, y, W / 2 - 6, 66), "<color=#FFB0A0><b>Ja, neu anfangen</b></color>")) { c.NewGame(); confirmNew = false; panel = null; }
                if (Btn(new Rect(W / 2 + 6, y, W / 2 - 6, 66), "Abbrechen")) confirmNew = false;
            }
            return y + 74f;
        }

        float GfxTab(float y)
        {
            var g = GraphicsQuality.I;
            if (g == null) return Txt(y, "Grafik-Einstellungen sind gerade nicht verfügbar.", stSmall);
            y = Sub(y, "Grafikstufe");
            string[] names = { "Niedrig", "Mittel", "Hoch", "Ultra" };
            string[] info = { "schont den Akku, für ältere Handys", "ausgewogen", "scharf, mit weichen Schatten", "volle Auflösung bis 8K, beste Schatten" };
            // Automatisch
            bool sel = g.Auto;
            if (Btn(new Rect(0, y, W, 74), (sel ? "<color=#FFE08A><b>● Automatisch</b></color>" : "○ Automatisch") + $"\n<size=15>passt sich deinem Handy an{(sel ? " – gerade: " + g.Tier : "")}</size>"))
                g.Set(true, g.Tier);
            y += 80f;
            for (int i = 0; i < 4; i++)
            {
                sel = !g.Auto && (int)g.Tier == i;
                if (Btn(new Rect(0, y, W, 74), (sel ? $"<color=#FFE08A><b>● {names[i]}</b></color>" : $"○ {names[i]}") + $"\n<size=15>{info[i]}</size>"))
                    g.Set(false, (QTier)i);
                y += 80f;
            }
            y = Sub(y, "Dein Gerät");
            y = Txt(y, $"Auflösung: <b>{g.RenderRes.x} × {g.RenderRes.y}</b>", stSmall);
            y = Txt(y, $"Bildrate: <b>{g.Fps:0} Bilder/Sek.</b> (Ziel {g.TargetFps})", stSmall);
            y = Txt(y, $"{SystemInfo.systemMemorySize} MB Arbeitsspeicher · {SystemInfo.graphicsDeviceName}", stTiny);
            return y;
        }

        float HelpTab(float y)
        {
            y = Sub(y, "Steuerung");
            y = Txt(y, "• Ein Finger ziehen: Karte verschieben\n• Zwei Finger auseinander/zusammen: zoomen\n• Zwei Finger im Kreis: Ansicht drehen\n• Antippen: Bauplatz oder Gebäude wählen", stSmall);
            y = Sub(y, "Tipps");
            y = Txt(y, "• Wattwandern geht nur bei Ebbe.\n• Muscheln wachsen bei Ebbe, Taucher arbeiten bei Flut, Regenfänger lieben Stürme.\n• Halte den Abstand zwischen Wasser und Deck positiv – sonst wird es nass.\n• Zu wenig Essen oder Wasser macht Siedler krank. Achte auf die Warnungen oben.", stSmall);
            return y;
        }
    }
}
