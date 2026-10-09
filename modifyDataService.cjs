const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'services', 'dataService.js');
let content = fs.readFileSync(targetFile, 'utf8');

// We will append the new functions at the end of the file, just before the closing brace of dataService
const newFunctions = `
  // Roulette Prizes (Stored in service_extras table as a hack to avoid schema changes)
  async getRoulettePrizes() {
    const { data, error } = await supabase.from('service_extras').select('*').like('name', 'ROULETTE_PRIZE:%');
    if (error) throw error;
    return _asArray(data).map(p => ({
      ...p,
      prize_name: p.name.replace('ROULETTE_PRIZE:', '')
    }));
  },

  async addRoulettePrize(prizeName) {
    const { data, error } = await supabase.from('service_extras').insert([{ name: 'ROULETTE_PRIZE:' + prizeName, price: 0, cost: 0 }]).select().single();
    if (error) throw error;
    return { ...data, prize_name: prizeName };
  },

  async removeRoulettePrize(id) {
    const { error } = await supabase.from('service_extras').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
`;

// Insert the new functions before "async wipeData() {"
content = content.replace(
  "  async wipeData() {",
  newFunctions + "\n  async wipeData() {"
);

fs.writeFileSync(targetFile, content);
console.log('Modified dataService.js successfully');
