const fs = require('fs');

let content = fs.readFileSync('src/components/ClientModule.jsx', 'utf8');

// 1. Add DateMaskInput
if (!content.includes("import DateMaskInput")) {
  content = content.replace("import PandaSelect", "import PandaSelect from '../PandaSelect';\nimport DateMaskInput from './DateMaskInput';");
  // The original has import PandaSelect from '../PandaSelect';
}
content = content.replace(/<input type="date"\s+className="form-input"\s+value=\{newClient\.birth_date\}\s+onChange=\{\(e\) => setNewClient\(\{\.\.\.newClient, birth_date: e\.target\.value\}\)\}\s+style=\{\{ width: '100%' \}\}\s+\/>/, '<DateMaskInput className="form-input" placeholder="DD/MM/AAAA" value={newClient.birth_date} onChange={val => setNewClient({...newClient, birth_date: val})} style={{ width: \'100%\' }} />');

// 2. Leaderboard Pagination
if (!content.includes('const [leaderboardExpanded, setLeaderboardExpanded]')) {
  content = content.replace(/const \[viewMode, setViewMode\] = useState\('table'\);/, "const [viewMode, setViewMode] = useState('table');\n  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);");
}

const originalSlice = `.slice(0, 50)`;
const newSlice = `.slice(0, leaderboardExpanded ? 50 : 5)`;
content = content.replace(originalSlice, newSlice);

const originalCouponsEnd = `                      </div>
                    );
                })}
              </div>
            </div>
          ) : (`;

const newCouponsEnd = `                      </div>
                    );
                })}
                
                {visibleClients.length > 5 && (
                  <button 
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
            </div>
          ) : (`;
content = content.replace(originalCouponsEnd, newCouponsEnd);

// 3. Search Bar Glass
const searchBarOriginal = `          <div className="focus-ring" style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: '16px', 
            padding: '4px 16px', 
            marginBottom: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            border: '1px solid var(--border-color)',
            transition: 'all 0.2s'
          }}>`;
const searchBarGlass = `          <div className="focus-ring" style={{ 
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
          }}>`;
content = content.replace(searchBarOriginal, searchBarGlass);

// 4. Table Glass
const tableOriginal = `<div className="animate-slide-up" style={{ background: 'rgba(28, 28, 30, 0.95)', padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)' }}>`;
const tableGlass = `<div className="animate-slide-up" style={{ backgroundColor: 'rgba(28, 28, 30, 0.4)', backdropFilter: 'blur(16px)', padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>`;
content = content.replace(tableOriginal, tableGlass);

fs.writeFileSync('src/components/ClientModule.jsx', content);
console.log('Final fixes applied cleanly.');
