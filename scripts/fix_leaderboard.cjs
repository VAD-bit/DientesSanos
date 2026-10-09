const fs = require('fs');

let content = fs.readFileSync('src/components/ClientModule.jsx', 'utf8');

// 1. Fix the top imports that got mangled by replace_file_content
const badImports = `import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifs } from '../context/NotificationContext';
import { 
  Search,
  Gift,
  Ticket, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  Scissors, 
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  Columns as ColumnsIcon,
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifs } from '../context/NotificationContext';
import { 
  Search,
  Gift,
  Ticket, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  Scissors, 
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  Columns as ColumnsIcon,
  Loader2,
  X,
  Trash2,
  Download,
  Check,
  LayoutGrid,
  Table as TableIcon,
  MessageCircle,
  Receipt,
  Award,
  Activity
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { supabase } from '../lib/supabase';
import PandaSelect from './PandaSelect';
import PandaCamera from './PandaCamera';
import PandaDatePicker from './PandaDatePicker';`;

const goodImports = `import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifs } from '../context/NotificationContext';
import { 
  Search,
  Gift,
  Ticket, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  Scissors, 
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  Columns as ColumnsIcon,
  Loader2,
  X,
  Trash2,
  Download,
  Check,
  LayoutGrid,
  Table as TableIcon,
  MessageCircle,
  Receipt,
  Award,
  Activity
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { supabase } from '../lib/supabase';
import PandaSelect from './PandaSelect';
import DateMaskInput from './DateMaskInput';
import PandaCamera from './PandaCamera';
import PandaDatePicker from './PandaDatePicker';`;

if (content.includes(badImports)) {
  content = content.replace(badImports, goodImports);
} else {
  // If exact match fails, let's just do a string replacement for the mangled part
  const startMangled = `import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifs } from '../context/NotificationContext';
import { 
  Search,
  Gift,
  Ticket, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  Scissors, 
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  Columns as ColumnsIcon,
import React, { useState, useEffect, useMemo, useRef } from 'react';`;

  if (content.includes(startMangled)) {
    content = content.replace(`import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifs } from '../context/NotificationContext';
import { 
  Search,
  Gift,
  Ticket, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  Scissors, 
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  Columns as ColumnsIcon,
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifs } from '../context/NotificationContext';
import { 
  Search,
  Gift,
  Ticket, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  Scissors, 
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  Columns as ColumnsIcon,`, `import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifs } from '../context/NotificationContext';
import { 
  Search,
  Gift,
  Ticket, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  Scissors, 
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  Columns as ColumnsIcon,`);
  }
  
  if (!content.includes(`import DateMaskInput`)) {
    content = content.replace(`import PandaSelect from './PandaSelect';`, `import PandaSelect from './PandaSelect';\nimport DateMaskInput from './DateMaskInput';`);
  }
}

// 2. Fix the Leaderboard layout
const oldLeaderboardStart = `          ) : viewMode === 'coupons' ? (
            <div className="animate-slide-up" style={{ backgroundColor: 'rgba(28, 28, 30, 0.4)', backdropFilter: 'blur(24px)', borderRadius: '32px', padding: isMobile ? '24px' : '48px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '24px', backgroundColor: 'rgba(255, 215, 0, 0.08)', border: '1px solid rgba(255, 215, 0, 0.2)', marginBottom: '20px', boxShadow: '0 10px 30px rgba(255,215,0,0.1)' }}>
                  <Ticket size={36} color="var(--gold-primary)" />
                </div>
                <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 12px 0', background: 'linear-gradient(to right, #D4AF37, #FFF8DC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Leaderboard VIP</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '440px', margin: '0 auto', lineHeight: '1.5' }}>Tus clientes más fieles, ordenados por cantidad de visitas históricas y puntos acumulados.</p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>`;

const newLeaderboardStart = `          ) : viewMode === 'coupons' ? (
            <div className="animate-slide-up" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 350px', gap: '24px' }}>
              <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,215,0,0.02)' }}>
                  <Award size={24} color="var(--gold-primary)" />
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800' }}>Top Clientes Frecuentes</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Ranking histórico de fidelidad</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>`;

const oldLeaderboardItem = `                      <div 
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
                      </div>`;

const newLeaderboardItem = `                      <div 
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px 24px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: 'transparent'
                        }}
                        className="table-row-hover"
                      >
                        <div style={{ width: '40px', fontWeight: '900', color: isTop3 ? 'var(--gold-primary)' : 'var(--text-muted)', fontSize: '15px' }}>
                          #{index + 1}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: isTop3 ? 'var(--gold-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{client.phone || 'Sin teléfono'}</div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ background: isTop3 ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: isTop3 ? 'var(--gold-primary)' : 'white' }}>{client.total_visits || 0}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Visitas</div>
                          </div>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </div>
                      </div>`;

const oldExpandBtn = `                  <button 
                    onClick={() => setLeaderboardExpanded(!leaderboardExpanded)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      marginTop: '8px',
                      borderRadius: '16px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                  >
                    {leaderboardExpanded ? 'Ocultar resto del ranking' : 'Ver ranking completo'}
                  </button>
                )}
              </div>
            </div>`;

const newExpandBtn = `                  <button 
                    onClick={() => setLeaderboardExpanded(!leaderboardExpanded)}
                    style={{
                      width: '100%', padding: '16px',
                      backgroundColor: 'transparent', border: 'none',
                      color: 'var(--gold-primary)', fontSize: '13px', fontWeight: '700',
                      cursor: 'pointer', transition: 'all 0.2s',
                      borderTop: '1px solid rgba(255,255,255,0.05)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,215,0,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {leaderboardExpanded ? 'Ocultar resto del ranking' : 'Ver ranking completo'}
                  </button>
                )}
              </div>
              </div>

              {!isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="glass-card">
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={18} color="var(--gold-primary)" /> Fidelización
                    </h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      El ranking refleja la lealtad de los clientes. Selecciona cualquier cliente de la lista para acceder a su perfil completo, incluyendo su última visita, preferencias e historial de servicios detallado.
                    </p>
                  </div>
                </div>
              )}
            </div>`;

content = content.replace(oldLeaderboardStart, newLeaderboardStart);
content = content.replace(oldLeaderboardItem, newLeaderboardItem);
content = content.replace(oldExpandBtn, newExpandBtn);

fs.writeFileSync('src/components/ClientModule.jsx', content);
console.log('Fix applied!');
