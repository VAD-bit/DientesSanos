import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileCheck, Star, Clock, Eye, AlertTriangle, Check, X, PenTool, Scissors, Droplets, Sparkles, User, ChevronRight, ChevronDown } from 'lucide-react';
import { publicService } from '../services/publicService';
import Skeleton from '../components/Skeleton';
import pandaLogo from '../../assets/panda_logo_nobg.png';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClientAppointments() {
  const [activeTab, setActiveTab] = useState('citas');
  const [client, setClient] = useState(() => JSON.parse(localStorage.getItem('panda_public_client') || 'null'));
  const [appointments, setAppointments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [loading, setLoading] = useState(true);
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [consentSaving, setConsentSaving] = useState(false);

  const [ratingModal, setRatingModal] = useState(null);
  const [ratings, setRatings] = useState({ rapidez: 0, limpieza: 0, habilidad: 0 });
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratedAppointments, setRatedAppointments] = useState({});
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const hasDrawn = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const clientData = JSON.parse(localStorage.getItem('panda_public_client') || 'null');
    if (!clientData) { navigate('/login'); return; }
    setClient(clientData);
    loadData(clientData.id);
  }, [navigate]);

  const loadData = async (clientId) => {
    try {
      const appts = await publicService.getClientAppointments(clientId);
      setAppointments(appts);

      const completedApts = (appts || []).filter(apt => apt.status === 'Completado' || apt.status === 'Pagado');
      const reviewResults = await Promise.all(
        completedApts.map(apt =>
          publicService.hasClientReviewed(apt.id)
            .then(reviewed => ({ id: apt.id, reviewed }))
            .catch(() => ({ id: apt.id, reviewed: false }))
        )
      );
      const rated = {};
      reviewResults.forEach(item => {
        if (item.reviewed) rated[item.id] = true;
      });
      setRatedAppointments(rated);
    } catch (e) { console.error('Error loading appointments data:', e); }
    finally { setLoading(false); }
  };

  const validAppointments = (appointments || []).sort((a,b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

  // Apple UX logic: Find the next upcoming appointment to make it a Hero Card
  // We sort ascending to find the closest future date
  const upcomingAppointments = [...validAppointments].filter(a => a.status === 'Agendado').sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const nextAppointment = upcomingAppointments[0];
  
  const historyAppointments = validAppointments.filter(a => a.id !== nextAppointment?.id);

  // Walk-in visits ("En Silla") never had scheduled_at set - fall back to
  // when the visit was actually completed/created instead of showing "-".
  const getApptDate = (apt) => {
    const raw = apt?.scheduled_at || apt?.completed_at || apt?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const totalPages = Math.ceil(historyAppointments.length / ITEMS_PER_PAGE) || 1;
  const paginatedAppointments = historyAppointments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const tattooAppointments = validAppointments.filter(a => a.tattoo_data && !a.status?.toLowerCase().includes('cancelad'));
  


  const pendingConsent = tattooAppointments.filter(a => !a.tattoo_data?.consent_signed);
  const signedConsent = tattooAppointments.filter(a => a.tattoo_data?.consent_signed);

  const getServiceIcon = (serviceName, category) => {
    const name = (serviceName || '').toLowerCase();
    const cat = (category || '').toLowerCase();
    if (cat.includes('tatuaj') || name.includes('tatuaj')) return <Sparkles size={16} />;
    if (name.includes('lavado') || cat.includes('lavado')) return <Droplets size={16} />;
    return <Scissors size={16} />;
  };

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(15,23,42,0.02)';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  useEffect(() => {
    if (selectedConsent && !selectedConsent.tattoo_data?.consent_signed) {
      setTimeout(() => { initCanvas(); hasDrawn.current = false; }, 100);
    }
  }, [selectedConsent, initCanvas]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => { e.preventDefault(); isDrawing.current = true; lastPoint.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath(); ctx.moveTo(lastPoint.current.x, lastPoint.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPoint.current = pos; hasDrawn.current = true;
  };
  const stopDraw = () => { isDrawing.current = false; };
  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = 'rgba(15,23,42,0.02)'; ctx.fillRect(0, 0, rect.width, rect.height);
    hasDrawn.current = false;
  };

  const saveConsent = async () => {
    if (!selectedConsent || !hasDrawn.current) return;
    setConsentSaving(true);
    try {
      const signature = canvasRef.current.toDataURL('image/png');
      const updatedData = { ...selectedConsent.tattoo_data, consent_signed: true, consent_signature: signature, consent_date: new Date().toISOString(), consent_client_name: client?.name || '' };
      
      if (selectedConsent.id === 'demo-consent-123') {
        // Bypass API for the demo to prevent errors
        setSelectedConsent({ ...selectedConsent, _viewOnly: true, tattoo_data: updatedData });
        setConsentSaving(false);
        return;
      }

      await publicService.updateAppointmentTattooConsent(selectedConsent.id, updatedData);
      setAppointments(prev => prev.map(a => a.id === selectedConsent.id ? { ...a, tattoo_data: updatedData } : a));
      setSelectedConsent(null);
    } catch (err) { console.error('Error saving consent:', err); }
    finally { setConsentSaving(false); }
  };

  const submitRating = async () => {
    if (!ratingModal || ratings.rapidez === 0 || ratings.limpieza === 0 || ratings.habilidad === 0) return;
    setRatingSaving(true);
    try {
      await publicService.submitStaffReview({
        staff_id: ratingModal.staff_id,
        client_id: client?.id,
        appointment_id: ratingModal.id,
        rapidez: ratings.rapidez,
        limpieza: ratings.limpieza,
        habilidad: ratings.habilidad,
        comment: ratingComment || null
      });
      setRatedAppointments(prev => ({ ...prev, [ratingModal.id]: true }));
      setRatingModal(null);
      setRatings({ rapidez: 0, limpieza: 0, habilidad: 0 });
      setRatingComment('');
    } catch (e) {
      console.error('Error submitting rating:', e);
    } finally {
      setRatingSaving(false);
    }
  };

  const StarRating = ({ label, icon: Icon, value, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
        <Icon size={14} color="#111111" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} onClick={() => onChange(star)} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', transition: 'transform 0.2s', transform: star <= value ? 'scale(1.15)' : 'scale(1)' }}>
            <Star
              size={22}
              fill={star <= value ? '#111111' : 'none'}
              stroke={star <= value ? '#111111' : '#cbd5e1'}
              style={{ transition: 'all 0.3s', filter: star <= value ? 'drop-shadow(0 0 8px rgba(17,17,17,0.5))' : 'none' }}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const getStatusColor = (status, isCanceled) => {
    if (isCanceled) return 'bg-[#f1f5f9] text-[#94a3b8] border-[#e2e8f0]';
    if (status === 'Agendado') return 'bg-[#111111]/10 text-[#111111] border-[#111111]/20';
    if (status === 'Completado') return 'bg-green-500/10 text-green-500 border-green-500/20';
    return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  };

  return (
    <div className="ca-page animate-fade-in-up" style={{ animationDelay: '0ms' }}>
      <div className="tab-intro-container animate-fade-in-up">
        <div className="tab-intro-eyebrow">
          <Calendar size={12} color="#000" />
          <span>Gestión de Citas</span>
        </div>
        <h1 className="tab-intro-title">Mis Citas</h1>
        <p className="tab-intro-subtitle">Revisa tu historial de tratamientos, gestiona tus próximas visitas y firma tus consentimientos dentales.</p>
      </div>

      {/* ── SEGMENTED CONTROL TABS ── */}
      <div className="ca-tabs">
        {[
          { id: 'citas', label: 'Historial', icon: Calendar },
          { id: 'consent', label: 'Consentimientos', icon: FileCheck, badge: pendingConsent.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`ca-tab ${isActive ? 'active' : ''}`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
              {tab.badge > 0 && <span className="ca-tab-badge">{tab.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* ── CITAS TAB ── */}
      {activeTab === 'citas' && (
        <div className="ca-section">

          {loading && (
            <>
              <Skeleton className="ca-skeleton-hero" style={{ width: '100%', height: 180, borderRadius: 20 }} />
              <Skeleton className="ca-skeleton-row" style={{ width: '100%', height: 72, borderRadius: 16, marginTop: 16 }} />
              <Skeleton className="ca-skeleton-row" style={{ width: '100%', height: 72, borderRadius: 16, marginTop: 8 }} />
            </>
          )}

          {/* HERO CARD: NEXT APPOINTMENT */}
          {!loading && nextAppointment && (
            <div className="ca-hero-card">
              <div className="ca-hero-stub">
                <span className="ca-hero-month">
                  {new Date(nextAppointment.scheduled_at).toLocaleString('es', { month: 'short' })}
                </span>
                <span className="ca-hero-day">
                  {new Date(nextAppointment.scheduled_at).getDate()}
                </span>
                <span className="ca-hero-time">
                  {new Date(nextAppointment.scheduled_at).toLocaleString('es', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
              <div className="ca-hero-info">
                <div className="ca-hero-badge">
                  <span className="ca-badge-dot" />
                  Tu próxima cita
                </div>
                <h3 className="ca-hero-service">{nextAppointment.services?.name || 'Servicio'}</h3>
                <div className="ca-hero-barber">
                  {nextAppointment.staff?.image_url ? (
                    <img src={nextAppointment.staff.image_url} alt="" className="ca-hero-barber-img" />
                  ) : (
                    <div className="ca-hero-barber-placeholder"><User size={14} /></div>
                  )}
                  <span>con <strong>{nextAppointment.staff?.name || 'Tu Especialista'}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY SECTION */}
          {!loading && historyAppointments.length > 0 && (
            <div className="ca-history">
              <h3 className="ca-history-title">Historial de Citas</h3>
              <div className="ca-history-list">
                {paginatedAppointments.map((apt, idx) => {
                  const isCanceled = apt.status?.toLowerCase().includes('cancelad');
                  return (
                    <div key={apt.id} className={`ca-history-item ${isCanceled ? 'canceled' : ''}`} style={{ animationDelay: `${idx * 60}ms` }}>
                      <div className="ca-hi-date">
                        <span className="ca-hi-month">{getApptDate(apt) ? getApptDate(apt).toLocaleString('es', { month: 'short' }) : '-'}</span>
                        <span className="ca-hi-day">{getApptDate(apt) ? getApptDate(apt).getDate() : '-'}</span>
                      </div>
                      <div className="ca-hi-info">
                        <h4 className={`ca-hi-service ${isCanceled ? 'striked' : ''}`}>{apt.services?.name || 'Servicio'}</h4>
                        <div className="ca-hi-meta">
                          {apt.staff?.image_url ? (
                            <img src={apt.staff.image_url} alt="" className="ca-hi-avatar" />
                          ) : (
                            <User size={12} color="var(--champagne)" />
                          )}
                          <span>{apt.staff?.name || 'Especialista'}</span>
                          <span className="ca-hi-dot" />
                          <Clock size={11} color="#94a3b8" />
                          <span>{apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleString('es', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</span>
                        </div>
                      </div>
                      <div className={`ca-hi-status ${isCanceled ? 'st-canceled' : apt.status === 'Agendado' ? 'st-pending' : 'st-done'}`}>
                        {apt.status}
                      </div>
                      {/* Rating button */}
                      {(apt.status === 'Completado' || apt.status === 'Pagado') && apt.staff?.name && (
                        <div className="ca-hi-action">
                          {ratedAppointments[apt.id] ? (
                            <div className="ca-rated"><Check size={12} /> <span>Calificado</span></div>
                          ) : (
                            <button onClick={() => { setRatingModal(apt); setRatings({ rapidez: 0, limpieza: 0, habilidad: 0 }); setRatingComment(''); }} className="ca-rate-btn">
                              <Star size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="ca-pagination">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="ca-page-btn">Anterior</button>
                  <span className="ca-page-info">Página {currentPage} de {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="ca-page-btn">Siguiente</button>
                </div>
              )}
            </div>
          )}

          {!loading && validAppointments.length === 0 && (
            <div className="ca-empty">
              <Calendar size={40} color="#cbd5e1" />
              <p className="ca-empty-title">Sin citas aún</p>
              <p className="ca-empty-sub">Tus citas aparecerán aquí cuando reserves un servicio.</p>
            </div>
          )}
        </div>
      )}

      {/* ── CONSENT TAB ── */}
      {activeTab === 'consent' && (
        <div className="ca-section">
          {tattooAppointments.length === 0 ? (
            <div className="ca-empty">
              <FileCheck size={40} color="#cbd5e1" />
              <p className="ca-empty-title">Sin consentimientos pendientes</p>
              <p className="ca-empty-sub">El consentimiento aparecerá cuando agendes un tratamiento.</p>
            </div>
          ) : (
            <>
              {pendingConsent.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <div className="ca-consent-label">
                    <span className="ca-consent-ping" />
                    <h3>Acción Requerida ({pendingConsent.length})</h3>
                  </div>
                  <div className="ca-consent-grid">
                    {pendingConsent.map((apt, idx) => (
                      <div key={apt.id} onClick={() => setSelectedConsent(apt)} className="ca-consent-card pending" style={{ animationDelay: `${idx * 60}ms` }}>
                        <div className="ca-cc-top">
                          <div>
                            <span className="ca-cc-badge pending"><AlertTriangle size={10} /> Pendiente de Firma</span>
                            <h4 className="ca-cc-service">{apt.services?.name || 'Tratamiento Dental'}</h4>
                            <div className="ca-cc-barber">
                              {apt.staff?.image_url ? (
                                <img src={apt.staff.image_url} alt="" className="ca-cc-avatar" />
                              ) : (
                                <div className="ca-cc-avatar-ph"><User size={10} /></div>
                              )}
                              <span>con {apt.staff?.name}</span>
                            </div>
                          </div>
                          <div className="ca-cc-icon pending"><PenTool size={16} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {signedConsent.length > 0 && (
                <div>
                  <div className="ca-consent-label signed">
                    <Check size={12} color="#22c55e" />
                    <h3>Documentos Firmados ({signedConsent.length})</h3>
                  </div>
                  <div className="ca-consent-grid">
                    {signedConsent.map((apt, idx) => (
                      <div key={apt.id} onClick={() => setSelectedConsent({ ...apt, _viewOnly: true })} className="ca-consent-card signed" style={{ animationDelay: `${idx * 60}ms` }}>
                        <div className="ca-cc-row">
                          <div>
                            <h4 className="ca-cc-service small">{apt.services?.name}</h4>
                            <div className="ca-cc-barber">
                              {apt.staff?.image_url ? (
                                <img src={apt.staff.image_url} alt="" className="ca-cc-avatar" />
                              ) : (
                                <div className="ca-cc-avatar-ph"><User size={8} /></div>
                              )}
                              <span>con {apt.staff?.name}</span>
                            </div>
                          </div>
                          <div className="ca-cc-view-btn"><Eye size={12} /> Ver</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── CONSENT MODAL ── */}
      <AnimatePresence>
      {selectedConsent && (() => {
        const isViewOnly = selectedConsent._viewOnly;
        return (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="ca-modal-overlay"
            onClick={() => !consentSaving && setSelectedConsent(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
              className="ca-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="ca-modal-header">
                <div>
                  <h2>{isViewOnly ? 'Contrato Firmado' : 'Consentimiento'}</h2>
                  {!isViewOnly && (
                    <button onClick={() => document.getElementById('signature-section')?.scrollIntoView({ behavior: 'smooth' })} className="ca-modal-goto">
                      Ir a firmar <ChevronDown size={12} />
                    </button>
                  )}
                </div>
                {!consentSaving && (
                  <button onClick={() => setSelectedConsent(null)} className="ca-modal-close"><X size={16} /></button>
                )}
              </div>

              <div className="ca-modal-body">
                <div className="ca-modal-legal-header">
                  <p className="ca-ml-brand">CENTRO ODONTOLÓGICO DIENTES SANOS</p>
                  <p className="ca-ml-title">Consentimiento Informado de Tratamiento Dental</p>
                  <p className="ca-ml-subtitle">Para procedimientos odontológicos</p>
                </div>

                {[
                  { title: '1. DECLARACIÓN', text: 'Declaro que soy mayor de edad y acepto de forma voluntaria el procedimiento odontológico propuesto por Centro Odontológico Dientes Sanos. Comprendo que el tratamiento implica la intervención sobre tejidos dentales y tejidos blandos de la cavidad oral mediante instrumentales esterilizados y materiales biocompatibles, y que conlleva riesgos inherentemente asociados.' },
                  { title: '2. RIESGOS ACEPTADOS', text: 'Acepto que los riesgos del procedimiento incluyen: dolor y molestias postoperatorias, sangrado en la zona tratada, hinchazón e inflamación temporal, reacciones alérgicas o adversas a anestésicos, medicamentos o materiales de restauración utilizados, infección, sensibilidad dental prolongada y posibles complicaciones relacionadas con mi condición de salud individual.' },
                  { title: '3. CUIDADOS POSTERIORES', text: 'Me comprometo a seguir rigurosamente las indicaciones de cuidado posterior proporcionadas por el especialista, incluyendo la higiene oral, la alimentación, la toma de medicamentos indicados y la asistencia a los controles y citas de seguimiento durante todo el proceso de recuperación.' },
                  { title: '4. USO DE IMAGEN', text: 'Autorizo de forma voluntaria a Centro Odontológico Dientes Sanos a tomar fotografías y/o videos del procedimiento y del resultado final del tratamiento, para su uso exclusivo con fines promocionales en redes sociales, página web y plataformas digitales de la clínica.' },
                  { title: '5. RESPONSABILIDAD', text: 'Declaro que no estoy bajo los efectos de alcohol, drogas o sustancias que puedan afectar mi juicio. Asumo plena responsabilidad sobre la decisión de realizarme el tratamiento y libero a Centro Odontológico Dientes Sanos de cualquier responsabilidad por complicaciones derivadas de mi incumplimiento de los cuidados posteriores.' },
                ].map((section, i) => (
                  <div key={i} className="ca-ml-section">
                    <p className="ca-ml-sec-title">{section.title}</p>
                    <p className="ca-ml-sec-text">{section.text}</p>
                  </div>
                ))}
              </div>

              {!isViewOnly ? (
                <div id="signature-section" className="ca-modal-sign">
                  <div className="ca-sign-header">
                    <span><PenTool size={12} /> Dibuja tu firma aquí</span>
                    <button onClick={clearCanvas} disabled={consentSaving} className="ca-sign-clear">Limpiar</button>
                  </div>
                  <div className="ca-sign-canvas-wrap">
                    <canvas ref={canvasRef} className="ca-sign-canvas"
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                  </div>
                  <button onClick={saveConsent} disabled={consentSaving} className="ca-sign-submit">
                    <Check size={16} /> {consentSaving ? 'Guardando...' : 'Guardar y Confirmar'}
                  </button>
                </div>
              ) : (
                <div className="ca-modal-signed">
                  <div className="ca-signed-badge"><FileCheck size={24} color="#22c55e" /></div>
                  <p className="ca-signed-text">Documento firmado exitosamente</p>
                  {selectedConsent.tattoo_data?.consent_date && (
                    <p className="ca-signed-date">El {new Date(selectedConsent.tattoo_data.consent_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  )}
                  {selectedConsent.tattoo_data?.consent_signature && (
                    <div className="ca-signed-sig-wrap">
                      <img src={selectedConsent.tattoo_data.consent_signature} alt="Firma" className="ca-signed-sig-img" />
                      {selectedConsent.tattoo_data.consent_client_name && (
                        <p className="ca-signed-name">{selectedConsent.tattoo_data.consent_client_name}</p>
                      )}
                    </div>
                  )}
                  <button onClick={() => setSelectedConsent(null)} className="ca-signed-close">Cerrar Documento</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        );
      })()}
      </AnimatePresence>

      {/* ── RATING MODAL ── */}
      {ratingModal && (
        <div className="ca-modal-overlay" onClick={() => setRatingModal(null)}>
          <div className="ca-modal ca-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2>Calificar Servicio</h2>
              <button onClick={() => setRatingModal(null)} className="ca-modal-close"><X size={16} /></button>
            </div>
            <div style={{ padding: '8px 0 24px' }}>
              <StarRating label="Rapidez" icon={Sparkles} value={ratings.rapidez} onChange={v => setRatings(p => ({ ...p, rapidez: v }))} />
              <StarRating label="Limpieza" icon={Star} value={ratings.limpieza} onChange={v => setRatings(p => ({ ...p, limpieza: v }))} />
              <StarRating label="Habilidad" icon={Scissors} value={ratings.habilidad} onChange={v => setRatings(p => ({ ...p, habilidad: v }))} />
            </div>
            <button
              onClick={submitRating}
              disabled={ratingSaving || ratings.rapidez === 0 || ratings.limpieza === 0 || ratings.habilidad === 0}
              className="ca-sign-submit"
            >
              <Check size={16} /> {ratingSaving ? 'Enviando...' : 'Enviar Calificación'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .ca-page {
          max-width: 1080px;
          margin: 0 auto;
          padding: 24px 16px 80px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .ca-page-title {
          font-size: 24px;
          font-weight: 800;
          color: #111111;
          letter-spacing: -0.5px;
          margin: 0;
        }

        /* ── TABS ── */
        .ca-tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 14px;
        }
        .ca-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
        }
        .ca-tab:hover { color: #111111; }
        .ca-tab.active {
          background: var(--champagne);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(17,17,17,0.3);
        }
        .ca-tab-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          font-size: 9px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
        }

        .ca-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: caFadeIn 0.3s ease;
        }
        @keyframes caFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── HERO CARD ── */
        .ca-hero-card {
          display: flex;
          border-radius: 20px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          box-shadow: 0 16px 40px rgba(0,0,0,0.10);
          animation: caFadeIn 0.4s ease;
        }
        .ca-hero-stub {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          min-width: 100px;
          background: rgba(17,17,17,0.08);
          border-right: 1px dashed rgba(15,23,42,0.15);
          gap: 4px;
        }
        .ca-hero-month {
          font-size: 10px;
          font-weight: 800;
          color: var(--champagne);
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .ca-hero-day {
          font-size: 40px;
          font-weight: 800;
          color: #111111;
          line-height: 1;
          letter-spacing: -2px;
        }
        .ca-hero-time {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          background: #f7f7f5;
          padding: 3px 8px;
          border-radius: 8px;
          margin-top: 6px;
        }
        .ca-hero-info {
          flex: 1;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
        }
        .ca-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 9px;
          font-weight: 800;
          color: var(--champagne);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          background: rgba(17,17,17,0.08);
          border: 1px solid rgba(17,17,17,0.15);
          padding: 3px 10px;
          border-radius: 20px;
          width: fit-content;
        }
        .ca-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--champagne);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .ca-hero-service {
          font-size: 18px;
          font-weight: 800;
          color: #111111;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .ca-hero-barber {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }
        .ca-hero-barber strong { color: #0f172a; }
        .ca-hero-barber-img {
          width: 24px; height: 24px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(217, 192, 143, 0.15);
        }
        .ca-hero-barber-placeholder {
          width: 24px; height: 24px;
          border-radius: 50%;
          background: #f7f7f5;
          display: flex; align-items: center; justify-content: center;
          color: var(--champagne);
        }

        /* ── HISTORY ── */
        .ca-history-title {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 0 0 12px 4px;
        }
        .ca-history-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ca-history-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 16px;
          transition: all 0.3s ease;
          animation: caFadeIn 0.3s ease both;
        }
        .ca-history-item:hover {
          background: #f7f7f5;
          border-color: rgba(217, 192, 143, 0.3);
          transform: translateY(-1px);
        }
        .ca-history-item.canceled {
          opacity: 0.35;
          filter: grayscale(1);
        }
        .ca-hi-date {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #f7f7f5;
          border: 1px solid rgba(217, 192, 143, 0.15);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ca-hi-month {
          font-size: 8px;
          font-weight: 800;
          color: var(--champagne);
          text-transform: uppercase;
          letter-spacing: 1px;
          line-height: 1;
        }
        .ca-hi-day {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
          margin-top: 1px;
        }
        .ca-hi-info { flex: 1; min-width: 0; }
        .ca-hi-service {
          font-size: 14px;
          font-weight: 700;
          color: #111111;
          margin: 0 0 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ca-hi-service.striked { text-decoration: line-through; color: #94a3b8; }
        .ca-hi-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
        }
        .ca-hi-avatar {
          width: 14px; height: 14px;
          border-radius: 50%;
          object-fit: cover;
        }
        .ca-hi-dot {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: #cbd5e1;
        }
        .ca-hi-status {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 4px 10px;
          border-radius: 8px;
          flex-shrink: 0;
          border: 1px solid;
        }
        .st-pending { background: rgba(17,17,17,0.08); color: var(--champagne); border-color: rgba(17,17,17,0.2); }
        .st-done { background: rgba(34,197,94,0.08); color: #22c55e; border-color: rgba(34,197,94,0.2); }
        .st-canceled { background: #f7f7f5; color: #94a3b8; border-color: rgba(217, 192, 143, 0.15); }
        .ca-hi-action { flex-shrink: 0; margin-left: 4px; }
        .ca-rate-btn {
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(17,17,17,0.2);
          background: rgba(17,17,17,0.06);
          color: var(--champagne);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .ca-rate-btn:hover {
          background: var(--champagne);
          color: #ffffff;
          border-color: var(--champagne);
        }
        .ca-rated {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 800;
          color: #22c55e;
          text-transform: uppercase;
        }

        /* ── PAGINATION ── */
        .ca-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding: 0 4px;
        }
        .ca-page-btn {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          background: none;
          border: none;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: color 0.2s;
        }
        .ca-page-btn:hover { color: #111111; }
        .ca-page-btn:disabled { opacity: 0.3; cursor: default; }
        .ca-page-info {
          font-size: 10px;
          font-weight: 700;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* ── EMPTY STATE ── */
        .ca-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 60px 20px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
        }
        .ca-empty-title {
          font-size: 16px; font-weight: 800; color: #475569;
          margin: 12px 0 4px;
        }
        .ca-empty-sub {
          font-size: 12px; color: #94a3b8; font-weight: 600;
        }

        /* ── CONSENT ── */
        .ca-consent-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          margin-left: 4px;
        }
        .ca-consent-label h3 {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 0;
        }
        .ca-consent-ping {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #ef4444;
          animation: pulse 1.5s infinite;
        }
        .ca-consent-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .ca-consent-grid { grid-template-columns: 1fr 1fr; }
        }
        .ca-consent-card {
          padding: 20px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          cursor: pointer;
          transition: all 0.3s ease;
          animation: caFadeIn 0.3s ease both;
        }
        .ca-consent-card.pending {
          border-color: rgba(239,68,68,0.2);
        }
        .ca-consent-card.pending:hover {
          border-color: rgba(239,68,68,0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(239,68,68,0.1);
        }
        .ca-consent-card.signed:hover {
          border-color: rgba(217, 192, 143, 0.3);
          transform: translateY(-1px);
        }
        .ca-cc-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .ca-cc-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .ca-cc-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 3px 8px;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .ca-cc-badge.pending {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.15);
          color: #f87171;
        }
        .ca-cc-service {
          font-size: 15px;
          font-weight: 800;
          color: #111111;
          margin: 0 0 8px;
        }
        .ca-cc-service.small { font-size: 13px; margin: 0 0 4px; }
        .ca-cc-barber {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: #94a3b8;
          font-weight: 600;
        }
        .ca-cc-avatar {
          width: 18px; height: 18px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(217, 192, 143, 0.15);
        }
        .ca-cc-avatar-ph {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #f7f7f5;
          display: flex; align-items: center; justify-content: center;
          color: #94a3b8;
        }
        .ca-cc-icon {
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s;
        }
        .ca-cc-icon.pending {
          background: rgba(239,68,68,0.08);
          color: #ef4444;
        }
        .ca-consent-card.pending:hover .ca-cc-icon.pending {
          background: #ef4444;
          color: white;
          transform: scale(1.1);
        }
        .ca-cc-view-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 800;
          color: #22c55e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 6px 12px;
          border-radius: 10px;
          background: #ffffff;
          transition: background 0.2s;
        }
        .ca-consent-card.signed:hover .ca-cc-view-btn {
          background: rgba(34,197,94,0.08);
        }

        /* ── MODALS ── */
        .ca-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .ca-modal {
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid rgba(217, 192, 143, 0.15);
          padding: 28px;
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 40px 80px rgba(0,0,0,0.10);
        }
        .ca-modal-sm { max-width: 380px; }
        .ca-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .ca-modal-header h2 {
          font-size: 18px;
          font-weight: 800;
          color: #111111;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .ca-modal-goto {
          font-size: 10px;
          font-weight: 700;
          color: var(--champagne);
          background: none;
          border: none;
          cursor: pointer;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .ca-modal-close {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: #f7f7f5;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .ca-modal-close:hover { background: #f7f7f5; color: #111111; }
        .ca-modal-body { margin-bottom: 24px; }
        .ca-modal-legal-header {
          text-align: center;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(217, 192, 143, 0.15);
          margin-bottom: 20px;
        }
        .ca-ml-brand { font-size: 10px; font-weight: 800; color: var(--champagne); letter-spacing: 2px; margin: 0 0 4px; }
        .ca-ml-title { font-size: 16px; font-weight: 800; color: #111111; margin: 0; }
        .ca-ml-subtitle { font-size: 11px; color: #94a3b8; margin: 4px 0 0; }
        .ca-ml-section { margin-bottom: 16px; }
        .ca-ml-sec-title { font-size: 10px; font-weight: 800; color: rgba(17,17,17,0.7); text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px; }
        .ca-ml-sec-text { font-size: 13px; color: #64748b; line-height: 1.6; font-weight: 500; margin: 0; }

        /* ── SIGNATURE ── */
        .ca-modal-sign {
          padding-top: 20px;
          border-top: 1px solid rgba(217, 192, 143, 0.15);
        }
        .ca-sign-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .ca-sign-header span { display: flex; align-items: center; gap: 6px; }
        .ca-sign-clear {
          font-size: 10px;
          font-weight: 700;
          color: var(--champagne);
          background: #f7f7f5;
          border: none;
          padding: 4px 12px;
          border-radius: 8px;
          cursor: pointer;
          text-transform: uppercase;
        }
        .ca-sign-canvas-wrap {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(217, 192, 143, 0.15);
          background: #f7f7f5;
          margin-bottom: 16px;
        }
        .ca-sign-canvas {
          width: 100%;
          height: 160px;
          display: block;
          cursor: crosshair;
          touch-action: none;
        }
        .ca-sign-submit {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          background: #e8d4b0;
          color: #111111;
          border: none;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .ca-sign-submit:hover { background: #d9c08f; }
        .ca-sign-submit:disabled { opacity: 0.4; cursor: default; }

        /* ── SIGNED VIEW ── */
        .ca-modal-signed {
          padding-top: 20px;
          border-top: 1px solid rgba(217, 192, 143, 0.15);
          text-align: center;
        }
        .ca-signed-badge {
          width: 48px; height: 48px;
          border-radius: 50%;
          background: rgba(34,197,94,0.08);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px;
        }
        .ca-signed-text { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0; }
        .ca-signed-date { font-size: 10px; color: #94a3b8; margin: 4px 0 16px; text-transform: uppercase; letter-spacing: 1px; }
        .ca-signed-sig-wrap {
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 16px;
          padding: 8px;
          margin-bottom: 16px;
        }
        .ca-signed-sig-img { width: 100%; height: auto; border-radius: 12px; }
        .ca-signed-name { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin: 8px 0 4px; }
        .ca-signed-close {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          background: #f7f7f5;
          color: #475569;
          border: none;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ca-signed-close:hover { background: #f7f7f5; color: #0f172a; }

        /* ── STAR RATING ── */
        .ca-modal .flex.items-center.gap-3.py-2 {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
        }

        /* ── MOBILE ── */
        @media (max-width: 640px) {
          .ca-hero-card { flex-direction: column; }
          .ca-hero-stub {
            flex-direction: row;
            gap: 12px;
            padding: 16px 20px;
            border-right: none;
            border-bottom: 1px dashed rgba(15,23,42,0.15);
          }
          .ca-hero-day { font-size: 28px; }
          .ca-hero-info { padding: 16px 20px; }
          .ca-hero-service { font-size: 16px; }
          .ca-hi-action { display: none; }
        }
      `}</style>
    </div>
  );
}
