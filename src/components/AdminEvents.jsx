import React, { useState, useEffect } from 'react';

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const initialFormState = {
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    venue: "Tinkerers' Lab, GECI",
    description: '',
    fullDescription: '',
    registrationUrl: '',
    customTags: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit state
  const [editingId, setEditingId] = useState(null);

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
  
  // Helper to parse time string into HH:MM for input fields
  const parseTime = (timeStr) => {
    if (!timeStr) return { startTime: '', endTime: '' };
    
    // Attempt to split by "-" or "to"
    let parts = timeStr.split('-').map(s => s.trim());
    if (parts.length !== 2) {
      parts = timeStr.split('to').map(s => s.trim());
    }
    
    if (parts.length === 2) {
      const convertTo24Hour = (time) => {
        const [timePart, modifier] = time.split(' ');
        if (!timePart || !modifier) return time;
        
        let [hours, minutes] = timePart.split(':');
        if (!minutes) minutes = '00';
        
        if (hours === '12') hours = '00';
        if (modifier.toLowerCase().includes('pm')) hours = (parseInt(hours, 10) + 12).toString();
        
        return `${hours.padStart(2, '0')}:${minutes}`;
      };
      return { startTime: convertTo24Hour(parts[0]), endTime: convertTo24Hour(parts[1]) };
    }
    
    return { startTime: '', endTime: '' };
  };

  // Helper to format HH:MM into AM/PM
  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const openEditForm = (event) => {
    // Extract times
    const { startTime, endTime } = parseTime(event.time);
    
    // Extract Date to YYYY-MM-DD
    const dateObj = new Date(event.date);
    const dateStr = !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : '';
    
    setFormData({
      title: event.title || '',
      date: dateStr,
      startTime,
      endTime,
      venue: event.venue || '',
      description: event.description || '',
      fullDescription: event.fullDescription || '',
      registrationUrl: event.registrationUrl || '',
      customTags: event.tags ? event.tags.join(', ') : ''
    });
    
    setImageFile(null); // Keep null unless they upload a new one
    setImagePreview(event.posterSrc || event.imageUrl);
    setEditingId(event._id);
    setShowAddForm(true);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancel = () => {
    setFormData(initialFormState);
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.description) {
      return alert('Please fill in all required fields');
    }
    
    if (!editingId && !imageFile) {
      return alert('Please select an image for the new event');
    }

    // Format the time string
    let finalTime = '';
    if (formData.startTime && formData.endTime) {
      finalTime = `${formatTime(formData.startTime)} - ${formatTime(formData.endTime)}`;
    }

    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/events?id=${editingId}` : '/api/events';
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        time: finalTime,
        imageBase64: imageFile // Will be null if they didn't pick a new image during edit
      };
      
      // Delete temporary fields before sending
      delete payload.startTime;
      delete payload.endTime;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        handleCancel();
        fetchEvents();
        alert(editingId ? 'Event updated successfully!' : 'Event added successfully!');
      } else {
        let errorMessage = 'Failed to save event';
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
    if (!window.confirm('Are you sure you want to delete this event? The poster image will also be permanently deleted.')) return;
    
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
          onClick={() => showAddForm ? handleCancel() : setShowAddForm(true)}
          className="btn btnPrimary"
          style={{ padding: '0.75rem 1.5rem', borderRadius: '50px', fontWeight: '600' }}
        >
          {showAddForm ? 'Cancel' : '+ Add New Event'}
        </button>
      </div>

      {/* Add/Edit Event Form (Hidden by default) */}
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
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>
            {editingId ? 'Edit Event' : 'Create Event'}
          </h3>
          <form onSubmit={handleSubmit} className="adminFormGrid">
            
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Event Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="input" placeholder="e.g. 3D Printing Workshop" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Event Date *</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="input" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Start Time</label>
                  <input type="time" name="startTime" value={formData.startTime} onChange={handleInputChange} className="input" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>End Time</label>
                  <input type="time" name="endTime" value={formData.endTime} onChange={handleInputChange} className="input" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Venue</label>
                <input type="text" name="venue" value={formData.venue} onChange={handleInputChange} className="input" placeholder="Tinkerers' Lab" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Registration URL</label>
                <input type="url" name="registrationUrl" value={formData.registrationUrl} onChange={handleInputChange} className="input" placeholder="https://forms.gle/..." />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>Custom Tags (Comma separated)</label>
                <input type="text" name="customTags" value={formData.customTags} onChange={handleInputChange} className="input" placeholder="e.g. workshop, 3d-printing" />
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
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.4rem' }}>
                  Event Poster Image {editingId ? '(Optional to change)' : '*'}
                </label>
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
                  <input type="file" accept="image/*" onChange={handleFileChange} required={!editingId} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                </div>
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" onClick={handleCancel} className="btn" style={{ padding: '0.8rem 2.5rem', fontSize: '1.05rem', borderRadius: '50px' }}>
                Cancel
              </button>
              <button type="submit" className="btn btnPrimary" disabled={isSubmitting} style={{ padding: '0.8rem 2.5rem', fontSize: '1.05rem', borderRadius: '50px' }}>
                {isSubmitting ? 'Saving...' : (editingId ? 'Update Event' : 'Publish Event')}
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
          <h2 style={{ margin: 0 }}>Saving Event...</h2>
          <p style={{ color: 'var(--text-40)' }}>Please wait while we process the details.</p>
          <style>
            {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
          </style>
        </div>
      )}

      )}

      {/* Events Search & Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Managed Events</h3>
        <input 
          type="text" 
          className="input" 
          placeholder="Search events..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '250px', padding: '0.5rem 1rem' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-62)' }}>Loading events...</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {events.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', backgroundColor: 'var(--field-bg)', borderRadius: '12px', border: '1px dashed var(--border-strong)' }}>
              <p style={{ color: 'var(--text-62)', fontSize: '1.1rem' }}>No events found. Create your first event above!</p>
            </div>
          ) : events.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || (e.tags && e.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))).length === 0 ? (
             <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-62)' }}>
              No events matched your search.
             </div>
          ) : events.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || (e.tags && e.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))).map(event => (
            <div key={event._id} style={{ 
              backgroundColor: 'var(--modal-bg-mix)', 
              border: '1px solid var(--border-strong)', 
              borderRadius: '12px', 
              overflow: 'hidden',
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            className="hover-card-effect"
            >
              <div style={{ position: 'relative', height: '140px', width: '100%' }}>
                <img src={event.posterSrc || event.imageUrl} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.75)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}>
                  {new Date(event.date).toLocaleDateString()}
                </div>
              </div>
              
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: '700', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-62)', margin: '0 0 0.8rem 0', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {event.description}
                </p>
                
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {event.tags && event.tags.slice(0,3).map((tag, i) => (
                    <span key={i} style={{ backgroundColor: 'var(--field-bg)', border: '1px solid var(--border-strong)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', color: 'var(--text-80)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      #{tag}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', gap: '0.5rem' }}>
                  <button 
                    onClick={() => openEditForm(event)}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                      color: '#3b82f6', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      transition: 'background 0.2s',
                      flex: 1
                    }}
                  >
                    Edit
                  </button>
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
                      transition: 'background 0.2s',
                      flex: 1
                    }}
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
