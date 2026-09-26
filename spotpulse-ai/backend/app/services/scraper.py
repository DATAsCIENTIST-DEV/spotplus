import os
from typing import Any
from dotenv import load_dotenv
from apify_client import ApifyClient

# Load backend/.env
load_dotenv()


def extract_google_maps_url(url: str) -> dict[str, Any]:
    """
    Extract basic information from a Google Maps URL.
    """
    return {
        "query": url,
        "source": "google_maps_url",
        "url": url,
    }


def _get_apify_client() -> ApifyClient:
    """
    Create and return an Apify client using the API token
    stored in backend/.env.
    """
    token = os.getenv("APIFY_API_TOKEN")
    if not token:
        raise RuntimeError(
            "APIFY_API_TOKEN is missing. Add it to backend/.env"
        )
    return ApifyClient(token)


def search_google_maps(query: str) -> list[dict[str, Any]]:
    """
    Search Google Maps through the Apify Google Maps Scraper.
    This does not require a Google Maps API key.
    scrapePlaceDetailPage=True is important because it allows
    Apify to retrieve detailed place information including
    Popular Times data when available.
    """
    client = _get_apify_client()
    actor_id = os.getenv(
        "APIFY_GOOGLE_MAPS_ACTOR",
        "compass/crawler-google-places",
    )

    run_input = {
        "searchStringsArray": [query],
        "maxCrawledPlacesPerSearch": 10,
        "language": "en",
        "includeWebResults": False,
        "scrapePlaceDetailPage": True,
    }

    run = client.actor(actor_id).call(run_input=run_input)

    results: list[dict[str, Any]] = []
    if not run:
        return results

    # Get dataset_id safely (works with both old and new apify-client)
    dataset_id = None
    if isinstance(run, dict):
        dataset_id = run.get("defaultDatasetId") or run.get("default_dataset_id")
    else:
        dataset_id = getattr(run, "default_dataset_id", None) or getattr(run, "defaultDatasetId", None)

    if not dataset_id:
        return results

    for item in client.dataset(dataset_id).iterate_items():
        results.append(item)

    return results


def get_demo_venue(query: str) -> dict[str, Any]:
    """
    Perform a real Google Maps search through Apify
    and select the most relevant Islamabad result.
    Islamabad is the current SpotPulse MVP city.
    This function does NOT return fake/demo data.
    """
    results = search_google_maps(query)

    if not results:
        return {
            "name": query,
            "query": query,
            "source": "apify",
            "found": False,
            "message": "No Google Maps results found.",
        }

    query_lower = query.lower()

    def score(place: dict[str, Any]) -> int:
        """
        Give each Apify result a relevance score.
        Higher score = better match for the requested
        Islamabad restaurant.
        """
        title = str(
            place.get("title")
            or place.get("name")
            or ""
        ).lower()

        address = str(
            place.get("address")
            or ""
        ).lower()

        url = str(
            place.get("url")
            or place.get("googleMapsUrl")
            or ""
        ).lower()

        score_value = 0

        # Prefer Islamabad results
        if "islamabad" in title:
            score_value += 100
        if "islamabad" in address:
            score_value += 100
        if "islamabad" in url:
            score_value += 50

        # Match words from user's search query
        query_words = [
            word.strip().lower()
            for word in query_lower.split()
            if len(word.strip()) >= 3
        ]

        for word in query_words:
            if word in title:
                score_value += 20
            if word in address:
                score_value += 10

        # Prefer real Popular Times data
        if place.get("popularTimesHistogram"):
            score_value += 30
        if place.get("popularTimesLivePercent") is not None:
            score_value += 20
        if place.get("popularTimesLiveText"):
            score_value += 10

        return score_value

    # Select the most relevant result
    best_place = max(results, key=score)
    return normalize_place(best_place)


def normalize_place(place: dict[str, Any]) -> dict[str, Any]:
    """
    Convert Apify Google Maps data into the structure
    expected by the SpotPulse frontend.
    """
    location = place.get("location") or {}
    latitude = location.get("lat")
    longitude = location.get("lng")

    popular_times = place.get("popularTimesHistogram") or {}
    live_busy_percent = place.get("popularTimesLivePercent")
    live_busy_text = place.get("popularTimesLiveText")
    opening_hours = place.get("openingHours") or []

    rating = place.get("rating")
    if rating is None:
        rating = place.get("totalScore")

    reviews = (
        place.get("reviewsCount")
        or place.get("reviews")
        or 0
    )

    return {
        "place_id": (
            place.get("placeId")
            or place.get("place_id")
            or place.get("cid")
        ),
        "name": (
            place.get("title")
            or place.get("name")
            or "Unknown venue"
        ),
        "address": (
            place.get("address")
            or place.get("street")
            or ""
        ),
        "rating": rating,
        "reviews": reviews,
        "phone": place.get("phone"),
        "website": place.get("website"),
        "latitude": (
            latitude
            if latitude is not None
            else place.get("latitude")
        ),
        "longitude": (
            longitude
            if longitude is not None
            else place.get("longitude")
        ),
        "google_maps_url": (
            place.get("url")
            or place.get("googleMapsUrl")
        ),
        "popular_times": popular_times,
        "live_busy_text": live_busy_text,
        "live_busy_percent": live_busy_percent,
        "opening_hours": opening_hours,
        "source": "apify",
        "raw": place,
    }
