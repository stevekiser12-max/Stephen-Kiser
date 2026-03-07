// Category config: Google Places types + dog-friendly keywords
export const CATEGORIES = {
  restaurant: {
    label: 'Restaurants',
    emoji: '🍽️',
    types: ['restaurant', 'cafe', 'food', 'bakery'],
    keywords: ['dog friendly restaurant', 'pet friendly patio'],
  },
  bar: {
    label: 'Bars & Breweries',
    emoji: '🍺',
    types: ['bar', 'night_club'],
    keywords: ['dog friendly bar', 'dog friendly brewery'],
  },
  park: {
    label: 'Parks & Outdoors',
    emoji: '🌳',
    types: ['park', 'campground'],
    keywords: ['dog park', 'off leash dog area'],
  },
  pet_store: {
    label: 'Pet Shops',
    emoji: '🐾',
    types: ['pet_store', 'veterinary_care'],
    keywords: ['pet store', 'dog grooming'],
  },
  lodging: {
    label: 'Dog-Friendly Hotels',
    emoji: '🏨',
    types: ['lodging'],
    keywords: ['pet friendly hotel', 'dog friendly hotel'],
  },
  tourist_attraction: {
    label: 'Things To Do',
    emoji: '🎉',
    types: ['tourist_attraction'],
    keywords: ['dog friendly attraction', 'pet friendly outdoor'],
  },
}

// Singleton Maps API loader — loads script once per page session
let _mapsApiPromise = null

function loadMapsApi(apiKey) {
  if (window.google?.maps?.places) return Promise.resolve()
  if (_mapsApiPromise) return _mapsApiPromise
  _mapsApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Failed to load Google Maps API. Check your API key.'))
    document.head.appendChild(script)
  })
  return _mapsApiPromise
}

// Singleton PlacesService
let _service = null

async function getService(apiKey) {
  await loadMapsApi(apiKey)
  if (!_service) {
    const attrDiv = document.createElement('div')
    document.body.appendChild(attrDiv)
    _service = new google.maps.places.PlacesService(attrDiv)
  }
  return _service
}

// Normalize JS API LatLng objects to plain {lat, lng}
function normalizePlaces(places) {
  return places.map(p => ({
    ...p,
    geometry: p.geometry
      ? {
          ...p.geometry,
          location: {
            lat: typeof p.geometry.location.lat === 'function'
              ? p.geometry.location.lat()
              : p.geometry.location.lat,
            lng: typeof p.geometry.location.lng === 'function'
              ? p.geometry.location.lng()
              : p.geometry.location.lng,
          },
        }
      : p.geometry,
  }))
}

/**
 * Search dog-friendly places using Google Maps JS API (no CORS proxy needed).
 */
export async function searchDogFriendlyPlaces(coords, categories, apiKey, radius = 5000) {
  const { lat, lng } = coords

  // Load the API first so google.maps is available for all calls below
  await loadMapsApi(apiKey)

  const allPlaces = []
  const seen = new Set()

  const promises = []
  for (const catKey of categories) {
    const cat = CATEGORIES[catKey]
    if (!cat) continue
    for (const keyword of cat.keywords) {
      promises.push(
        textSearch(keyword, lat, lng, radius, apiKey)
          .then(places => normalizePlaces(places).map(p => ({ ...p, _category: catKey })))
          .catch(() => [])
      )
    }
    for (const type of cat.types.slice(0, 1)) {
      promises.push(
        nearbySearch(lat, lng, radius, type, apiKey)
          .then(places => normalizePlaces(places).map(p => ({ ...p, _category: catKey })))
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

  // Filter to selected radius — textSearch ignores radius strictly
  const radiusMiles = radius / 1609
  const nearby = allPlaces.filter(p => {
    const loc = p.geometry?.location
    if (!loc) return false
    return distanceMiles(lat, lng, loc.lat, loc.lng) <= radiusMiles
  })

  // Sort: open now first, then by rating
  return nearby.sort((a, b) => {
    const aOpen = a.opening_hours?.open_now ? 1 : 0
    const bOpen = b.opening_hours?.open_now ? 1 : 0
    if (bOpen !== aOpen) return bOpen - aOpen
    return (b.rating || 0) - (a.rating || 0)
  })
}

function textSearch(query, lat, lng, radius, apiKey) {
  return getService(apiKey).then(service => new Promise((resolve, reject) => {
    service.textSearch(
      {
        query,
        location: new google.maps.LatLng(lat, lng),
        radius,
      },
      (results, status) => {
        const S = google.maps.places.PlacesServiceStatus
        if (status === S.OK) resolve(results)
        else if (status === S.ZERO_RESULTS) resolve([])
        else reject(new Error(`Places API: ${status}`))
      }
    )
  }))
}

function nearbySearch(lat, lng, radius, type, apiKey) {
  return getService(apiKey).then(service => new Promise((resolve, reject) => {
    service.nearbySearch(
      {
        location: new google.maps.LatLng(lat, lng),
        radius,
        type,
        keyword: 'dog friendly',
      },
      (results, status) => {
        const S = google.maps.places.PlacesServiceStatus
        if (status === S.OK) resolve(results)
        else if (status === S.ZERO_RESULTS) resolve([])
        else reject(new Error(`Places API: ${status}`))
      }
    )
  }))
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
