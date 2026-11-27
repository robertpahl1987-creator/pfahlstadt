using System.Collections.Generic;
using UnityEngine;

namespace Pfahlstadt
{
    /// Seekarte (offline): Inseln, Piratenschiffe, Märsche – und das Truppen-Formular
    public partial class GameUI
    {
        Vector2 MapPos(Rect mr, float x, float y)
        {
            float k = Mathf.Min(mr.width, mr.height) / 2f / 4.4f;
            return new Vector2(mr.center.x + x * k, mr.center.y - y * k);
        }

        void Dot(Vector2 p, float size, Color col)
        {
            var old = GUI.color; GUI.color = col;
            GUI.DrawTexture(new Rect(p.x - size / 2, p.y - size / 2, size, size), txDot);
            GUI.color = old;
        }

        bool HitButton(Vector2 p, float size)
        {
            return GUI.Button(new Rect(p.x - size / 2, p.y - size / 2, size, size), GUIContent.none, GUIStyle.none) && !dragMoved;
        }

        void SeaMap(Colony c, Rect mr)
        {
            GUI.DrawTexture(mr, txSea);
            var s = c.S2;
            // Ringe als Orientierung
            for (int ring = 1; ring <= 3; ring++)
            {
                var old = GUI.color; GUI.color = new Color(1, 1, 1, 0.05f);
                float k = Mathf.Min(mr.width, mr.height) / 2f / 4.4f * ring * 1.15f * 2;
                GUI.DrawTexture(new Rect(mr.center.x - k / 2, mr.center.y - k / 2, k, k), txDot);
                GUI.color = old;
            }
            // Märsche
            foreach (var m in s.marches)
            {
                var t = s.terr[Mathf.Clamp(m.target, 0, s.terr.Count - 1)];
                float p = 1 - m.left / Mathf.Max(0.01f, m.total); if (m.phase == "back") p = 1 - p;
                Dot(MapPos(mr, t.x * p, t.y * p), 16, m.kind == "scout" ? new Color(0.8f, 0.9f, 1f) : new Color(1f, 0.85f, 0.3f));
            }
            foreach (var m in s.botMarches)
            {
                float p = 1 - m.left / Mathf.Max(0.01f, m.total); if (m.phase == "back") p = 1 - p;
                Dot(MapPos(mr, m.bot.dx * p, m.bot.dy * p), 16, new Color(1f, 0.6f, 0.3f));
            }
            // Inseln
            foreach (var t in s.terr)
            {
                var pos = MapPos(mr, t.x, t.y); float size = 30 + t.ring * 7;
                bool sel = mapTerr == t.id;
                if (sel) Dot(pos, size + 22, new Color(1f, 0.9f, 0.4f, 0.6f));
                Dot(pos, size, t.owner == 1 ? new Color(0.35f, 0.85f, 0.5f) : new Color(0.85f, 0.75f, 0.5f));
                Dot(pos, size * 0.45f, t.owner == 1 ? new Color(0.15f, 0.5f, 0.25f) : new Color(0.75f, 0.25f, 0.2f));
                if (sel || mr.width > 600) GUI.Label(new Rect(pos.x - 70, pos.y + size / 2 - 2, 140, 22), t.name, stTinyC);
                if (HitButton(pos, size + 18)) { mapTerr = t.id; mapBot = -1; scrollY = 0; System.Array.Clear(form, 0, 5); }
            }
            // Piratenschiffe
            foreach (var b in s.bots)
            {
                var pos = MapPos(mr, b.dx, b.dy); bool sel = mapBot == b.id;
                if (sel) Dot(pos, 52, new Color(1f, 0.9f, 0.4f, 0.6f));
                Dot(pos, 34, new Color(0.12f, 0.12f, 0.14f));
                GUI.Label(new Rect(pos.x - 40, pos.y - 12, 80, 24), $"<b>{b.level}</b>", stTinyC);
                if (sel || mr.width > 600) GUI.Label(new Rect(pos.x - 70, pos.y + 16, 140, 22), "Piraten", stTinyC);
                if (HitButton(pos, 54)) { mapBot = b.id; mapTerr = -1; scrollY = 0; System.Array.Clear(form, 0, 5); }
            }
            // eigene Stadt
            var home = MapPos(mr, 0, 0);
            Dot(home, 44, new Color(1f, 0.82f, 0.35f));
            GUI.Label(new Rect(home.x - 70, home.y + 20, 140, 22), "<b>Deine Stadt</b>", stTinyC);
            if (HitButton(home, 44)) { mapTerr = -1; mapBot = -1; }
            GUI.Label(new Rect(mr.x + 8, mr.y + 6, mr.width - 16, 26), "Gelb: Insel · Grün: deine Insel · Schwarz: Piratenschiff", stTiny);
        }

        float MapDetails(Colony c, float y)
        {
            var s = c.S2;
            if (mapBot >= 0)
            {
                var b = s.bots.Find(x => x.id == mapBot);
                if (b == null) { mapBot = -1; return y; }
                y = Txt(y, $"<b>Piratenschiff „{b.name}“</b> · Stufe {b.level}", st);
                y = Txt(y, $"Mannschaft: {Units.Text(b.u)}   (Abwehrkraft etwa {Mathf.RoundToInt(Units.Str(b.u, null, false, 0))})", stSmall);
                Colony.BotReward(b.level, out var items, out var res, out var u, out var big);
                y = Txt(y, $"Beute: {ItemStr(items)}  {Res4(res)}  {(big ? 3 : 1)} Abzeichen" + (Units.Sum(u) > 0 ? "  Überläufer: " + Units.Text(u) : ""), stTiny);
                int stam = c.Stamina(out float next);
                y = Txt(y, $"Ausdauer: <b>{stam}/{Colony.StamMax}</b>" + (stam < Colony.StamMax ? $" · nächster Punkt in {Defs.Time(next)}" : ""), stSmall);
                y = Txt(y, "Tipp: Enterer sind stark gegen Schleuderer und Wattläufer, Harpuniere gegen Enterer, Schildwachen gegen Harpuniere, Schleuderer gegen Schildwachen.", stTiny);
                string blk = c.BotBlocker(b.id, form);
                float tt = c.BotTravel(b, form, CapPick(c));
                y = TroopForm(c, y, $"Fahrt etwa {Defs.Time(tt)} · Angriff {Mathf.RoundToInt(Units.Str(form, b.u, true, c.TideNow) * c.M.Atk * c.CapAtk(CapPick(c), c.TideNow))}");
                if (Btn(new Rect(0, y, W, 70), "<b>Angreifen!</b>", blk == null)) { if (c.SendToBot(b.id, form, CapPick(c))) { System.Array.Clear(form, 0, 5); capSel = -1; mapBot = -1; } }
                if (blk != null && blk != "Keine Truppen ausgewählt") GUI.Label(new Rect(0, y + 74, W, 30), $"<color=#FF8A8A>{blk}</color>", stTiny);
                return y + 110f;
            }
            if (mapTerr >= 0)
            {
                var t = s.terr[mapTerr];
                y = Txt(y, $"<b>{t.name}</b> · {t.kind} · Ring {t.ring}", st);
                y = Txt(y, $"Bonus für den Besitzer: <b>+{t.pct} % {Defs.ResNames[t.res]}</b>   ·   Entfernung {Defs.Time(Colony.TravelTime(t))}", stSmall);
                if (t.owner == 1)
                {
                    y = Txt(y, $"<color=#8EF0A0>Deine Insel.</color> Besatzung: {Units.Text(t.gu)} (braucht nur halben Unterhalt). Piraten greifen eroberte Inseln manchmal an.", stSmall);
                    if (Units.Sum(t.gu) > 0 && Btn(new Rect(0, y, W, 64), "Besatzung heimholen")) c.Withdraw(t.id);
                    if (Units.Sum(t.gu) > 0) y += 72f;
                    y = Sub(y, "Verstärkung schicken");
                    y = TroopForm(c, y, "");
                    string blk = c.AttackBlocker(t.id, form);
                    if (Btn(new Rect(0, y, W, 70), "<b>Verstärken</b>", blk == null)) { if (c.SendTroops(t.id, form, CapPick(c))) { System.Array.Clear(form, 0, 5); capSel = -1; } }
                    return y + 80f;
                }
                y = Txt(y, $"Piraten mit Stärke <b>{Mathf.RoundToInt(t.pirates)}</b>" + (t.pirates < t.bas ? $" (geschwächt, voll {t.bas:0})" : ""), st);
                string sb = c.ScoutBlocker();
                if (Btn(new Rect(0, y, W, 60), "<size=19>Späher schicken (40 Muscheln, 20 Altmetall)</size>", sb == null)) c.SendScout(t.id);
                y += 68f;
                float tt = c.MarchTime(Colony.TravelTime(t), form, CapPick(c));
                y = TroopForm(c, y, $"Fahrt etwa {Defs.Time(tt)} · Angriff {Mathf.RoundToInt(Units.Str(form, null, true, c.TideNow) * c.M.Atk * c.CapAtk(CapPick(c), c.TideNow))} gegen {Mathf.RoundToInt(t.pirates)}");
                string ab = c.AttackBlocker(t.id, form);
                if (Btn(new Rect(0, y, W, 70), "<b>Angreifen!</b>", ab == null)) { if (c.SendTroops(t.id, form, CapPick(c))) { System.Array.Clear(form, 0, 5); capSel = -1; mapTerr = -1; } }
                if (ab != null && ab != "Keine Truppen ausgewählt") GUI.Label(new Rect(0, y + 74, W, 30), $"<color=#FF8A8A>{ab}</color>", stTiny);
                return y + 110f;
            }
            y = Txt(y, "Tippe auf eine Insel oder ein Piratenschiff. Eroberte Inseln bringen dauerhaft mehr Rohstoffe, Piratenschiffe Beschleuniger, Abzeichen und Schmiedeeisen.", stSmall);
            y = Txt(y, $"Gezeiten jetzt: <b>{Units.TideName[c.TideNow + 1]}</b>. Bei Ebbe sind Wattläufer stark, bei Flut Enterer und Harpuniere.", stSmall);
            if (s.marches.Count + s.botMarches.Count == 0) return Txt(y, "Keine Trupps unterwegs.", stSmall);
            y = Sub(y, "Unterwegs");
            foreach (var m in s.marches)
            {
                var t = s.terr[Mathf.Clamp(m.target, 0, s.terr.Count - 1)];
                string what = m.kind == "scout" ? "Späher" : m.phase == "back" ? "Heimweg" : m.kind == "reinforce" ? "Verstärkung" : "Angriff";
                y = Txt(y, $"{what} {t.name}: {Units.Text(m.u)} · {Defs.Time(m.left)}", stSmall);
            }
            for (int k = 0; k < s.botMarches.Count; k++)
            {
                var m = s.botMarches[k];
                Card(y, 76);
                GUI.Label(new Rect(12, y + 6, W - 330, 64), $"{(m.phase == "back" ? "Heimweg von" : "Angriff auf")} „{m.bot.name}“\n<size=16>{Units.Text(m.u)} · {Defs.Time(m.left)}</size>", stSmall);
                SpeedButtons(c, new Rect(W - 320, y + 8, 308, 60), "bot", k);
                y += 82f;
            }
            return y;
        }

        int CapPick(Colony c) => capSel >= 0 && c.CapFree(capSel) ? capSel : -1;

        float TroopForm(Colony c, float y, string info)
        {
            var s = c.S2;
            for (int u = 0; u < 5; u++)
            {
                if (s.troops[u] <= 0 && form[u] <= 0) continue;
                GUI.Label(new Rect(0, y + 12, 220, 36), $"{Units.All[u].Name} <size=16>({s.troops[u]})</size>", stSmall);
                if (Btn(new Rect(220, y, 76, 56), "−10")) form[u] = Mathf.Max(0, form[u] - 10);
                if (Btn(new Rect(300, y, 64, 56), "−1")) form[u] = Mathf.Max(0, form[u] - 1);
                GUI.Label(new Rect(366, y, 70, 56), $"<b>{form[u]}</b>", stMid);
                if (Btn(new Rect(438, y, 64, 56), "+1")) form[u] = Mathf.Min(s.troops[u], form[u] + 1);
                if (Btn(new Rect(506, y, 76, 56), "+10")) form[u] = Mathf.Min(s.troops[u], form[u] + 10);
                if (Btn(new Rect(586, y, W - 586, 56), "<size=17>Alle</size>")) form[u] = s.troops[u];
                y += 62f;
            }
            if (Units.Sum(s.troops) <= 0) y = Txt(y, "<color=#FF8A8A>Keine Krieger zu Hause.</color>", stSmall);
            // Kapitän
            var free = new List<int>();
            for (int k = 0; k < 5; k++) if (c.CapFree(k)) free.Add(k);
            if (free.Count > 0)
            {
                GUI.Label(new Rect(0, y + 10, 140, 36), "Kapitän:", stSmall);
                float bw = (W - 140) / (free.Count + 1);
                if (Btn(new Rect(140, y, bw - 6, 54), capSel < 0 ? "<color=#FFE08A><b>keiner</b></color>" : "<size=17>keiner</size>")) capSel = -1;
                for (int i = 0; i < free.Count; i++)
                {
                    int k = free[i]; string nm = Prog.Captains[k].Name.Split(' ')[0];
                    if (Btn(new Rect(140 + (i + 1) * bw, y, bw - 6, 54), capSel == k ? $"<color=#FFE08A><b>{nm}</b></color>" : $"<size=17>{nm}</size>")) capSel = k;
                }
                y += 60f;
                if (capSel >= 0) y = Txt(y, Prog.Captains[capSel].Text, stTiny);
            }
            int sum = Units.Sum(form);
            string fleet = c.S2.boats > 0 ? (c.FleetFits(form) ? " · passt auf die Flotte (schneller, mehr Beute)" : $" · Flotte fasst {c.S2.boats * Prog.BoatCap}") : "";
            y = Txt(y, $"Ausgewählt: <b>{sum}</b> Krieger{fleet}" + (info != "" ? "\n" + info : ""), stSmall);
            return y + 4f;
        }
    }
}
