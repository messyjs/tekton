---
name: maps
description: "Geocoding, POI search, and directions using OpenStreetMap/OSM data."
version: 1.0.0
metadata:
  tekton:
    tags: ["maps", "geocoding", "osm", "directions"]
    category: productivity
    confidence: 0.4
---

# Maps

## When to Use
- Geocoding addresses
- Finding nearby POIs
- Getting directions

## Procedure
1. Geocode: use Nominatim API
2. Reverse geocode: lat/lng to address
3. POI search: use Overpass API
4. Directions: use OSRM or GraphHopper

## Pitfalls
- Nominatim has usage policy: max 1 req/sec
- Geocoding accuracy varies by region
- Rate limiting is strictly enforced

## Verification
- Geocoded coordinates are in expected area
- Directions are reasonable
- POI results match query
