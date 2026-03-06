import './SearchButton.css'

const STATUS_LABELS = {
  idle: '🐾  Find Dog-Friendly Places',
  locating: '📍  Getting Your Location...',
  searching: '🔍  Searching Nearby...',
  done: '🔄  Search Again',
  error: '🔄  Try Again',
}

export default function SearchButton({ status, onClick, disabled }) {
  const isLoading = status === 'locating' || status === 'searching'
  return (
    <button
      className={`search-btn ${isLoading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading && <span className="search-spinner" />}
      <span>{STATUS_LABELS[status] || STATUS_LABELS.idle}</span>
    </button>
  )
}
