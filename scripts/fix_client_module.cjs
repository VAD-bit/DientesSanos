const fs = require('fs');
let content = fs.readFileSync('src/components/ClientModule.jsx', 'utf8');

const badPart = `                    { label: 'Mixto', value: 'Mixto' }
                  ]}
              <p style={{ color: 'var(--text-muted)' }}>`;

const goodPart = `                    { label: 'Mixto', value: 'Mixto' }
                  ]}
                />
                <PandaSelect 
                  label="Cuero Cabelludo"
                  value={newClient.scalp_type}
                  onChange={(val) => setNewClient({...newClient, scalp_type: val})}
                  options={[
                    { label: 'Sano / Normal', value: 'Sano' },
                    { label: 'Sensible', value: 'Sensible' },
                    { label: 'Irritado', value: 'Irritado' },
                    { label: 'Caspa / Seborrea', value: 'Caspa' }
                  ]}
                />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn-gold" onClick={handleAddClient} disabled={creating} style={{ width: '100%', height: '48px', borderRadius: '12px' }}>
                    {creating ? <Loader2 className="animate-spin" /> : 'Registrar Ficha Técnica'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="focus-ring" style={{ 
            backgroundColor: 'rgba(28, 28, 30, 0.4)', 
            backdropFilter: 'blur(16px)',
            borderRadius: '20px', 
            padding: '4px 16px', 
            marginBottom: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            transition: 'all 0.2s'
          }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                width: '100%',
                padding: '12px 0',
                fontSize: '16px',
                boxShadow: 'none'
              }}
            />
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <Loader2 className="animate-spin" size={40} color="var(--gold-primary)" />
            </div>
          ) : visibleClients.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
              <User size={48} color="var(--bg-tertiary)" style={{ marginBottom: '20px' }} />
              <p style={{ color: 'var(--text-muted)' }}>`;

if (content.includes(badPart)) {
    content = content.replace(badPart, goodPart);
    fs.writeFileSync('src/components/ClientModule.jsx', content);
    console.log('Fixed corrupted ClientModule.jsx');
} else {
    console.log('Could not find bad part');
}
