import PlaceCard from './PlaceCard'
import './PlacesList.css'

export default function PlacesList({ places, onSelect }) {
  if (places.length === 0) return null
  return (
    <div className="places-list">
      {places.map((place) => (
        <PlaceCard key={place.place_id} place={place} onClick={() => onSelect(place)} />
      ))}
    </div>
  )
}
