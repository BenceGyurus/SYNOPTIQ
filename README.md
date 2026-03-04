# Synoptiq - Advanced Energy Telemetry System

Ez egy professzionális, valós idejű monitorozó rendszer Solarplanet / ZeverSolar inverterekhez.

## Gyors Telepítés (Self-Hosting)

### Előfeltételek
- Docker és Docker Compose telepítve.

### Telepítés lépései

1. **Másold le a projektet:**
   ```bash
   git clone <repo-url>
   cd solaris-nexus
   ```

2. **Konfiguráld a környezeti változókat:**
   Hozz létre egy `.env` fájlt a gyökérkönyvtárban:
   ```env
   # Nyelv beállítása: hu (Magyar) vagy en (English)
   NEXT_PUBLIC_LANGUAGE=hu

   # Inverter adatai
   INVERTER_IP=192.168.1.xxx
   INVERTER_SERIAL=<YOUR_SERIAL_NUMBER>
   INVERTER_PORT=8484
   INVERTER_NAME=Otthoni Inverter

   # Adatbázis (Docker hálózaton belül)
   DATABASE_URL=postgresql+asyncpg://solaris:solaris_pass@db:5432/solaris
   POSTGRES_USER=solaris
   POSTGRES_PASSWORD=solaris_pass
   POSTGRES_DB=solaris

   # Frissítési gyakoriság (másodperc)
   POLLING_INTERVAL=5
   ```

3. **Indítsd el a rendszert:**
   ```bash
   docker-compose up -d
   ```

4. **Használat:**
   Nyisd meg a böngészőben: `http://localhost:3000`

## Funkciók
- **Élő HUD:** Izometrikus vizualizáció az energiaáramlásról.
- **Sztring Analízis:** Külön String 1 és String 2 mérések.
- **Pénzügyi mutatók:** Termelt érték Forintban.
- **Anomália Detektálás:** Automatikus hálózati és sztring hibafigyelés.
- **Elemzés:** Egyedi időszaki lekérdezések és grafikonok.
- **PWA:** Telepíthető mobilalkalmazásként.

## Fejlesztés és CI/CD
A projekt GitHub Actions-t használ. Minden `main` ágra történő push után automatikusan frissül a `latest` docker image és készül egy új Release.
