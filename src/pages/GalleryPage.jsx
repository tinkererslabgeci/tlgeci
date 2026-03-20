import { useEffect, useMemo, useState } from 'react'
import { galleryItems } from '../data/galleryData'

export default function GalleryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('all')
  const [activeIndex, setActiveIndex] = useState(null)

  const tags = useMemo(() => {
    const allTags = new Set()
    galleryItems.forEach((item) => {
      item.tags.forEach((tag) => allTags.add(tag))
    })
    return ['all', ...Array.from(allTags)]
  }, [])

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return galleryItems.filter((item) => {
      const title = item.title.toLowerCase()
      const matchesTag = selectedTag === 'all' || item.tags.includes(selectedTag)
      const matchesSearch = !query || title.includes(query) || item.tags.some((tag) => tag.includes(query))
      return matchesTag && matchesSearch
    })
  }, [searchTerm, selectedTag])

  useEffect(() => {
    if (activeIndex === null) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveIndex(null)
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % filteredItems.length)
      }
      if (event.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, filteredItems.length])

  useEffect(() => {
    if (activeIndex === null) {
      return
    }
    if (!filteredItems.length) {
      setActiveIndex(null)
      return
    }
    if (activeIndex > filteredItems.length - 1) {
      setActiveIndex(filteredItems.length - 1)
    }
  }, [filteredItems, activeIndex])

  const currentItem = activeIndex !== null ? filteredItems[activeIndex] : null

  return (
    <div className="sectionStack">
      <header className="pageHeader">
        <h1 className="pageTitle">Gallery</h1>
        <p className="pageSubtitle">A visual showcase of TL GECI moments, events, and achievements.</p>
      </header>

      <section className="card" style={{ padding: '1.4rem' }}>
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.03)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search photos by title or tag"
              style={{
                flex: '1 1 240px',
                minWidth: 220,
                padding: '0.7rem 0.85rem',
                background: 'rgba(0, 0, 0, 0.25)',
                color: 'rgba(255, 255, 255, 0.92)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 10,
              }}
            />

            <select
              value={selectedTag}
              onChange={(event) => setSelectedTag(event.target.value)}
              style={{
                padding: '0.7rem 0.85rem',
                background: 'rgba(0, 0, 0, 0.25)',
                color: 'rgba(255, 255, 255, 0.92)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 10,
              }}
            >
              {tags.map((tag) => (
                <option key={tag} value={tag}>{tag === 'all' ? 'All tags' : tag}</option>
              ))}
            </select>
          </div>
         
        </div>

        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'rgba(255, 255, 255, 0.03)',
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 14,
              background: 'transparent',
              display: 'grid',
              placeItems: 'center',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              flexShrink: 0,
            }}
          >
            <img
              src="/logo/tlgeci-logowhite.png"
              alt="TL GECI official logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.1)', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>Official Logo</div>
            <div style={{ marginTop: '0.3rem', color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.94rem' }}>
              This is the official TL GECI identity mark.
            </div>
          </div>
        </div>

        <div className="grid cols-3">
          {filteredItems.map((item, idx) => (
            <div
              key={item.id}
              className="card mediaCard mediaLoad"
              style={{ overflow: 'hidden', '--i': idx }}
            >
              <button
                type="button"
                onClick={() => setActiveIndex(idx)}
                style={{
                  all: 'unset',
                  display: 'block',
                  width: '100%',
                  cursor: 'zoom-in',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    background: 'rgba(0, 0, 0, 0.24)',
                    borderBottom: '1px solid rgba(255,255,255,0.10)',
                    padding: '0.35rem',
                  }}
                >
                  <img
                    className="mediaImg"
                    src={item.img}
                    alt={item.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </div>
              </button>
              <div style={{ padding: '0.9rem' }}>
                <div style={{ fontWeight: 700 }}>{item.title}</div>
                <div style={{ marginTop: '0.5rem', color: 'rgba(255, 255, 255, 0.70)', fontSize: '0.88rem' }}>
                  {item.tags.join(' • ')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!filteredItems.length && (
          <div style={{ marginTop: '1rem', color: 'rgba(255, 255, 255, 0.70)' }}>
            No photos found for this search/tag combination.
          </div>
        )}
      </section>

      {currentItem && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            zIndex: 1200,
            display: 'grid',
            placeItems: 'center',
            padding: '1rem',
          }}
          onClick={() => setActiveIndex(null)}
        >
          <div
            className="card"
            style={{
              width: 'min(1100px, 95vw)',
              maxHeight: '92vh',
              padding: '1rem',
              display: 'grid',
              gap: '0.8rem',
              background: 'rgba(20, 24, 32, 0.96)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={currentItem.img}
              alt={currentItem.title}
              style={{
                width: '100%',
                maxHeight: '72vh',
                objectFit: 'contain',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{currentItem.title}</div>
                <div style={{ marginTop: '0.25rem', color: 'rgba(255, 255, 255, 0.70)', fontSize: '0.9rem' }}>{currentItem.tags.join(' • ')}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setActiveIndex((prev) => (prev + 1) % filteredItems.length)}
                >
                  Next
                </button>
                <button type="button" className="btn" onClick={() => setActiveIndex(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
