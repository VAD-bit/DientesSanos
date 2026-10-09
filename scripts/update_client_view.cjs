const fs = require('fs');

let content = fs.readFileSync('src/components/ClientModule.jsx', 'utf8');

const originalBlockRegex = /\) \: \(viewMode === 'grid' \|\| viewMode === 'coupons'\) \? \([\s\S]*?\) \: \(\s*<div className=\"animate-slide-up\" style=\{\{ background: 'rgba\(28, 28, 30, 0\.95\)'/m;

const newBlock = `) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {paginatedClients.filter(c => {
                  const term = normalizeForSearch(searchTerm);
                  const normalizedName = normalizeForSearch(c.name || '');
                  return normalizedName.split(' ').some(w => w.startsWith(term)) || (c.id_card || '').toLowerCase().includes(term) || (c.phone || '').includes(searchTerm);
                }).map(client => (
                <div 
                  key={client.id} 
                  className="glass-card" 
                  onClick={() => setSelectedClient(client)}
                  style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    cursor: 'pointer',
                    padding: '24px',
                    borderRadius: '24px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: 'rgba(28, 28, 30, 0.4)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                    e.currentTarget.style.backgroundColor = 'rgba(40, 40, 44, 0.6)';
                    e.currentTarget.style.border = '1px solid rgba(255, 215, 0, 0.2)';
                    e.currentTarget.style.boxShadow = '0 12px 48px rgba(255,215,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.backgroundColor = 'rgba(28, 28, 30, 0.4)';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '18px', 
                      backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      flexShrink: 0,
                      boxShadow: 'inset 0 0 20px rgba(255,255,255,0.02)'
                    }}>
                      <User size={28} color="var(--gold-primary)" />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <h3 style={{ margin: '0 0 4px 0', fontWeight: '800', fontSize: '18px', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</h3>
                      <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' }}>
                        <Phone size={14} color="var(--text-muted)" /> 
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.phone}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Visitas Totales</div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{client.total_visits || 0}</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255, 215, 0, 0.03)', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(255, 215, 0, 0.1)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', opacity: 0.8 }}>Puntos VIP</div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '-0.5px' }}>{client.points || 0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'coupons' ? (
            <div className="animate-slide-up" style={{ backgroundColor: 'rgba(28, 28, 30, 0.4)', backdropFilter: 'blur(24px)', borderRadius: '32px', padding: isMobile ? '24px' : '48px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '24px', backgroundColor: 'rgba(255, 215, 0, 0.08)', border: '1px solid rgba(255, 215, 0, 0.2)', marginBottom: '20px', boxShadow: '0 10px 30px rgba(255,215,0,0.1)' }}>
                  <Ticket size={36} color="var(--gold-primary)" />
                </div>
                <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 12px 0', background: 'linear-gradient(to right, #D4AF37, #FFF8DC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Leaderboard VIP</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '440px', margin: '0 auto', lineHeight: '1.5' }}>Tus clientes más fieles, ordenados por cantidad de visitas históricas y puntos acumulados.</p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
                {[...visibleClients]
                  .sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0))
                  .slice(0, 50)
                  .map((client, index) => {
                    const isTop3 = index < 3;
                    return (
                      <div 
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: isMobile ? '12px' : '20px',
                          padding: isMobile ? '16px' : '20px 24px',
                          borderRadius: '20px',
                          backgroundColor: isTop3 ? 'rgba(255, 215, 0, 0.03)' : 'rgba(255, 255, 255, 0.02)',
                          border: isTop3 ? '1px solid rgba(255, 215, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.08)'; e.currentTarget.style.transform = 'scale(1.01)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = isTop3 ? 'rgba(255, 215, 0, 0.03)' : 'rgba(255, 255, 255, 0.02)'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <div style={{ 
                          width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: '50%', 
                          background: index === 0 ? 'linear-gradient(135deg, #FFDF00, #D4AF37)' : index === 1 ? 'linear-gradient(135deg, #E2E2E2, #A0A0A0)' : index === 2 ? 'linear-gradient(135deg, #F4A460, #CD7F32)' : 'rgba(255,255,255,0.05)',
                          color: isTop3 ? '#000' : 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '900', fontSize: isMobile ? '16px' : '18px', flexShrink: 0,
                          boxShadow: isTop3 ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
                        }}>
                          #{index + 1}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: isMobile ? '15px' : '17px', fontWeight: isTop3 ? '800' : '600', color: isTop3 ? 'var(--gold-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</h4>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Registrado: {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '900', color: isTop3 ? 'var(--gold-primary)' : 'var(--text-primary)', letterSpacing: '-0.5px' }}>{client.total_visits || 0}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visitas</div>
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>
          ) : (
            <div className="animate-slide-up" style={{ background: 'rgba(28, 28, 30, 0.95)'`;

content = content.replace(originalBlockRegex, newBlock);

fs.writeFileSync('src/components/ClientModule.jsx', content);
console.log('ClientModule view modes updated');
