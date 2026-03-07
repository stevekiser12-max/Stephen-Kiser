import { useState } from 'react'
import PlaceCard from './PlaceCard'
import { CATEGORIES } from '../services/placesService'
import './PlacesList.css'

const PAGE_SIZE = 5

export default function PlacesList({ places, onSelect }) {
  const [activeTab, setActiveTab] = useState(null)
  const [pages, setPages] = useState({})

  if (places.length === 0) return null

  // Group by category
  const grouped = {}
  for (const place of places) {
    const cat = place._category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(place)
  }

  const tabs = Object.keys(grouped)
  const currentTab = (activeTab && tabs.includes(activeTab)) ? activeTab : tabs[0]
  const catPlaces = grouped[currentTab] || []
  const currentPage = pages[currentTab] || 0
  const totalPages = Math.ceil(catPlaces.length / PAGE_SIZE)
  const pagePlaces = catPlaces.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  function switchTab(cat) {
    setActiveTab(cat)
  }

  function goToPage(page) {
    setPages(prev => ({ ...prev, [currentTab]: page }))
  }

  return (
    <div className="places-list">
      <div className="cat-tabs">
        {tabs.map(cat => {
          const info = CATEGORIES[cat] || { emoji: '📍', label: cat }
          return (
            <button
              key={cat}
              className={`cat-tab ${cat === currentTab ? 'active' : ''}`}
              onClick={() => switchTab(cat)}
            >
              <span className="cat-tab-emoji">{info.emoji}</span>
              <span className="cat-tab-label">{info.label}</span>
              <span className="cat-tab-count">{grouped[cat].length}</span>
            </button>
          )
        })}
      </div>

      <div className="cat-places">
        {pagePlaces.map(place => (
          <PlaceCard key={place.place_id} place={place} onClick={() => onSelect(place)} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`page-btn ${i === currentPage ? 'active' : ''}`}
              onClick={() => goToPage(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
