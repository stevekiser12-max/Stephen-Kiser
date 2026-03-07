import { useState, useCallback } from 'react'
import './App.css'
import Header from './components/Header'
import ApiKeySetup from './components/ApiKeySetup'
import CategoryFilter from './components/CategoryFilter'
import SearchButton from './components/SearchButton'
import PlacesList from './components/PlacesList'
import PlaceDetail from './components/PlaceDetail'
import { searchDogFriendlyPlaces } from './services/placesService'
import { useLocalStorage } from './hooks/useLocalStorage'

export default function App() {
  const [apiKey, setApiKey] = useLocalStorage('google_places_api_key', '')
  const [activeCategories, setActiveCategories] = useState(['restaurant', 'bar', 'park', 'pet_store', 'lodging', 'tourist_attraction'])
  const [places, setPlaces] = useState([])
  const [status, setStatus] = useState('idle') // idle | locating | searching | done | error
  const [error, setError] = useState('')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [radius, setRadius] = useLocalStorage('search_radius', 8047)

  const handleSearch = useCallback(async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Google Places API key first.')
      setStatus('error')
      return
    }

    setError('')
    setPlaces([])
    setStatus('locating')

    let coords
    try {
      coords = await getCurrentPosition()
      setUserLocation(coords)
    } catch (e) {
      setError('Could not get your location. Please enable location permissions and try again.')
      setStatus('error')
      return
    }

    setStatus('searching')
    try {
      const results = await searchDogFriendlyPlaces(coords, activeCategories, apiKey, radius)
      setPlaces(results)
      setStatus('done')
    } catch (e) {
      setError(e.message || 'Search failed. Check your API key and try again.')
      setStatus('error')
    }
  }, [apiKey, activeCategories, radius])

  const toggleCategory = useCallback((cat) => {
    setActiveCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }, [])

  return (
    <div className="app">
      <Header />

      <main className="main">
        <ApiKeySetup apiKey={apiKey} onSave={setApiKey} />

        <div className="radius-row">
          <label className="radius-label">Search radius</label>
          <div className="radius-options">
            {[1609, 4828, 8047, 16093, 32187].map(r => (
              <button
                key={r}
                className={`radius-btn ${radius === r ? 'active' : ''}`}
                onClick={() => setRadius(r)}
              >
                {`${Math.round(r / 1609)} mi`}
              </button>
            ))}
          </div>
        </div>

        <CategoryFilter active={activeCategories} onToggle={toggleCategory} />

        <SearchButton status={status} onClick={handleSearch} disabled={activeCategories.length === 0} />

        {status === 'error' && (
          <div className="error-box">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {status === 'done' && places.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon">🐾</p>
            <p>No dog-friendly places found nearby. Try increasing the radius.</p>
          </div>
        )}

        {places.length > 0 && (
          <div className="results-header">
            <span className="results-count">{places.length} places found</span>
            {userLocation && (
              <span className="location-badge">📍 Near you</span>
            )}
          </div>
        )}

        <PlacesList places={places} onSelect={setSelectedPlace} />
      </main>

      {selectedPlace && (
        <PlaceDetail
          place={selectedPlace}
          userLocation={userLocation}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  )
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  })
}
