const galleryItems = Array.from({ length: 9 }).map((_, i) => ({
  id: i + 1,
  title: `Project / Moment ${i + 1}`,
  img: ['/gallery/lab-1.svg', '/gallery/lab-2.svg', '/gallery/lab-3.svg'][i % 3],
}))

export default function GalleryPage() {
  return (
    <div className="sectionStack">
      <header className="pageHeader">
        <h1 className="pageTitle">Gallery</h1>
        <p className="pageSubtitle">Add photos later (or replace these placeholders with real images).</p>
      </header>

      <section className="card" style={{ padding: '1.4rem' }}>
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
              src="/logo/tlgeci-logopp.png"
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
          {galleryItems.map((item, idx) => (
            <div
              key={item.id}
              className="card mediaCard mediaLoad"
              style={{ overflow: 'hidden', '--i': idx }}
            >
              <img
                className="mediaImg"
                src={item.img}
                alt={item.title}
                loading="lazy"
                style={{
                  width: '100%',
                  height: 160,
                  objectFit: 'cover',
                  display: 'block',
                  borderBottom: '1px solid rgba(255,255,255,0.10)',
                }}
              />
              <div style={{ padding: '0.9rem' }}>
                <div style={{ fontWeight: 700 }}>{item.title}</div>
                <div style={{ marginTop: '0.25rem', color: 'rgba(255, 255, 255, 0.70)', fontSize: '0.92rem' }}>
                  Caption placeholder
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
