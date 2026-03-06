import { CATEGORIES } from '../services/placesService'
import './PlaceCard.css'

function StarRating({ rating }) {
  if (!rating) return null
  const full = Math.round(rating)
  return (
    <span className="stars">
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      <span className="rating-num">{rating.toFixed(1)}</span>
    </span>
  )
}

export default function PlaceCard({ place, onClick }) {
  const cat = CATEGORIES[place._category]
  const isOpen = place.opening_hours?.open_now
  const hasHours = place.opening_hours !== undefined

  return (
    <button className="place-card" onClick={onClick}>
      <div className="place-card-left">
        <div className="place-cat-badge">{cat?.emoji || '📍'}</div>
      </div>
      <div className="place-card-body">
        <div className="place-card-top">
          <h3 className="place-name">{place.name}</h3>
          {hasHours && (
            <span className={`place-hours ${isOpen ? 'open' : 'closed'}`}>
              {isOpen ? 'Open' : 'Closed'}
            </span>
          )}
        </div>
        <p className="place-address">{place.vicinity || place.formatted_address}</p>
        <div className="place-card-meta">
          {place.rating && <StarRating rating={place.rating} />}
          {place.user_ratings_total > 0 && (
            <span className="place-reviews">({place.user_ratings_total.toLocaleString()} reviews)</span>
          )}
          {cat && <span className="place-cat-label">{cat.label}</span>}
        </div>
      </div>
      <div className="place-card-arrow">›</div>
    </button>
  )
}
