import { dataService } from './src/services/dataService.js';

async function test() {
  try {
    const staff = await dataService.getStaff();
    const marco = staff.find(s => s.name.includes('Marco Silva'));
    if (!marco) {
      console.log('Marco not found');
      return;
    }
    console.log('Testing for:', marco.id, marco.name);
    
    const stats = await dataService.getStaffProfileStats(marco.id);
    console.log('Stats:', JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
test();
