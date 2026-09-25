# Solaris

Open source, local-first monitoring for Solplanet / AISWEI inverters. A clear daily view, detailed AC and PV readings, device discovery, and bilingual administration.

**Magyar:** A Solaris helyi hálózaton működő Solplanet inverterfigyelő. Az első indításkor létre kell hozni az adminisztrátori fiókot. Az inverter IP címe és sorozatszáma kézzel is megadható, vagy a megadott privát alhálózaton kereshető.

## Features / Funkciók

- Live power, daily and lifetime energy, daily chart, 7/30-day history, AC phases, up to three PV inputs, temperature, frequency, power factor, and raw warning/error codes.
- Hungarian and English interface; a default language for the site and a preference for each user.
- Better Auth email/password sessions and optional OpenID Connect. Admin and viewer roles are checked on the server.
- Admin-only LAN discovery through `getdev.cgi?device=2`, limited to a private IPv4 range of at most 256 addresses. Manual IP/serial entry remains available.
- Responsive flat-color interface without gradients. No cloud service is needed for telemetry.

## Quick start / Gyors kezdés

```sh
cp .env.example .env
# Edit .env: use three different random values for POSTGRES_PASSWORD,
# INTERNAL_API_SECRET and BETTER_AUTH_SECRET. Example: openssl rand -hex 32
docker compose up -d --build
```

Open `BETTER_AUTH_URL` (default [http://localhost:3000](http://localhost:3000)). On first visit, enter the admin name, email, and a password of at least 12 characters. Add an inverter in **Devices / Eszközök** using the serial number printed on the inverter. For example, a local endpoint such as `http://192.168.1.15:8484/getdevdata.cgi?device=2&sn=<SERIAL>` becomes IP `192.168.1.15`, port `8484`, serial `<SERIAL>` in the form.
For access beyond localhost, set `BETTER_AUTH_URL` to the exact public origin and serve the frontend over HTTPS through a reverse proxy. Keep the PostgreSQL and backend services on a private network.

**Magyar telepítés:** Másold az `.env.example` fájlt `.env` néven, állíts be három különböző véletlen titkot, majd indítsd a `docker compose up -d --build` paranccsal. Nyisd meg a `http://localhost:3000` címet, hozd létre az admin fiókot, és add meg az inverter sorozatszámát. A **Keresés** funkcióhoz például `192.168.1.0/24` alhálózatot adj meg. A konténernek ugyanarról a hálózatról kell látnia a dongle-t.

`INVERTER_IP`, `INVERTER_SERIAL`, `INVERTER_PORT`, and `INVERTER_NAME` can preconfigure one device via environment variables. These values take precedence for that device at startup. Do not publish port 8000; the backend accepts requests only from the frontend using `INTERNAL_API_SECRET`.
Set `INVERTER_TIMEZONE` to the inverter's local IANA timezone (default `Europe/Budapest`); polling defaults to every 30 seconds.

### OpenID Connect

Configure `OIDC_DISCOVERY_URL`, `OIDC_CLIENT_ID`, and `OIDC_CLIENT_SECRET` in `.env`, or set them in **Settings / Beállítások** after admin sign-in. Environment configuration takes precedence. The redirect URI to register at the identity provider is `${BETTER_AUTH_URL}/api/auth/callback/oidc`. Admin UI secrets are encrypted before storing in PostgreSQL; keep `BETTER_AUTH_SECRET` stable and backed up. OIDC users are created with the viewer role; an admin can promote them in **Users / Felhasználók**. Direct public email signup is disabled after first-run setup; admins can create local users.

### Permissions / Jogosultságok

| Role | View telemetry and history | Personal language | Inverters and discovery | Users, OIDC and defaults |
| --- | --- | --- | --- | --- |
| Viewer / Megtekintő | Yes | Yes | No | No |
| Operator / Kezelő | Yes | Yes | Yes | No |
| Admin / Adminisztrátor | Yes | Yes | Yes | Yes |

## Field reference / Mezők

The local response contains integer values that need scaling. This table describes the current supported `device=2` response. Codes without a documented, stable mapping remain visible as raw codes rather than guessed messages.

| Field | Meaning / jelentés | Conversion | Sample shown |
| --- | --- | --- | --- |
| `tim` | Inverter local timestamp / helyi idő | `YYYYMMDDHHMMSS`, configured `INVERTER_TIMEZONE` | 2026-09-25 17:24:09 |
| `flg` | Raw operating flag / állapotjelző | raw | 1 |
| `tmp` | Inverter temperature / hőmérséklet | ÷ 10 °C | 44.4 °C |
| `fac` | AC frequency / hálózati frekvencia | ÷ 100 Hz | 50.00 Hz |
| `pac` | Active AC power / hatásos teljesítmény | W | 470 W |
| `sac` | Apparent AC power / látszólagos teljesítmény | VA | 470 VA |
| `qac` | Reactive AC power / meddő teljesítmény | var | 0 var |
| `eto` | Lifetime energy / össztermelés | ÷ 10 kWh | 18,835.2 kWh |
| `etd` | Energy today / napi termelés | ÷ 10 kWh | 17.3 kWh |
| `hto` | Operating hours / üzemóra | h | 17,930 h |
| `pf` | Power factor / teljesítménytényező | ÷ 100 | 0.64 |
| `wan`, `err` | Raw warning and fault codes / figyelmeztetés és hiba | raw | 0, 0 |
| `vac[]` | Grid voltage per phase / fázisfeszültség | ÷ 10 V | 231.5, 236.9, 238.4 V |
| `iac[]` | Grid current per phase / fázisáram | ÷ 10 A | 1.0, 1.0, 1.0 A |
| `vpv[]` | PV input voltage / PV feszültség | ÷ 10 V | 150.0, 339.9 V |
| `ipv[]` | PV input current / PV áram | ÷ 100 A | 0.71, 0.73 A |
| `str[]` | Device-specific string data / gyártói sztringadat | raw, currently not interpreted | empty |

The field names and energy units align with the [Solplanet local integration](https://github.com/caiorasec/solplanet-int), and the device listing and serial-number requirement are documented in the [evcc device investigation](https://github.com/evcc-io/evcc/issues/31434). The [Solplanet app manual](https://solplanet.net/wp-content/uploads/2023/04/UM0041_Solplanet-App_EN_V04_1123.pdf) identifies E-Today, E-Total, H-Total, power and PF as inverter readings. Scaling of the other electrical fields is consistent with [published local response examples](https://github.com/trixing/kaco-http/blob/main/README.md). Firmware may add fields; unknown status and warning codes should be checked against the specific inverter manual.
The sample's reported `pf=0.64` does not numerically match `pac=sac=470` and `qac=0`; Solaris displays the device's PF value without deriving another one. Some firmware encodes negative `qac` as an unsigned 32-bit integer; Solaris converts it to a signed value.

Existing PostgreSQL metrics from the previous release are adjusted once at startup for the corrected `eto`, `etd`, `pf`, and signed `qac` scales. Back up the database volume before the first upgrade.

## Development and release

```sh
cd frontend && npm ci && npm run lint && npm run format:check && npm run build
python -m pip install -r backend/requirements.lock
python -m unittest discover -s backend/tests -v
```

GitHub Actions runs lint, production build, dependency audit, Python compilation and protocol tests for pull requests and `main`. Only successful `main` runs publish backend and frontend images to GHCR with immutable commit-SHA tags plus `latest`. For production, set `BACKEND_IMAGE` and `FRONTEND_IMAGE` to matching `sha-<commit>` tags, then run `docker compose -f docker-compose.yml -f docker-compose.prod.yml pull` and `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`. The release pipeline publishes images; deployment is an explicit operator step.

This repository does not contain an automatic database backup. Back up the `postgres_data` volume before upgrading.

## License

MIT. See [LICENSE](LICENSE).
