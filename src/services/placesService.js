// Category config: Google Places types + dog-friendly keywords
export const CATEGORIES = {
  restaurant: {
    label: 'Restaurants',
    emoji: '🍽️',
    types: ['restaurant', 'cafe', 'food', 'bakery'],
    keywords: ['dog friendly', 'pet friendly', 'dogs welcome', 'patio dogs'],
  },
  bar: {
    label: 'Bars & Breweries',
    emoji: '🍺',
    types: ['bar', 'night_club'],
    keywords: ['dog friendly bar', 'pet friendly bar', 'dog friendly brewery', 'dogs allowed'],
  },
  park: {
    label: 'Parks & Outdoors',
    emoji: '🌳',
    types: ['park', 'campground', 'natural_feature'],
    keywords: ['dog park', 'dog friendly trail', 'off leash', 'pet friendly park'],
  },
  pet_store: {
    label: 'Pet Shops',
    emoji: '🐾',
    types: ['pet_store', 'veterinary_care'],
    keywords: ['pet store', 'dog grooming', 'pet supply', 'animal hospital'],
  },
  lodging: {
    label: 'Dog-Friendly Hotels',
    emoji: '🏨',
    types: ['lodging'],
    keywords: ['pet friendly hotel', 'dog friendly hotel', 'dogs allowed hotel'],
  },
  tourist_attraction: {
    label: 'Things To Do',
    emoji: '🎉',
    types: ['tourist_attraction', 'amusement_park', 'stadium', 'shopping_mall', 'store'],
    keywords: ['dog friendly', 'pet friendly', 'dogs welcome'],
  },
}

const CORS_PROXY = 'https://corsproxy.io/?'

/**
 * Search dog-friendly places using Google Places Text Search + Nearby Search.
 * Combines results, deduplicates, and sorts by rating.
 */
export async function searchDogFriendlyPlaces(coords, categories, apiKey, radius = 5000) {
  const { lat, lng } = coords
  const allPlaces = []
  const seen = new Set()

  // For each selected category, run a text search with dog-friendly keywords
  const promises = []
  for (const catKey of categories) {
    const cat = CATEGORIES[catKey]
    if (!cat) continue
    // Use the first keyword as the main query
    for (const keyword of cat.keywords.slice(0, 2)) {
      promises.push(
        textSearch(keyword, lat, lng, radius, apiKey)
          .then(places => places.map(p => ({ ...p, _category: catKey })))
          .catch(() => [])
      )
    }
    // Also do a nearby search by type
    for (const type of cat.types.slice(0, 1)) {
      promises.push(
        nearbySearch(lat, lng, radius, type, apiKey)
          .then(places => places.map(p => ({ ...p, _category: catKey })))
          .catch(() => [])
      )
    }
  }

  const results = await Promise.all(promises)
  for (const batch of results) {
    for (const place of batch) {
      if (!seen.has(place.place_id)) {
        seen.add(place.place_id)
        allPlaces.push(place)
      }
    }
  }

  // Sort: open now first, then by rating
  return allPlaces.sort((a, b) => {
    const aOpen = a.opening_hours?.open_now ? 1 : 0
    const bOpen = b.opening_hours?.open_now ? 1 : 0
    if (bOpen !== aOpen) return bOpen - aOpen
    return (b.rating || 0) - (a.rating || 0)
  })
}

async function textSearch(query, lat, lng, radius, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=${radius}&key=${apiKey}`
  const res = await fetch(CORS_PROXY + encodeURIComponent(url))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.status === 'REQUEST_DENIED') throw new Error('API key denied: ' + (data.error_message || ''))
  return data.results || []
}

async function nearbySearch(lat, lng, radius, type, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&keyword=dog+friendly&key=${apiKey}`
  const res = await fetch(CORS_PROXY + encodeURIComponent(url))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.status === 'REQUEST_DENIED') throw new Error('API key denied: ' + (data.error_message || ''))
  return data.results || []
}

export function getPhotoUrl(photoRef, apiKey, maxWidth = 400) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${apiKey}`
}

export function getDirectionsUrl(place) {
  const { lat, lng } = place.geometry?.location || {}
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${place.place_id}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`
}

export function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
