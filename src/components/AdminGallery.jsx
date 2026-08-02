import React, { useState, useEffect } from 'react';

export default function AdminGallery() {
  const [images, setImages] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [caption, setCaption] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchGallery();
    fetchEvents();
  }, []);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gallery');
      if (res.ok) {
        const data = await res.json();
        setImages(data);
      }
    } catch (err) {
      console.error('Failed to fetch gallery', err);
    }
    setLoading(false);
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch events', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(reader.result); // Base64 string
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      return alert('Please select an image to upload');
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          eventId: selectedEventId || null,
          imageBase64: imageFile,
        })
      });

      if (res.ok) {
        setCaption('');
        setSelectedEventId('');
        setImageFile(null);
        setImagePreview(null);
        e.target.reset();
        setShowAddForm(false);
        fetchGallery();
        alert('Image added to gallery!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add image');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    
    try {
      const res = await fetch(`/api/gallery?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchGallery();
      } else {
        alert('Failed to delete image');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0 }}>Gallery Management</h2>
          <p style={{ color: 'var(--text-62)', margin: '0.25rem 0 0 0' }}>Upload photos and optionally link them to specific events.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btnPrimary"
          style={{ padding: '0.75rem 1.5rem', borderRadius: '50px', fontWeight: '600' }}
        >
          {showAddForm ? 'Cancel' : '+ Upload Image'}
        </button>
      </div>
      
      {/* Upload Form */}
      {showAddForm && (
        <div style={{
          backgroundColor: 'var(--field-bg)', 
          border: '1px solid var(--border-strong)', 
          borderRadius: '16px', 
          padding: '2rem', 
          marginBottom: '3rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          animation: 'fadeInDown 0.3s ease'
        }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Upload to Gallery</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            
            {/* Left: Image Uploader */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>Select Image *</label>
              <div style={{ 
                border: '2px dashed var(--border-strong)', 
                borderRadius: '12px', 
                padding: '2rem', 
                textAlign: 'center',
                backgroundColor: 'var(--modal-bg-mix)',
                cursor: 'pointer',
                position: 'relative',
                height: '250px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ color: 'var(--text-62)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>📸</span>
                    <span style={{ fontSize: '1rem', fontWeight: '500' }}>Click or drag image to upload</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} required style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              </div>
            </div>

            {/* Right: Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>Caption (Optional)</label>
                <input 
                  type="text" 
                  placeholder="Describe this photo..." 
                  className="input" 
                  value={caption} 
                  onChange={(e) => setCaption(e.target.value)} 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>Link to Event (Optional)</label>
                <select 
                  className="input" 
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <option value="">-- No Event Linked --</option>
                  {events.map(ev => (
                    <option key={ev._id} value={ev._id}>{ev.title}</option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-62)', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                  Linking an image to an event allows it to show up on that specific event's page.
                </small>
              </div>
              
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btnPrimary" disabled={isSubmitting} style={{ padding: '0.8rem 2.5rem', fontSize: '1.05rem', borderRadius: '50px' }}>
                  {isSubmitting ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* Gallery Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-62)' }}>Loading gallery...</div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gap: '1.5rem', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' 
        }}>
          {images.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', backgroundColor: 'var(--field-bg)', borderRadius: '12px', border: '1px dashed var(--border-strong)' }}>
              <p style={{ color: 'var(--text-62)', fontSize: '1.1rem' }}>No images found. Upload your first photo above!</p>
            </div>
          ) : images.map(img => (
            <div key={img._id} style={{ 
              backgroundColor: 'var(--modal-bg-mix)', 
              border: '1px solid var(--border-strong)', 
              borderRadius: '16px', 
              overflow: 'hidden',
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s ease'
            }}
            className="hover-card-effect"
            >
              <div style={{ height: '180px', width: '100%', position: 'relative' }}>
                <img src={img.imageUrl} alt={img.caption || 'Gallery Image'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {/* Linked Event Badge */}
                {img.eventId && (
                  <div style={{ 
                    position: 'absolute', top: '10px', left: '10px', 
                    backgroundColor: 'var(--primary-color)', color: 'white', 
                    padding: '0.2rem 0.6rem', borderRadius: '20px', 
                    fontSize: '0.7rem', fontWeight: 'bold',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}>
                    🔗 {img.eventId.title}
                  </div>
                )}
              </div>
              
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <p style={{ fontSize: '0.9rem', margin: '0 0 1rem 0', color: img.caption ? 'var(--text)' : 'var(--text-55)', fontStyle: img.caption ? 'normal' : 'italic', flex: 1 }}>
                  {img.caption || 'No caption'}
                </p>
                
                <button 
                  onClick={() => handleDelete(img._id)} 
                  style={{ 
                    width: '100%',
                    padding: '0.5rem', 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                    color: '#ef4444', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                >
                  Delete Image
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
