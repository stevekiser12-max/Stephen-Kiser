import './Header.css'

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-paw">🐾</div>
        <div>
          <h1 className="header-title">Dog Friendly Finder</h1>
          <p className="header-sub">Restaurants · Bars · Parks · Shops · Activities</p>
        </div>
      </div>
    </header>
  )
}
