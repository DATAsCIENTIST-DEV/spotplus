from fastapi import APIRouter, HTTPException

from app.schemas import VenueSearch
from app.services.scraper import (
    search_google_maps,
    extract_google_maps_url,
)

router = APIRouter()


@router.post("/search")
def search_places(payload: VenueSearch):
    try:
        query = payload.query.strip()

        if not query:
            raise HTTPException(
                status_code=400,
                detail="Search query is required.",
            )

        # Google Maps URL
        if query.startswith("http"):
            result = extract_google_maps_url(query)

            if not result:
                raise HTTPException(
                    status_code=404,
                    detail="Could not find venue from Google Maps URL.",
                )

            return result

        # REAL Google Maps / Apify search
        results = search_google_maps(query)

        if not results:
            raise HTTPException(
                status_code=404,
                detail="No restaurant found.",
            )

        # Return the first matching venue
        return results[0]

    except HTTPException:
        raise

    except Exception as e:
        print("SEARCH ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail=f"Restaurant search failed: {str(e)}",
        )


@router.get("/compare")
def compare_venues():
    return {
        "venues": [
            get_demo_venue("Venue A"),
            get_demo_venue("Venue B"),
        ]
    }