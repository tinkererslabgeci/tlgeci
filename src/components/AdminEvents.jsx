import React, { useState, useEffect } from 'react';

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    venue: "Tinkerers' Lab, GECI",
    description: '',
    fullDescription: '',
    registrationUrl: '',
    customTags: ''
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch events', err);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (!formData.title || !formData.date || !formData.description || !imageFile) {
      return alert('Please fill in all required fields and select an image');
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          imageBase64: imageFile,
        })
      });

      if (res.ok) {
        setFormData({
          title: '', date: '', time: '', venue: "Tinkerers' Lab, GECI",
          description: '', fullDescription: '', registrationUrl: '', customTags: ''
        });
        setImageFile(null);
        setImagePreview(null);
        e.target.reset();
        setShowAddForm(false);
        fetchEvents();
        alert('Event added successfully!');
      } else {
        let errorMessage = 'Failed to add event';
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch (e) {
          errorMessage = `Server Error (${res.status}): ${res.statusText}`;
        }
        alert(errorMessage);
      }
    } catch (err) {
      console.error(err);
      alert('Network error: ' + err.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchEvents();
      } else {
        alert('Failed to delete event');
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
          <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0 }}>Event Management</h2>
          <p style={{ color: 'var(--text-62)', margin: '0.25rem 0 0 0' }}>Create and manage lab events, workshops, and competitions.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btnPrimary"
          style={{ padding: '0.75rem 1.5rem', borderRadius: '50px', fontWeight: '600' }}
        >
          {showAddForm ? 'Cancel' : '+ Add New Event'}
        </button>
      </div>

      {/* Add New Event Form (Hidden by default) */}
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
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Create Event</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Event Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="input" placeholder="e.g. 3D Printing Workshop" required style={{ width: '100%' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Event Date *</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="input" required style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Time</label>
                  <input type="text" name="time" value={formData.time} onChange={handleInputChange} className="input" placeholder="e.g. 4:30 PM - 6:30 PM" style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Venue</label>
                  <input type="text" name="venue" value={formData.venue} onChange={handleInputChange} className="input" placeholder="Tinkerers' Lab" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Registration URL</label>
                <input type="url" name="registrationUrl" value={formData.registrationUrl} onChange={handleInputChange} className="input" placeholder="https://forms.gle/..." style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Custom Tags (Comma separated)</label>
                <input type="text" name="customTags" value={formData.customTags} onChange={handleInputChange} className="input" placeholder="e.g. workshop, 3d-printing, hardware" style={{ width: '100%' }} />
                <small style={{ color: 'var(--text-62)', fontSize: '0.8rem' }}>Leave blank to auto-generate tags from title and description.</small>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Short Description * (For event cards)</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} className="input" rows={3} placeholder="A brief 1-2 sentence summary..." required style={{ width: '100%', resize: 'vertical' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Full Description (For event detail page)</label>
                <textarea name="fullDescription" value={formData.fullDescription} onChange={handleInputChange} className="input" rows={5} placeholder="Detailed information, schedules, prerequisites..." style={{ width: '100%', resize: 'vertical' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Event Poster Image *</label>
                <div style={{ 
                  border: '2px dashed var(--border-strong)', 
                  borderRadius: '12px', 
                  padding: '1.5rem', 
                  textAlign: 'center',
                  backgroundColor: 'var(--modal-bg-mix)',
                  cursor: 'pointer',
                  position: 'relative'
                }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ maxHeight: '150px', borderRadius: '8px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ color: 'var(--text-62)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '2rem' }}>📸</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Click or drag image to upload</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} required style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                </div>
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btnPrimary" disabled={isSubmitting} style={{ padding: '0.8rem 2.5rem', fontSize: '1.05rem', borderRadius: '50px' }}>
                {isSubmitting ? 'Creating Event...' : 'Publish Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading Overlay */}
      {isSubmitting && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999, color: 'white'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'spin 2s linear infinite' }}>⏳</div>
          <h2 style={{ margin: 0 }}>Publishing Event...</h2>
          <p style={{ color: 'var(--text-40)' }}>Please wait while we upload the image and save the details.</p>
          <style>
            {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
          </style>
        </div>
      )}

      {/* Events Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-62)' }}>Loading events...</div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {events.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', backgroundColor: 'var(--field-bg)', borderRadius: '12px', border: '1px dashed var(--border-strong)' }}>
              <p style={{ color: 'var(--text-62)', fontSize: '1.1rem' }}>No events found. Create your first event above!</p>
            </div>
          ) : events.map(event => (
            <div key={event._id} style={{ 
              backgroundColor: 'var(--modal-bg-mix)', 
              border: '1px solid var(--border-strong)', 
              borderRadius: '16px', 
              overflow: 'hidden',
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            className="hover-card-effect"
            >
              <div style={{ position: 'relative', height: '180px', width: '100%' }}>
                <img src={event.posterSrc || event.imageUrl} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}>
                  {new Date(event.date).toLocaleDateString()}
                </div>
              </div>
              
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: '700', lineHeight: 1.3 }}>{event.title}</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-62)', margin: '0 0 1rem 0', flex: 1 }}>
                  {event.description.length > 80 ? event.description.substring(0, 80) + '...' : event.description}
                </p>
                
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                  {event.tags && event.tags.slice(0,3).map((tag, i) => (
                    <span key={i} style={{ backgroundColor: 'var(--field-bg)', border: '1px solid var(--border-strong)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-80)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      #{tag}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-55)' }}>ID: {event.slug}</span>
                  <button 
                    onClick={() => handleDelete(event._id)} 
                    style={{ 
                      padding: '0.5rem 1rem', 
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
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
