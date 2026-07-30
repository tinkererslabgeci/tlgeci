import React, { useState, useEffect } from 'react';
import { APPS_SCRIPT_WEB_APP_URL } from './SlotBookingPage';
import '../index.css';

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || 'admin123'; // Fallback for local testing if env is missing

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL'); // Default to ALL requests
  const [search, setSearch] = useState('');

  const [actionModal, setActionModal] = useState(null); // { type: 'APPROVE' | 'REJECT' | 'CANCEL', bookingId: string }
  const [adminName, setAdminName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Generate random 4-digit CAPTCHA code
  const generateCaptcha = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaCode(code);
    setCaptchaInput('');
  };

  // Open modal handler with fresh CAPTCHA code
  const openActionModal = (type, bookingId) => {
    setActionModal({ type, bookingId });
    generateCaptcha();
    setOpenMenuId(null);
  };

  // Login handler
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASS) {
      setIsAuthenticated(true);
      fetchBookings();
    } else {
      setError('Incorrect password');
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    setOpenMenuId(null);
    try {
      const res = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?action=getAll`);
      const data = await res.json();
      if (data.ok) {
        // Reverse so newest is first
        setBookings(data.bookings.reverse());
      } else {
        setError(data.error || 'Failed to fetch bookings');
      }
    } catch (err) {
      setError('Network error fetching bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!adminName.trim()) {
      alert("Please enter your name");
      return;
    }
    if ((actionModal.type === 'REJECT' || actionModal.type === 'CANCEL') && !rejectionReason.trim()) {
      alert("Please enter a reason for this action");
      return;
    }
    if (captchaInput.trim() !== captchaCode) {
      alert(`Security CAPTCHA verification failed!\nPlease enter the exact 4-digit code shown (${captchaCode}).`);
      return;
    }

    setActionLoading(true);
    try {
      const finalAction = actionModal.type === 'APPROVE' ? 'APPROVED' : actionModal.type === 'REJECT' ? 'REJECTED' : 'CANCELLED';
      const res = await fetch(APPS_SCRIPT_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          adminAction: true,
          action: actionModal.type,
          bookingId: actionModal.bookingId,
          adminName: adminName.trim(),
          rejectionReason: (actionModal.type === 'REJECT' || actionModal.type === 'CANCEL') ? rejectionReason.trim() : ''
        }),
      });
      const data = await res.json();

      if (data.ok) {
        // Update local state
        setBookings(prev => prev.map(b => {
          if (b.id === actionModal.bookingId) {
            return {
              ...b,
              status: finalAction,
              approvedBy: adminName.trim(),
              rejectionReason: (actionModal.type === 'REJECT' || actionModal.type === 'CANCEL') ? rejectionReason.trim() : b.rejectionReason
            };
          }
          return b;
        }));
        setActionModal(null);
        setRejectionReason('');
        setOpenMenuId(null);
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      alert('Network error submitting action');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    // Filter by status
    if (filter !== 'ALL') {
      const s = (b.status || 'PENDING').toUpperCase();
      if (filter === 'APPROVED' && (s !== 'APPROVED' && s !== 'APPROVE')) return false;
      if (filter === 'REJECTED' && (s !== 'REJECTED' && s !== 'REJECT')) return false;
      if (filter === 'CANCELLED' && (s !== 'CANCELLED' && s !== 'CANCEL')) return false;
      if (filter === 'PENDING' && (s !== 'PENDING')) return false;
    }

    // Search term
    if (search) {
      const term = search.toLowerCase();
      return (
        b.name?.toLowerCase().includes(term) ||
        b.email?.toLowerCase().includes(term) ||
        b.purpose?.toLowerCase().includes(term) ||
        b.date?.includes(term)
      );
    }
    return true;
  });

  if (!isAuthenticated) {
    return (
      <div className="sectionStack" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <form
          onSubmit={handleLogin}
          className="card"
          style={{
            padding: '2.2rem',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}
        >
          <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.4rem', fontWeight: '700' }}>Admin Login</h2>
          {error && <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontWeight: '600' }}>{error}</div>}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.95rem' }}>Password</label>
            <input
              type="password"
              className="input"
              style={{ width: '100%' }}
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn btnPrimary"
            style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="sectionStack">
      <header className="pageHeader">
        <h1 className="pageTitle">Admin Dashboard</h1>
        <p className="pageSubtitle">Manage Slot Bookings & Approvals</p>
      </header>

      <section className="card" style={{ padding: '1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <select className="input" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <input
              type="text"
              className="input"
              style={{ width: '250px' }}
              placeholder="Search by name, email, date..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button className="btn" onClick={fetchBookings} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-62)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Name / Contact</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Date & Time</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Purpose</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Equipments</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-55)' }}>
                    {loading ? 'Loading...' : 'No bookings found.'}
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => {
                  const s = String(b.status || 'PENDING').trim().toUpperCase();
                  const isApproved = s === 'APPROVED' || s === 'APPROVE';
                  const isRejected = s === 'REJECTED' || s === 'REJECT';
                  const isCancelled = s === 'CANCELLED' || s === 'CANCEL';
                  const isPending = !isApproved && !isRejected && !isCancelled;

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          backgroundColor: isApproved ? 'rgba(34, 197, 94, 0.15)' : isRejected ? 'rgba(239, 68, 68, 0.15)' : isCancelled ? 'rgba(249, 115, 22, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: isApproved ? '#16a34a' : isRejected ? '#dc2626' : isCancelled ? '#ea580c' : '#ca8a04',
                          border: isApproved ? '1px solid rgba(34, 197, 94, 0.3)' : isRejected ? '1px solid rgba(239, 68, 68, 0.3)' : isCancelled ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)'
                        }}>
                          {isApproved ? '✓ APPROVED' : isRejected ? '✕ REJECTED' : isCancelled ? '⊘ CANCELLED' : '⏳ PENDING'}
                        </span>
                        {b.approvedBy && <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: 'var(--text-62)' }}>By: {b.approvedBy}</div>}
                        {b.rejectionReason && <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: (isRejected ? '#dc2626' : '#ea580c') }}>Reason: {b.rejectionReason}</div>}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ fontWeight: 'bold' }}>{b.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-80)' }}>{b.email}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-62)' }}>{b.department}, Sem {b.semester}</div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem' }}>
                        <div style={{ fontWeight: 'bold' }}>{b.date}</div>
                        <div>{b.timeFrom} - {b.timeTo}</div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', maxWidth: '200px', fontSize: '0.9rem' }}>
                        {b.purpose}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', maxWidth: '250px', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                        {b.totalText}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                          {/* PENDING requests: Approve & Reject buttons */}
                          {isPending && (
                            <>
                              <button
                                onClick={() => openActionModal('APPROVE', b.id)}
                                style={{ padding: '0.4rem 0.8rem', background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', border: '1px solid #22c55e', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                                Approve
                              </button>
                              <button
                                onClick={() => openActionModal('REJECT', b.id)}
                                style={{ padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                                Reject
                              </button>
                            </>
                          )}

                          {/* APPROVED / REJECTED / CANCELLED: 3-dots button + Dropdown Menu */}
                          {!isPending && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === b.id ? null : b.id);
                                }}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  background: 'var(--field-bg)',
                                  color: 'var(--text)',
                                  border: '1px solid var(--border-strong)',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '1.1rem',
                                  lineHeight: 1
                                }}
                                title="Advanced Options"
                              >
                                ⋮
                              </button>

                              {/* Popup Dropdown Menu */}
                              {openMenuId === b.id && (
                                <div
                                  onClick={e => e.stopPropagation()}
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '100%',
                                    marginTop: '0.4rem',
                                    backgroundColor: 'var(--modal-bg-mix, #ffffff)',
                                    color: 'var(--text, #0f172a)',
                                    border: '1px solid var(--border-strong, #cbd5e1)',
                                    borderRadius: '10px',
                                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.22)',
                                    zIndex: 999,
                                    minWidth: '220px',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {isApproved && (
                                    <button
                                      onClick={() => openActionModal('CANCEL', b.id)}
                                      style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem',
                                        textAlign: 'left',
                                        background: 'none',
                                        border: 'none',
                                        color: '#dc2626',
                                        cursor: 'pointer',
                                        fontSize: '0.88rem',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                      }}
                                    >
                                      ✕ Cancel / Reject Approval
                                    </button>
                                  )}

                                  {(isRejected || isCancelled) && (
                                    <button
                                      onClick={() => openActionModal('APPROVE', b.id)}
                                      style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem',
                                        textAlign: 'left',
                                        background: 'none',
                                        border: 'none',
                                        color: '#16a34a',
                                        cursor: 'pointer',
                                        fontSize: '0.88rem',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                      }}
                                    >
                                      ✓ Re-Approve Request
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Action Modal with Security CAPTCHA */}
      {actionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999, padding: '1.5rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: 'var(--modal-bg-mix, #ffffff)',
            color: 'var(--text, #0f172a)',
            border: '1px solid var(--border-strong)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            padding: '2.2rem'
          }}>
            <h2 style={{
              marginBottom: '1.2rem',
              fontSize: '1.4rem',
              fontWeight: '700',
              color: actionModal.type === 'APPROVE' ? '#16a34a' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>
                {actionModal.type === 'APPROVE' ? '✓ Approve Booking' : actionModal.type === 'CANCEL' ? '✕ Cancel Approved Request' : '✕ Reject Booking'}
              </span>
            </h2>

            <form onSubmit={handleActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.95rem', color: 'var(--text, #0f172a)' }}>
                  Admin Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--field-bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--border-strong)'
                  }}
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {(actionModal.type === 'REJECT' || actionModal.type === 'CANCEL') && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.95rem', color: 'var(--text, #0f172a)' }}>
                    {actionModal.type === 'CANCEL' ? 'Reason for Cancellation (Apology email sent to student)' : 'Reason for Rejection'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    className="input"
                    style={{
                      width: '100%',
                      resize: 'vertical',
                      backgroundColor: 'var(--field-bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--border-strong)'
                    }}
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder={actionModal.type === 'CANCEL' ? 'e.g. Unexpected lab maintenance or scheduling conflict. Apology message will be emailed.' : 'State reason to notify student'}
                    rows={3}
                    required
                  />
                </div>
              )}

              {/* Security CAPTCHA Verification */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--field-bg)',
                borderRadius: '12px',
                border: '1px solid var(--border-strong)'
              }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text, #0f172a)' }}>
                  Security Verification (CAPTCHA) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.6rem' }}>
                  <div style={{
                    padding: '0.4rem 0.9rem',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    fontSize: '1.25rem',
                    fontWeight: '800',
                    letterSpacing: '4px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                    userSelect: 'none'
                  }}>
                    {captchaCode}
                  </div>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '0.82rem', fontWeight: '600' }}
                  >
                    ↻ Refresh Code
                  </button>
                </div>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--modal-bg-mix, #ffffff)',
                    color: 'var(--text)',
                    border: '1px solid var(--border-strong)',
                    fontWeight: '600',
                    letterSpacing: '1px'
                  }}
                  value={captchaInput}
                  onChange={e => setCaptchaInput(e.target.value)}
                  placeholder="Enter security code"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--field-bg)',
                    color: 'var(--text, #0f172a)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActionModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    backgroundColor: actionModal.type === 'APPROVE' ? '#16a34a' : '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: actionModal.type === 'APPROVE' ? '0 4px 14px rgba(22, 163, 74, 0.4)' : '0 4px 14px rgba(220, 38, 38, 0.4)'
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Submitting...' : actionModal.type === 'APPROVE' ? 'Confirm Approval' : actionModal.type === 'CANCEL' ? 'Confirm Cancellation' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
