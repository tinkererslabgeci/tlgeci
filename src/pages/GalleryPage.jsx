import lab1 from '../assets/gallery/lab-1.svg'
import lab2 from '../assets/gallery/lab-2.svg'
import lab3 from '../assets/gallery/lab-3.svg'

const galleryItems = Array.from({ length: 9 }).map((_, i) => ({
  id: i + 1,
  title: `Project / Moment ${i + 1}`,
  img: [lab1, lab2, lab3][i % 3],
}))

export default function GalleryPage() {
  return (
    <div className="sectionStack">
      <header className="pageHeader">
        <h1 className="pageTitle">Gallery</h1>
        <p className="pageSubtitle">Add photos later (or replace these placeholders with real images).</p>
      </header>

      <section className="card" style={{ padding: '1.4rem' }}>
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
