const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'ClientModule.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add Gift to imports
content = content.replace(
  "import { \n  Search",
  "import { \n  Search,\n  Gift,\n  Ticket"
);
content = content.replace(
  "import { \r\n  Search",
  "import { \r\n  Search,\r\n  Gift,\r\n  Ticket"
);

// 2. Add coupons state
content = content.replace(
  "const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'",
  "const [viewMode, setViewMode] = useState('table');\n  const [allCoupons, setAllCoupons] = useState([]);"
);

// 3. Fetch coupons with clients
const loadDataTarget = "  useEffect(() => {\r\n    if (initialClientId && clients.length > 0) {\r\n      const client = clients.find(c => c.id == initialClientId);\r\n      if (client) setSelectedClient(client);\r\n    }\r\n  }, [initialClientId, clients]);";

const loadDataReplacement = `  useEffect(() => {
    if (initialClientId && clients.length > 0) {
      const client = clients.find(c => c.id == initialClientId);
      if (client) setSelectedClient(client);
    }
    // Fetch all coupons for the "Con Cupones" filter
    dataService.getCoupons().then(c => setAllCoupons(c || [])).catch(console.error);
  }, [initialClientId, clients]);`;

content = content.replace(loadDataTarget, loadDataReplacement);

// 4. Update the View Toggles
const toggleTarget = `                <button \r\n                  onClick={() => setViewMode('table')}`;
const toggleReplacement = `                <button 
                  onClick={() => setViewMode('coupons')}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    backgroundColor: viewMode === 'coupons' ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                    color: viewMode === 'coupons' ? 'var(--gold-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    flex: isMobile ? 1 : 'none',
                    justifyContent: 'center'
                  }}
                >
                  <Ticket size={16} /> Premiados
                </button>
                <button 
                  onClick={() => setViewMode('table')}`;

content = content.replace(toggleTarget, toggleReplacement);

// 5. Apply the filter logic in the rendering
const filterTarget = `              {clients.filter(c => {
                  const term = normalizeForSearch(searchTerm);
                  const normalizedName = normalizeForSearch(c.name || '');
                  const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
                  const idMatches = (c.id_card || '').toLowerCase().includes(term);
                  const phoneMatches = (c.phone || '').includes(searchTerm);
                  return nameMatches || idMatches || phoneMatches;
                }).map(client => (`;

const filterReplacement = `              {clients.filter(c => {
                  if (viewMode === 'coupons') {
                    const hasUnused = allCoupons.some(coupon => coupon.client_id === c.id && coupon.status === 'UNUSED');
                    if (!hasUnused) return false;
                  }
                  const term = normalizeForSearch(searchTerm);
                  const normalizedName = normalizeForSearch(c.name || '');
                  const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
                  const idMatches = (c.id_card || '').toLowerCase().includes(term);
                  const phoneMatches = (c.phone || '').includes(searchTerm);
                  return nameMatches || idMatches || phoneMatches;
                }).map(client => (`;

content = content.replace(filterTarget, filterReplacement);

// Do the same for the table view
const tableFilterTarget = `              {clients.filter(c => {
                const term = normalizeForSearch(searchTerm);
                const normalizedName = normalizeForSearch(c.name || '');
                const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
                const idMatches = (c.id_card || '').toLowerCase().includes(term);
                const phoneMatches = (c.phone || '').includes(searchTerm);
                return nameMatches || idMatches || phoneMatches;
              }).map(client => (`;

const tableFilterReplacement = `              {clients.filter(c => {
                if (viewMode === 'coupons') {
                  const hasUnused = allCoupons.some(coupon => coupon.client_id === c.id && coupon.status === 'UNUSED');
                  if (!hasUnused) return false;
                }
                const term = normalizeForSearch(searchTerm);
                const normalizedName = normalizeForSearch(c.name || '');
                const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
                const idMatches = (c.id_card || '').toLowerCase().includes(term);
                const phoneMatches = (c.phone || '').includes(searchTerm);
                return nameMatches || idMatches || phoneMatches;
              }).map(client => (`;

content = content.replace(tableFilterTarget, tableFilterReplacement);

// Also we need to make sure the view mode can be "coupons" and it acts like a list/grid or table.
// Wait, the ternary is `viewMode === 'grid' ? (...) : (...)`
// If it's `coupons`, we should probably just render it as grid or table. Let's make 'coupons' render as grid.
// So change `viewMode === 'grid' ?` to `(viewMode === 'grid' || viewMode === 'coupons') ?`
content = content.replace(
  "viewMode === 'grid' ? (",
  "(viewMode === 'grid' || viewMode === 'coupons') ? ("
);

// We should also pass allCoupons to ClientDetail so it doesn't need to re-fetch, 
// or ClientDetail can fetch its own. ClientDetail has its own loadData.

fs.writeFileSync(targetFile, content);
console.log('Modified ClientModule.jsx');
