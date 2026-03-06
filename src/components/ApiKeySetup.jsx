import { useState } from 'react'
import './ApiKeySetup.css'

export default function ApiKeySetup({ apiKey, onSave }) {
  const [editing, setEditing] = useState(!apiKey)
  const [draft, setDraft] = useState(apiKey)

  const save = () => {
    onSave(draft.trim())
    setEditing(false)
  }

  if (!editing && apiKey) {
    return (
      <div className="apikey-saved">
        <span className="apikey-check">✓</span>
        <span className="apikey-saved-text">Google API key saved</span>
        <button className="apikey-edit-btn" onClick={() => { setDraft(apiKey); setEditing(true) }}>
          Edit
        </button>
      </div>
    )
  }

  return (
    <div className="apikey-box">
      <div className="apikey-header">
        <span className="apikey-icon">🔑</span>
        <div>
          <p className="apikey-title">Google Places API Key</p>
          <p className="apikey-hint">Required once — stored on your device only</p>
        </div>
      </div>
      <div className="apikey-input-row">
        <input
          className="apikey-input"
          type="password"
          placeholder="AIzaSy..."
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="apikey-save-btn" onClick={save} disabled={!draft.trim()}>
          Save
        </button>
      </div>
      <a
        className="apikey-link"
        href="https://developers.google.com/maps/documentation/places/web-service/get-api-key"
        target="_blank"
        rel="noopener noreferrer"
      >
        How to get a free API key →
      </a>
    </div>
  )
}
