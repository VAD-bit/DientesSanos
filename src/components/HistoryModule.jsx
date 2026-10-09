import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  User, 
  Scissors, 
  TrendingUp, 
  ChevronDown,
  Package,
  Camera
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { SkeletonList } from './Skeleton';
import { useAuth } from '../context/AuthContext';
import { useNotifs } from '../context/NotificationContext';

const HistoryModule = ({ isMobile, rates, onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const isAdmin = user?.role?.toLowerCase().includes('admin');

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      let data = [];
      // Default to last 30 days for fast initial load
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString();

      if (isAdmin) {
        data = await dataService.getAppointmentsByState(['Completado'], startDate);
      } else {
        // Fetch from appointment_staff to include all services where the user participated
        const { data: staffData, error } = await dataService.supabase
          .from('appointment_staff')
          .select(`
            *,
            appointments!inner (
              *,
              clients(id, name, phone, id_card, work_gallery),
              services(name, price, included_items),
              appointment_extras(id, price, service_extras(name)),
              appointment_products(id, quantity, price, inventory(id, name))
            )
          `)
          .eq('staff_id', user.id)
          .eq('appointments.status', 'Completado')
          .gte('appointments.completed_at', startDate);

        if (error) throw error;

        const staffTransactions = await dataService.getTransactions(startDate);

        data = staffData.map(record => {
          const item = record.appointments;
          if (!item) return null;
          const relatedTransaction = staffTransactions.find(transaction => {
            const metadata = transaction.metadata || {};
            const appointmentIds = metadata.appointment_ids || [];
            return String(metadata.appointment_id || '') === String(item.id) || appointmentIds.some(id => String(id) === String(item.id));
          });

          return {
            ...item,
            exchange_rate: Number(relatedTransaction?.exchange_rate || 0) || undefined,
            commission_earned: Number(record.commission_earned || 0),
            product_commission: Number(record.product_commission || 0),
            tip_amount: Number(record.tip_amount || 0),
            isStaffView: true
          };
        }).filter(Boolean);
      }
      // Sort by date (newest first)
      data.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      showToast('Error al cargar historial', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const serviceBase = Number(item.services?.price !== undefined && item.services?.price !== null ? item.services.price : (item.total_price || 0));
    const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
    const products = item.appointment_products?.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0) || 0;
    const tips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
    const val = isAdmin ? (serviceBase + extras + products + tips) : ((item.commission_earned || 0) + (item.product_commission || 0) + (item.tip_amount || 0));

    const hasService = Boolean(item.services?.name);
    const hasExtras = Boolean(item.appointment_extras?.length);
    const hasProducts = Boolean(item.appointment_products?.length);
    const hasTips = Boolean(item.appointment_staff?.some(s => Number(s.tip_amount) > 0));

    // Exclude ghost/empty 0-value appointments (e.g. placeholders without service/extras/products/tips)
    if (!hasService && !hasExtras && !hasProducts && !hasTips && val === 0) {
      return false;
    }

    const searchMatch = (item.clients?.name || '').toLowerCase().includes(filter.toLowerCase()) ||
                       (item.services?.name || '').toLowerCase().includes(filter.toLowerCase());
    if (!searchMatch) return false;
    if (dateRange === 'today') {
      const operationDate = new Date(item.completed_at || item.scheduled_at || item.created_at || 0);
      return operationDate.toDateString() === new Date().toDateString();
    }
    if (dateRange === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return new Date(item.created_at) >= lastWeek;
    }
    return true;
  });

  const totalIncome = filteredHistory.reduce((acc, item) => {
    if (!isAdmin) return acc + (item.commission_earned || 0) + (item.product_commission || 0) + (item.tip_amount || 0);
    
    // Admin: Sum everything including tips from appointment_staff
    const serviceBase = Number(item.services?.price !== undefined && item.services?.price !== null ? item.services.price : (item.total_price || 0));
    const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
    const products = item.appointment_products?.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0) || 0;
    const tips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
    return acc + serviceBase + extras + products + tips;
  }, 0);

  const renderExpandedDetails = (item) => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr minmax(0, 1fr)', gap: isMobile ? '20px' : '32px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Client, Services and Extras */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
          
          {/* 1. Client Card */}
          <div className="glass-card animate-card-1" style={{
            padding: isMobile ? '16px' : '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderLeft: '4px solid var(--gold-primary)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isMobile ? '14px' : '20px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255, 255, 255,0.1)', color: 'var(--gold-primary)', display: 'flex' }}>
                <User size={16} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Detalles del Cliente
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr minmax(0, 1fr) minmax(0, 1fr)', gap: isMobile ? '12px' : '20px' }}>
              <div 
                onClick={() => onNavigate('clients', { clientId: item.clients?.id })}
                className="client-link"
                style={{ cursor: 'pointer' }}
              >
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Nombre</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--gold-primary)', textDecoration: 'underline' }}>{item.clients?.name || 'Cliente sin registrar'}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Cédula</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{item.clients?.id_card || 'No registrada'}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Teléfono</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{item.clients?.phone || 'No registrado'}</span>
              </div>
            </div>
          </div>

          {/* 2. Service and Extras Card */}
          <div className="glass-card animate-card-2" style={{
            padding: isMobile ? '16px' : '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderLeft: '4px solid var(--gold-primary)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isMobile ? '14px' : '20px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255, 255, 255,0.1)', color: 'var(--gold-primary)', display: 'flex' }}>
                <Scissors size={16} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Servicio y Extras Realizados
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row', 
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'center', 
                gap: '8px',
                paddingBottom: '12px', 
                borderBottom: '1px dashed rgba(255,255,255,0.08)' 
              }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Servicio Principal</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{item.services?.name}</span>
                </div>
                {user.role !== 'Asistente de Lavado' && (
                  <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}>
                      {formatCurrency((item.services?.price || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>
                      Ref: ${formatCurrency(item.services?.price || 0)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Extras, Adicionales y Productos</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {item.appointment_extras?.map(ex => (
                    <div key={ex.id} style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row', 
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'flex-start' : 'center', 
                      gap: isMobile ? '4px' : '12px',
                      fontSize: '13px', 
                      background: 'rgba(255,255,255,0.01)', 
                      padding: '8px 12px', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(255,255,255,0.04)' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '8px', fontWeight: '900', color: 'var(--gold-primary)', background: 'rgba(255, 255, 255,0.1)', borderRadius: '4px', padding: '2px 4px' }}>EXTRA</span>
                        <span style={{ color: 'white', fontWeight: '700' }}>{ex.service_extras?.name}</span>
                      </div>
                      <span style={{ fontWeight: '800', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}>
                        +{formatCurrency(Number(ex.price) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs. (Ref: +${ex.price})
                      </span>
                    </div>
                  ))}
                  {item.appointment_products?.map(pr => (
                    <div key={pr.id} style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row', 
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'flex-start' : 'center', 
                      gap: isMobile ? '4px' : '12px',
                      fontSize: '13px', 
                      background: 'rgba(255,255,255,0.01)', 
                      padding: '8px 12px', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(255,255,255,0.04)' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '8px', fontWeight: '900', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', borderRadius: '4px', padding: '2px 4px' }}>PRODUCTO</span>
                        <span style={{ color: 'white', fontWeight: '700' }}>{pr.inventory?.name} <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>({pr.quantity}u)</span></span>
                      </div>
                      <span style={{ fontWeight: '800', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}>
                        +{formatCurrency(Number(pr.price) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs. (Ref: +${pr.price})
                      </span>
                    </div>
                  ))}
                  {(!item.appointment_extras?.length && !item.appointment_products?.length) && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ninguno adicional registrado</div>
                  )}
                </div>
              </div>

              {/* Total Propinas */}
              {(() => {
                const totalTips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
                if (totalTips > 0) {
                  const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
                  return (
                    <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Propinas Recibidas</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span>Total Propinas ({item.appointment_staff?.filter(s => Number(s.tip_amount) > 0).length} pers.)</span>
                        <span style={{ fontWeight: '700', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}>
                          +{formatCurrency(totalTips * rate)} Bs. (Ref: +${formatCurrency(totalTips)})
                        </span>
                      </div>
                    </div>
                  )
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Receipt, Settlements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 3. Ticket Card */}
          <div className="glass-card animate-card-3" style={{
            padding: isMobile ? '16px' : '24px',
            borderRadius: '24px',
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(255, 255, 255,0.15)',
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.4)'
          }}>
            {/* Ticket Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255, 255, 255,0.1)', color: 'var(--gold-primary)', display: 'flex' }}>
                <TrendingUp size={16} />
              </div>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase', display: 'block' }}>
                  Liquidación de Caja
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  Tasa de cambio: {item.exchange_rate || rates?.bcv || rates?.usd || 550} Bs.
                </span>
              </div>
            </div>

            {/* Detalle Cobrado */}
            {user.role !== 'Asistente de Lavado' && (
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>Conceptos cobrados</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(() => {
                    const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
                    const servicePrice = Number(item.services?.price || 0);
                    const receiptLines = [
                      { label: item.services?.name || 'Servicio', type: 'Servicio', amount: servicePrice }
                    ];
                    item.appointment_extras?.forEach(ex => {
                      receiptLines.push({
                        label: ex.service_extras?.name || 'Extra',
                        type: 'Extra',
                        amount: Number(ex.price || 0)
                      });
                    });
                    item.appointment_products?.forEach(pr => {
                      const quantity = Number(pr.quantity || 1);
                      receiptLines.push({
                        label: `${pr.inventory?.name || 'Prod'} x${quantity}`,
                        type: 'Producto',
                        amount: Number(pr.price || 0) * quantity
                      });
                    });
                    item.appointment_staff?.forEach(st => {
                      const tip = Number(st.tip_amount || 0);
                      if (tip > 0) {
                        receiptLines.push({
                          label: `Propina ${st.staff?.name.split(' ')[0]}`,
                          type: 'Propina',
                          amount: tip,
                          isTip: true
                        });
                      }
                    });

                    const totalReceipt = receiptLines.reduce((sum, line) => sum + line.amount, 0);

                    return (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {receiptLines.map((line, idx) => (
                            <ReceiptLine key={`${line.type}-${idx}`} line={line} rate={rate} formatCurrency={formatCurrency} />
                          ))}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                          <span style={{ fontSize: '12px', color: 'white', fontWeight: '900', letterSpacing: '0.5px' }}>TOTAL COBRADO</span>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: '950', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}>
                              {formatCurrency(totalReceipt * rate)} Bs.
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', whiteSpace: 'nowrap' }}>
                              Ref: ${formatCurrency(totalReceipt)}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Totales de Liquidacion */}
            {isAdmin ? (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'block' }}>Distribución de Fondos</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {item.appointment_staff?.length > 0 ? item.appointment_staff.map((st, sidx) => {
                    const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
                    const commission = Number(st.commission_earned || 0);
                    const tip = Number(st.tip_amount || 0);
                    const staffTotal = commission + tip;
                    const firstName = (st.staff?.name || 'Personal').split(' ')[0];
                    return (
                      <div key={sidx} style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>Total {firstName}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}>
                              +{formatCurrency(staffTotal * rate)} Bs.
                            </span>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                              Ref: +${formatCurrency(staffTotal)}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '8px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '6px' }}>
                            <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Comisión</div>
                            <div style={{ fontSize: '10.5px', color: 'white', fontWeight: '800', marginTop: '2px', whiteSpace: 'nowrap' }}>
                              {formatCurrency(commission * rate)} Bs.
                            </div>
                          </div>
                          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '6px' }}>
                            <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Propina</div>
                            <div style={{ fontSize: '10.5px', color: 'white', fontWeight: '800', marginTop: '2px', whiteSpace: 'nowrap' }}>
                              {formatCurrency(tip * rate)} Bs.
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>No hay personal registrado en esta venta.</div>
                  )}

                  {/* Beneficio neto de la clínica */}
                  {(() => {
                    const serviceBase = Number(item.services?.price || 0);
                    const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
                    const products = item.appointment_products?.reduce((sum, pr) => sum + (Number(pr.price || 0) * (pr.quantity || 1)), 0) || 0;
                    const totalVenta = serviceBase + extras + products;
                    const commissions = item.appointment_staff?.reduce((sum, s) => sum + Number(s.commission_earned || 0), 0) || 0;
                    const pandaProfit = totalVenta - commissions;
                    const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);

                    return (
                      <div style={{ marginTop: '8px', padding: '14px', borderRadius: '16px', background: 'rgba(255, 255, 255,0.08)', border: '1px solid rgba(255, 255, 255,0.18)', boxShadow: 'inset 0 0 12px rgba(255, 255, 255,0.05)' }}>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: isMobile ? 'column' : 'row', 
                          justifyContent: 'space-between', 
                          alignItems: isMobile ? 'flex-start' : 'center', 
                          gap: '8px' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold-primary)' }} />
                            <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '0.5px' }}>Total Clínica (Neto)</span>
                          </div>
                          <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: '950', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}>
                              +{formatCurrency(pandaProfit * rate)} Bs.
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '800', whiteSpace: 'nowrap' }}>
                              Ref: +${formatCurrency(pandaProfit)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              /* Staff view */
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'block' }}>Tu Liquidación</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                      {user.role === 'Asistente de Lavado' ? 'Tarifa de Limpieza' : 'Tu Comisión'}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap' }}>
                        {formatCurrency((item.commission_earned || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        Ref: ${formatCurrency(item.commission_earned || 0)}
                      </div>
                    </div>
                  </div>
                  {Number(item.product_commission || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(48,209,88,0.04)', padding: '10px 14px', borderRadius: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#30d158', fontWeight: '700' }}>Comisión de productos</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap' }}>{formatCurrency(Number(item.product_commission) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.</span>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>Ref: ${formatCurrency(item.product_commission)}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255,0.05)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255,0.1)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--gold-primary)', fontWeight: '900' }}>Tu Propina</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}>
                        +{formatCurrency((item.tip_amount || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '750', whiteSpace: 'nowrap' }}>
                        Ref: +${formatCurrency(item.tip_amount || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visual Gallery if exists */}
          {item.clients?.work_gallery?.some(p => p.service_id === item.id) && (
            <div className="glass-card animate-card-4" style={{
              padding: isMobile ? '16px' : '24px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderLeft: '4px solid var(--gold-primary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255, 255, 255,0.1)', color: 'var(--gold-primary)', display: 'flex' }}>
                  <Camera size={16} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Registro Visual del Procedimiento
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                {item.clients.work_gallery
                  .filter(p => p.service_id === item.id)
                  .map((photo, pidx) => (
                    <div key={pidx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                      <img src={photo.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'var(--bg-secondary)', padding: '8px 4px 4px 4px', fontSize: '9px', fontWeight: '900', textAlign: 'center', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {photo.type}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      <header className="animate-slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.5px' }}>
            {isAdmin ? 'Historial' : 'Mi Historial'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {isAdmin ? 'Registro completo de servicios y transacciones.' : 'Consulta tus servicios realizados y propinas.'}
          </p>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: '12px' }}>
             <div className="glass-card" style={{ padding: '12px 24px', borderRadius: '16px', textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {isAdmin ? 'VENTAS FILTRADAS' : 'MIS GANANCIAS'}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--gold-primary)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span>{formatCurrency(totalIncome * (rates?.bcv || rates?.usd || 550))} Bs.</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '2px' }}>
                    Ref: ${formatCurrency(totalIncome)}
                  </span>
                </div>
             </div>
          </div>
        )}
      </header>

      {/* Filters Bar */}
      <div className="glass-card animate-slide-up" style={{ padding: '16px', borderRadius: '20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
          <input 
            className="form-input" 
            placeholder="Buscar por cliente o servicio..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: '100%', height: '48px', paddingLeft: '48px', borderRadius: '12px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'today', 'week'].map(range => (
            <button 
              key={range}
              onClick={() => setDateRange(range)}
              style={{ 
                padding: '10px 16px', 
                borderRadius: '10px', 
                border: '1px solid var(--border-color)', 
                backgroundColor: dateRange === range ? 'var(--gold-primary)' : 'transparent', 
                color: dateRange === range ? 'black' : 'white', 
                fontWeight: '700', 
                fontSize: '13px', 
                cursor: 'pointer'
              }}
            >
              {range === 'all' ? 'Todo' : range === 'today' ? 'Hoy' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonList rows={6} rowHeight={62} />
      ) : filteredHistory.length === 0 ? (
        <div className="glass-card" style={{ padding: '80px', textAlign: 'center', borderRadius: '32px', opacity: 0.5 }}>
          <History size={48} style={{ margin: '0 auto 20px', color: 'var(--text-muted)' }} />
          <h3>No hay registros</h3>
          <p>No se encontraron servicios que coincidan con los filtros.</p>
        </div>
      ) : isMobile ? (
        /* Mobile Card List View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredHistory.map(item => {
            const isSelected = selectedId === item.id;
            
            // Calculate total/gain amount
            let val = 0;
            if (!isAdmin) val = ((item.commission_earned || 0) + (item.product_commission || 0) + (item.tip_amount || 0));
            else {
              const serviceBase = Number(item.services?.price || 0);
              const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
              const products = item.appointment_products?.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0) || 0;
              const tips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
              val = (serviceBase + extras + products + tips);
            }
            const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
            const finalBs = val * rate;

            return (
              <div 
                key={item.id} 
                className="glass-card animate-slide-up"
                style={{
                  padding: '16px',
                  borderRadius: '20px',
                  background: isSelected ? 'linear-gradient(135deg, rgba(255, 255, 255,0.06) 0%, rgba(28,28,30,0.98) 100%)' : 'rgba(28, 28, 30, 0.98)',
                  border: isSelected ? '1px solid rgba(255, 255, 255,0.25)' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isSelected ? '0 8px 32px 0 rgba(255, 255, 255,0.05)' : '0 4px 16px 0 rgba(0,0,0,0.25)'
                }}
              >
                {/* Clickable Header Area */}
                <div 
                  onClick={() => setSelectedId(isSelected ? null : item.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '3px 7px', borderRadius: '6px' }}>
                        {new Date(item.created_at).toLocaleDateString([], {day: '2-digit', month: 'numeric'})}
                      </span>
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('clients', { clientId: item.clients?.id });
                        }}
                        style={{ fontSize: '14px', fontWeight: '850', color: 'white', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {item.clients?.name || 'Cliente sin registrar'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      {item.services?.name || 'Servicio'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'right', flexShrink: 0 }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}>
                        {Math.round(finalBs).toLocaleString()} Bs.
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', whiteSpace: 'nowrap' }}>
                        Ref: ${formatCurrency(val)}
                      </div>
                    </div>
                    <div style={{ color: isSelected ? 'var(--gold-primary)' : 'var(--text-muted)', transform: isSelected ? 'rotate(180deg)' : 'rotate(0)' }}>
                      <ChevronDown size={15} />
                    </div>
                  </div>
                </div>

                {/* Expanded Details Area */}
                {isSelected && (
                  <div className="animate-history-expand" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                    {renderExpandedDetails(item)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="glass-card animate-slide-up" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Fecha</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cliente</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Servicio</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>{isAdmin ? 'Total' : 'Ganancia'}</th>
                  <th style={{ padding: '20px 24px', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(item => {
                  const isSelected = selectedId === item.id;
                  
                  // Calculate total/gain amount
                  let val = 0;
                  if (!isAdmin) val = ((item.commission_earned || 0) + (item.product_commission || 0) + (item.tip_amount || 0));
                  else {
                    const serviceBase = Number(item.services?.price || 0);
                    const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
                    const products = item.appointment_products?.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0) || 0;
                    const tips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
                    val = (serviceBase + extras + products + tips);
                  }
                  const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
                  const finalBs = val * rate;

                  return (
                    <React.Fragment key={item.id}>
                      <tr 
                        onClick={() => setSelectedId(isSelected ? null : item.id)}
                        className="history-table-row"
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.03)', 
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(255, 255, 255,0.05)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '18px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                          {new Date(item.created_at).toLocaleDateString([], {day: '2-digit', month: 'numeric'})}
                        </td>
                        <td style={{ padding: '18px 24px' }}>
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('clients', { clientId: item.clients?.id });
                            }}
                            className="client-link"
                            style={{ fontSize: '15px', fontWeight: '700', color: 'white', cursor: 'pointer', display: 'inline-block' }}
                          >
                            {item.clients?.name}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.clients?.id_card}</div>
                        </td>
                        <td style={{ padding: '18px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                          {item.services?.name}
                        </td>
                        <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                          <div style={{ fontSize: '15px', fontWeight: '850', color: 'var(--gold-primary)' }}>
                            {Math.round(finalBs).toLocaleString()} Bs.
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>
                            Ref: ${formatCurrency(val)}
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                          <div style={{ color: isSelected ? 'var(--gold-primary)' : 'var(--text-muted)', transform: isSelected ? 'rotate(180deg)' : 'rotate(0)' }}>
                            <ChevronDown size={18} />
                          </div>
                        </td>
                      </tr>
                      {isSelected && (
                        <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <td colSpan="5" style={{ padding: '0' }}>
                            <div className="animate-history-expand" style={{ padding: '32px 40px' }}>
                              {renderExpandedDetails(item)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .history-table-row:hover {
          background-color: rgba(255,255,255,0.03) !important;
        }
        .client-link:hover {
          color: var(--gold-primary) !important;
        }
        .glass-card {
          transition: none !important;
        }
        .glass-card:hover {
          transform: none !important;
        }
        @keyframes historyExpand {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-history-expand {
          animation: historyExpand 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-origin: top;
        }
        @keyframes cardPopIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-card-1 {
          animation: cardPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.04s;
        }
        .animate-card-2 {
          animation: cardPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.1s;
        }
        .animate-card-3 {
          animation: cardPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.16s;
        }
        .animate-card-4 {
          animation: cardPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.22s;
        }
      `}</style>
    </div>
  );
};

const SectionHeader = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
    <div style={{ color: 'var(--gold-primary)' }}>{icon}</div>
    <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>{title}</div>
  </div>
);

const MiniBreakdown = ({ label, amount, rate, formatCurrency }) => (
  <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '8px' }}>
    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800' }}>
      {formatCurrency(Number(amount || 0) * rate)} Bs.
    </div>
    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>
      Ref: ${formatCurrency(Number(amount || 0))}
    </div>
  </div>
);

const ReceiptLine = ({ line, rate, formatCurrency }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'center', padding: '9px 0', borderBottom: '1px dashed rgba(255,255,255,0.07)' }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <span style={{ fontSize: '9px', fontWeight: '900', color: line.isTip ? 'var(--gold-primary)' : 'var(--text-muted)', textTransform: 'uppercase', background: line.isTip ? 'rgba(255, 255, 255,0.1)' : 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '3px 6px', flexShrink: 0 }}>
          {line.type}
        </span>
        <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {line.label}
        </span>
      </div>
    </div>
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{ fontSize: '13px', fontWeight: '900', color: line.isTip ? 'var(--gold-primary)' : 'white', whiteSpace: 'nowrap' }}>
        {line.isTip ? '+' : ''}{formatCurrency(Number(line.amount || 0) * rate)} Bs.
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '2px', whiteSpace: 'nowrap' }}>
        Ref: {line.isTip ? '+' : ''}${formatCurrency(Number(line.amount || 0))}
      </div>
    </div>
  </div>
);

const DetailItem = ({ label, value, subValue }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{value}</span>
      {subValue && <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--gold-primary)' }}>{subValue}</span>}
    </div>
  </div>
);

export default HistoryModule;
