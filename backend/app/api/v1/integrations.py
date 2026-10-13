from typing import Optional
from urllib.parse import quote_plus
import httpx
from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings

router = APIRouter(prefix="/integrations", tags=["External health integrations"])

TIMEOUT = httpx.Timeout(8.0, connect=5.0)

@router.get("/status")
def integration_status():
    return {
        "gemini": bool(settings.GEMINI_API_KEY),
        "openweather": bool(settings.OPENWEATHER_API_KEY),
        "newsdata": bool(settings.NEWSDATA_API_KEY),
        "wikipedia": True,
        "duckduckgo": True,
    }

@router.get("/weather")
async def weather(city: Optional[str] = Query(None), lat: Optional[float] = None, lon: Optional[float] = None):
    if not settings.OPENWEATHER_API_KEY:
        return {"configured": False, "message": "Add OPENWEATHER_API_KEY to backend/.env to enable live weather and air-quality data."}
    if not city and (lat is None or lon is None):
        raise HTTPException(400, "Provide a city or latitude/longitude.")
    params = {"appid": settings.OPENWEATHER_API_KEY, "units": "metric"}
    if city:
        params["q"] = city
    else:
        params.update({"lat": lat, "lon": lon})
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get("https://api.openweathermap.org/data/2.5/weather", params=params)
        if response.status_code >= 400:
            return {"configured": True, "error": "Weather service could not find that location or rejected the request."}
        data = response.json()
        air = None
        try:
            air_resp = await client.get("https://api.openweathermap.org/data/2.5/air_pollution", params={"appid": settings.OPENWEATHER_API_KEY, "lat": data["coord"]["lat"], "lon": data["coord"]["lon"]})
            if air_resp.status_code < 400:
                a = air_resp.json().get("list", [{}])[0]
                comp = a.get("components", {})
                air = {"aqi": a.get("main", {}).get("aqi"), "pm2_5": comp.get("pm2_5"), "pm10": comp.get("pm10"), "no2": comp.get("no2"), "o3": comp.get("o3")}
        except Exception:
            air = None
        return {
            "configured": True,
            "location": f"{data.get('name', city or 'Current location')}, {data.get('sys', {}).get('country', '')}".strip(', '),
            "temperature_c": data.get("main", {}).get("temp"),
            "feels_like_c": data.get("main", {}).get("feels_like"),
            "humidity": data.get("main", {}).get("humidity"),
            "wind_mps": data.get("wind", {}).get("speed"),
            "condition": data.get("weather", [{}])[0].get("description", "").title(),
            "icon": data.get("weather", [{}])[0].get("icon"),
            "air_quality": air,
        }

@router.get("/news")
async def health_news(language: str = "en", country: str = "in"):
    if not settings.NEWSDATA_API_KEY:
        return {"configured": False, "message": "Add NEWSDATA_API_KEY to backend/.env to enable live health news."}
    params = {"apikey": settings.NEWSDATA_API_KEY, "q": "health OR medicine OR wellness", "language": language, "country": country}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get("https://newsdata.io/api/1/latest", params=params)
        if response.status_code >= 400:
            return {"configured": True, "error": "News service rejected the request. Check your NewsData.io plan/key."}
        data = response.json()
        articles = []
        for item in data.get("results", [])[:8]:
            articles.append({"title": item.get("title"), "description": item.get("description"), "url": item.get("link"), "image": item.get("image_url"), "source": item.get("source_name"), "published": item.get("pubDate")})
        return {"configured": True, "articles": articles}

@router.get("/knowledge")
async def knowledge(q: str = Query(min_length=2, max_length=120), language: str = "en"):
    title = quote_plus(q.replace(" ", "_"))
    wiki_lang = "hi" if language == "hi" else "mr" if language == "mr" else "en"
    wiki_url = f"https://{wiki_lang}.wikipedia.org/api/rest_v1/page/summary/{title}"
    ddg_url = "https://api.duckduckgo.com/"
    async with httpx.AsyncClient(timeout=TIMEOUT, headers={"User-Agent": "HealthGuardian/1.0 educational-health-app"}) as client:
        wiki = None
        try:
            wr = await client.get(wiki_url)
            if wr.status_code < 400:
                w = wr.json()
                wiki = {"title": w.get("title"), "extract": w.get("extract"), "url": w.get("content_urls", {}).get("desktop", {}).get("page")}
        except Exception:
            pass
        ddg = None
        try:
            dr = await client.get(ddg_url, params={"q": q, "format": "json", "no_html": 1, "skip_disambig": 1})
            if dr.status_code < 400:
                d = dr.json()
                ddg = {"heading": d.get("Heading"), "abstract": d.get("AbstractText"), "url": d.get("AbstractURL")}
        except Exception:
            pass
    return {"query": q, "wikipedia": wiki, "duckduckgo": ddg}


@router.get("/image-search")
async def image_search(q: str = Query(min_length=2, max_length=120)):
    """Return a safe visual reference from Wikimedia Commons for chat resource cards."""
    async with httpx.AsyncClient(timeout=TIMEOUT, headers={"User-Agent": "HealthGuardian/1.0 educational-health-app"}) as client:
        try:
            response = await client.get(
                "https://commons.wikimedia.org/w/api.php",
                params={
                    "action": "query", "generator": "search", "gsrsearch": q,
                    "gsrnamespace": 6, "gsrlimit": 3, "prop": "imageinfo",
                    "iiprop": "url", "iiurlwidth": 900, "format": "json", "origin": "*",
                },
            )
            response.raise_for_status()
            pages = list(response.json().get("query", {}).get("pages", {}).values())
            if not pages:
                return {"found": False, "query": q}
            info = pages[0].get("imageinfo", [{}])[0]
            return {"found": bool(info.get("thumburl") or info.get("url")), "query": q, "url": info.get("thumburl") or info.get("url")}
        except Exception:
            return {"found": False, "query": q}
