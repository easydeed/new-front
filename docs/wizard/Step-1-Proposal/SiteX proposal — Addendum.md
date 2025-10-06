# SiteX proposal — Addendum (Switches + Ready‑Paste)

**Purpose:** Append the practical bits we discussed so you can swap TitlePoint → SiteX with near‑zero UI changes.

---

## A) Flip these 3 switches

1) **Frontend feature flag** — don’t gate enrichment on TitlePoint only. Add a SiteX flag and treat either as “on”.  
_Why:_ Your Step‑1 code currently short‑circuits when the TitlePoint flag is off; this would also block SiteX. fileciteturn2file19

```ts
// Frontend: PropertySearch component
const enrichmentEnabled =
  process.env.NEXT_PUBLIC_TITLEPOINT_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_SITEX_ENABLED === 'true';

if (!enrichmentEnabled) {
  // keep manual entry path
  return;
}
```

2) **Backend route collision** — ensure only ONE `/api/property/search` route is mounted (the new SiteX version).  
_Why:_ You have two routes; the “simpler” one wins today because of mount order. Disable it or move the SiteX router last. fileciteturn2file18

3) **Multi‑match auto‑resolve (server‑side)** — keep the UI contract identical by resolving `Locations[]` on the server and immediately re‑querying with `FIPS`+`APN`.  
_Why:_ Your UI expects a single enriched record or manual fallback; it doesn’t show a parcel picker. fileciteturn2file19

---

## B) Ready‑paste server logic (FastAPI)

**Goal:** Call SiteX with strict, residential‑first options; if `Locations[]` comes back, pick the best candidate, then re‑query with `FIPS`+`APN` and return your existing response shape.

```python
# services/sitex_service.py (excerpt)
import time, base64, httpx
from urllib.parse import urlencode

class SiteXService:
    def __init__(self, base_url, client_id, client_secret, feed_id):
        self.base_url = base_url.rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.feed_id = str(feed_id)
        self._token = None
        self._exp = 0

    async def _get_token(self):
        if self._token and time.time() < self._exp - 30:
            return self._token
        url = f\"{self.base_url}/ls/apigwy/oauth2/v1/token\"  # 10‑min TTL
        basic = base64.b64encode(f\"{self.client_id}:{self.client_secret}\".encode()).decode()
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                url,
                headers={
                    \"Authorization\": f\"Basic {basic}\",
                    \"Content-Type\": \"application/x-www-form-urlencoded\",
                },
                data={\"grant_type\": \"client_credentials\"},
            )
            r.raise_for_status()
            data = r.json()
            self._token = data[\"access_token\"]
            self._exp = time.time() + data.get(\"expires_in\", 600)
            return self._token

    async def _get(self, path, qs):
        url = f\"{self.base_url}{path}?{urlencode(qs)}\"
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(url, headers={\"Authorization\": f\"Bearer {await self._get_token()}\"})
            r.raise_for_status()
            return r.json()

    async def search_address(self, street, last_line, client_ref, opts):
        qs = {
            \"addr\": street, \"lastLine\": last_line,
            \"clientReference\": client_ref, \"feedId\": self.feed_id,
            \"options\": opts,
        }
        return await self._get(\"/realestatedata/search\", qs)

    async def search_fips_apn(self, fips, apn, client_ref, opts):
        qs = {
            \"fips\": fips, \"apn\": apn,
            \"clientReference\": client_ref, \"feedId\": self.feed_id,
            \"options\": opts,
        }
        return await self._get(\"/realestatedata/search\", qs)
```

```python
# api/property_search.py (the only mounted route)
from fastapi import APIRouter, Depends, HTTPException
from services.sitex_service import SiteXService

router = APIRouter(prefix=\"/api/property\", tags=[\"property\"])

sitex = SiteXService(
    base_url=os.getenv(\"SITEX_BASE_URL\", \"https://api.bkiconnect.com\"),
    client_id=os.getenv(\"SITEX_CLIENT_ID\"),
    client_secret=os.getenv(\"SITEX_CLIENT_SECRET\"),
    feed_id=os.getenv(\"SITEX_FEED_ID\"),
)

STRICT_OPTS = \"search_exclude_nonres=Y|search_strict=Y\"  # residential only + no 'nearby' fallbacks

def best_candidate(locations, last_line=None, unit=None):
    # Super light heuristic: prefer exact ZIP match, then unit match, then first
    if not locations: 
        return None
    def score(loc):
        s = 0
        if last_line and str(loc.get(\"ZIP\") or '') in last_line: s += 2
        if unit and str(loc.get(\"UnitNumber\") or '').strip().lower() == str(unit).strip().lower(): s += 1
        return s
    return sorted(locations, key=score, reverse=True)[0]

@router.post(\"/search\")
async def property_search(req: dict, user=Depends(get_current_user)):
    full = (req.get(\"address\") or \"\").strip()
    if not full:
        raise HTTPException(400, \"address is required\")

    # Split into \"street\" and \"City, ST ZIP\" using your Google output
    street, last_line, unit = split_from_google(full)  # implement using your existing helper

    # 1) Try strict address match (residential only)
    data = await sitex.search_address(street, last_line, client_ref=f\"user:{user['id']}\", opts=STRICT_OPTS)

    # 2) If multi‑match, auto‑resolve and re‑query with FIPS+APN
    if isinstance(data.get(\"Locations\"), list) and data[\"Locations\"]:
        pick = best_candidate(data[\"Locations\"], last_line=last_line, unit=unit)
        if pick and pick.get(\"FIPS\") and pick.get(\"APN\"):
            data = await sitex.search_fips_apn(pick[\"FIPS\"], pick[\"APN\"], client_ref=f\"user:{user['id']}\", opts=STRICT_OPTS)
        else:
            return {\"success\": False, \"message\": \"No clear parcel match; use manual entry.\"}

    # 3) Map SiteX feed to existing UI shape
    mapped = map_sitex_feed_to_ui(data)  # implement to populate apn/county/legal/owner/fullAddress/confidence
    return {\"success\": True, **mapped}
```

**Why these options:**  
- `search_exclude_nonres=Y` reduces false multi‑matches where a commercial parcel shares the same address. fileciteturn2file16  
- `search_strict=Y` disables “fallback” similar/nearby matches so we don’t drift off‑parcel. fileciteturn2file1

---

## C) Config & references (copy/paste)

- **Base URLs**: UAT `https://api.uat.bkitest.com`, Prod `https://api.bkiconnect.com`. fileciteturn2file3  
- **Token endpoint**: `/ls/apigwy/oauth2/v1/token` — 10‑minute TTL; Basic header _or_ body creds. fileciteturn2file3 fileciteturn2file2  
- **Property search**: `/realestatedata/search` — address first, fallback to `FIPS`+`APN`. fileciteturn2file2 fileciteturn2file5  
- **Document (deed image)**: `/realestatedata/search/doc` — supports `format=PDF`; `options=document_provider=cascade`. fileciteturn2file0 fileciteturn2file7  
- **Feed schema**: `/realestatedata/search/schema/{feedId}` (generate DTOs/mappers). fileciteturn2file3  
- **County info (`APNFormats`)**: `/realestatedata/search/countyinfo?fips=...`. fileciteturn2file6

---

## D) Readiness checklist

- [ ] Frontend flag supports SiteX (`NEXT_PUBLIC_SITEX_ENABLED=true`). fileciteturn2file19  
- [ ] Only one `/api/property/search` route is active (SiteX). fileciteturn2file18  
- [ ] ENV set: `SITEX_BASE_URL`, `SITEX_CLIENT_ID`, `SITEX_CLIENT_SECRET`, `SITEX_FEED_ID`. fileciteturn2file3  
- [ ] Backend uses `STRICT_OPTS = "search_exclude_nonres=Y|search_strict=Y"`. fileciteturn2file16 fileciteturn2file1  
- [ ] Optional: `/api/property/deed-image` calling `/search/doc` with `format=PDF`. fileciteturn2file0

---

## E) Notes

- Keep sending `clientReference` to make support/troubleshooting easy — it’s logged by the service. fileciteturn2file5  
- If your feed returns recording metadata (rec date / doc # / book-page), you can attach the prior deed PDF in one extra call. fileciteturn2file0
