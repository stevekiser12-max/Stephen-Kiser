import { CATEGORIES } from '../services/placesService'
import './CategoryFilter.css'

export default function CategoryFilter({ active, onToggle }) {
  return (
    <div className="catfilter">
      <p className="catfilter-label">What to find</p>
      <div className="catfilter-grid">
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const isActive = active.includes(key)
          return (
            <button
              key={key}
              className={`catfilter-chip ${isActive ? 'active' : ''}`}
              onClick={() => onToggle(key)}
            >
              <span className="catfilter-emoji">{cat.emoji}</span>
              <span className="catfilter-name">{cat.label}</span>
              {isActive && <span className="catfilter-tick">✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
