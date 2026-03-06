import { useEffect } from 'react'
import { CATEGORIES, getDirectionsUrl, distanceKm } from '../services/placesService'
import './PlaceDetail.css'

export default function PlaceDetail({ place, userLocation, onClose }) {
  // Close on back gesture / escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const cat = CATEGORIES[place._category]
  const isOpen = place.opening_hours?.open_now
  const hasHours = place.opening_hours !== undefined
  const directionsUrl = getDirectionsUrl(place)

  const { lat, lng } = place.geometry?.location || {}
  let dist = null
  if (userLocation && lat && lng) {
    dist = distanceKm(userLocation.lat, userLocation.lng, lat, lng)
  }

  const priceLevel = place.price_level
  const priceDollar = priceLevel ? '$'.repeat(priceLevel) : null

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-sheet" onClick={e => e.stopPropagation()}>
        <div className="detail-handle" />

        <div className="detail-header">
          <div className="detail-emoji">{cat?.emoji || '📍'}</div>
          <div className="detail-header-info">
            <h2 className="detail-name">{place.name}</h2>
            {cat && <span className="detail-cat">{cat.label}</span>}
          </div>
          <button className="detail-close" onClick={onClose}>✕</button>
        </div>

        <div className="detail-body">
          {/* Status row */}
          <div className="detail-row">
            {hasHours && (
              <span className={`detail-badge ${isOpen ? 'open' : 'closed'}`}>
                {isOpen ? '● Open now' : '● Closed'}
              </span>
            )}
            {priceDollar && <span className="detail-price">{priceDollar}</span>}
            {dist !== null && (
              <span className="detail-dist">
                {dist < 1 ? `${Math.round(dist * 1000)}m away` : `${dist.toFixed(1)}km away`}
              </span>
            )}
          </div>

          {/* Rating */}
          {place.rating && (
            <div className="detail-rating-row">
              <span className="detail-stars">{'★'.repeat(Math.round(place.rating))}</span>
              <span className="detail-rating-num">{place.rating.toFixed(1)}</span>
              {place.user_ratings_total > 0 && (
                <span className="detail-rating-count">
                  {place.user_ratings_total.toLocaleString()} reviews
                </span>
              )}
            </div>
          )}

          {/* Address */}
          {(place.vicinity || place.formatted_address) && (
            <div className="detail-info-row">
              <span className="detail-info-icon">📍</span>
              <p className="detail-info-text">{place.vicinity || place.formatted_address}</p>
            </div>
          )}

          {/* Types tags */}
          {place.types && place.types.length > 0 && (
            <div className="detail-types">
              {place.types.slice(0, 5).map(t => (
                <span key={t} className="detail-type-tag">
                  {t.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="detail-actions">
            <a
              className="detail-action-btn primary"
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              🗺️ Get Directions
            </a>
            <a
              className="detail-action-btn secondary"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              🔍 View on Maps
            </a>
          </div>

          {/* Dog note */}
          <div className="detail-dog-note">
            <span>🐶</span>
            <p>Always call ahead to confirm current pet policy — it can change!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
