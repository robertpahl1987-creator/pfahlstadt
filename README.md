# Pfahlstadt – Ebbe & Flut

Ein eigenständiges Aufbau- und Überlebensspiel für Android, gebaut mit Unity 6.
Deine Siedlung steht auf Holzpfählen mitten im Wattenmeer. Zweimal am Tag steigt die Flut,
dazu ziehen immer wieder Sturmfluten auf. Halte die Stadt über Wasser.

## Spielidee

- **Gezeitenturm (Leuchtturm):** Jede Stufe hebt alle Plattformen der Stadt höher über das Wasser.
  Andere Gebäude können nie höher sein als der Turm.
- **Wasserstand gegen Deckhöhe:** Steigt das Wasser über das Deck, wird gearbeitet wie unter Wasser.
  Die Siedler werden krank, und schlimmstenfalls stirbt jemand.
- **Gezeiten-Wirtschaft:**
  - Muschelzucht erntet viel bei **Ebbe**
  - Wracktaucher bergen mehr Altmetall bei **Flut**
  - Regenfänger füllen sich bei **Sturm**
- **Leuchtfeuer:** Verbraucht Holz. Nur wenn es brennt, finden Boote mit neuen Siedlern zu dir,
  und Kranke werden schneller gesund.
- **Wattwandern:** Geht nur bei Ebbe und bringt Holz, Muscheln und Altmetall, manchmal auch einen
  Gestrandeten. Kommt die Flut zu früh, muss die Gruppe umkehren und bringt weniger mit.
- **Offline-Fortschritt:** Bis zu 8 Stunden lang wird weiter produziert und gebaut.

Rohstoffe: Holz, Muscheln, Wasser, Altmetall. Dazu kommen 12 Bauplätze rund um den Turm,
7 Gebäudearten mit je 10 Stufen und höchstens 2 Bautrupps gleichzeitig.

## Grafik (bis 8K)

Die Stufen Niedrig, Mittel, Hoch und Ultra werden automatisch nach Arbeitsspeicher und Grafikchip gewählt.
Ruckelt es, schaltet das Spiel selbst eine Stufe herunter. Auf **Ultra** läuft das Spiel in voller
Bildschirmauflösung, auf Geräten mit 8K-Bildschirm also bis 7680 × 4320.
Im Spiel lässt sich die Stufe über den Knopf **Grafik** von Hand wechseln.

Alle Modelle entstehen per Code, es werden keine gekauften Assets gebraucht.

## Am PC starten

1. **Unity Hub** installieren, dann **Unity 6 (6000.0 LTS)** mit **Android Build Support** hinzufügen.
2. In Unity Hub auf *Add → Add project from disk* klicken und diesen Ordner wählen.
3. Beim ersten Öffnen richtet sich das Projekt selbst ein. Falls nicht, im Menü
   **Pfahlstadt → Projekt einrichten** wählen.
4. Die Szene `Assets/Scenes/Pfahlstadt` öffnen und **Play** drücken.
5. Für die APK im Menü **Pfahlstadt → Android-APK bauen** wählen. Die Datei landet in `Build/Android/Pfahlstadt.apk`.

## APK über GitHub bauen lassen

Die Datei `.github/workflows/android.yml` baut die APK automatisch auf GitHub.

1. Den Ordner als Repository auf GitHub hochladen.
2. Unter *Settings → Secrets and variables → Actions* drei Secrets anlegen:
   - `UNITY_EMAIL`: E-Mail deines Unity-Kontos
   - `UNITY_PASSWORD`: Passwort deines Unity-Kontos
   - `UNITY_LICENSE`: Inhalt deiner Lizenzdatei (`.ulf`). Diese Datei entsteht einmalig, wenn du dich
     auf einem PC in Unity Hub mit einer Personal-Lizenz anmeldest.
     Anleitung: game.ci/docs/github/activation
3. Unter *Actions → Android-APK bauen → Run workflow* den Build starten.
   Nach etwa 20–40 Minuten liegt die APK unter **Artifacts**.

## Steuerung

- 1 Finger ziehen: Kamera verschieben
- 2 Finger: zoomen
- Auf eine Plattform tippen: bauen oder ausbauen
