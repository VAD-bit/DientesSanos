const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'CheckoutPOS.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add helper function outside or inside component? Let's add it before the component declaration.
const helperFn = `
const calculateCouponDiscount = (coupon, apps, washes, wRate) => {
  if (!coupon || !coupon.prize_name) return 0;
  
  const sPrice = apps.reduce((acc, app) => acc + (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0)), 0);

  const name = coupon.prize_name.toUpperCase();
  
  if (name.includes('% DESCUENTO')) {
    const match = name.match(/(\\d+)%/);
    if (match) {
       return sPrice * (parseInt(match[1]) / 100);
    }
  }
  
  if (name.startsWith('PREMIO:')) {
    const target = name.replace('PREMIO:', '').trim();
    if (target.includes('CORTE')) {
      const corteApp = apps.find(a => a.services?.name?.toUpperCase().includes('CORTE'));
      return corteApp ? (corteApp.total_price || corteApp.services?.price || 0) : 0;
    } else if (target.includes('LAVADO')) {
      return washes * (wRate || 1);
    } else if (target.includes('BARBA') || target.includes('CEJAS')) {
      const extraApp = apps.find(a => a.services?.name?.toUpperCase().includes(target));
      return extraApp ? (extraApp.total_price || extraApp.services?.price || 0) : 0;
    } else {
      return 0; 
    }
  }

  // Fallback
  if (name.includes('10%')) return sPrice * 0.1;
  if (name.includes('CORTE')) {
    const corteApp = apps.find(a => a.services?.name?.toUpperCase().includes('CORTE'));
    return corteApp ? (corteApp.total_price || corteApp.services?.price || 0) : 0;
  }
  if (name.includes('LAVADO')) return washes * (wRate || 1);
  return 5;
};

const CheckoutPOS =`;

content = content.replace("const CheckoutPOS =", helperFn);

// 2. Replace auto-apply logic
const autoApplyTarget = `        const sPrice = totalAppsInCheckout.reduce((acc, app) => acc + (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0)), 0);
        const wRate = allStaff.find(s => s.id === selectedWasherId) ? Number(allStaff.find(s => s.id === selectedWasherId).washing_rate || 0) : 0;
        let discount = 0;
        if (autoCoupon.prize_name?.includes('10%')) {
          discount = sPrice * 0.1;
        } else if (autoCoupon.prize_name?.toLowerCase().includes('corte')) {
          const corteApp = totalAppsInCheckout.find(a => a.services?.name?.toLowerCase().includes('corte'));
          discount = corteApp ? (corteApp.total_price || corteApp.services?.price || 0) : 0;
        } else if (autoCoupon.prize_name?.toLowerCase().includes('lavado')) {
          discount = washCount * (wRate || 1);
        } else {
          discount = 5; // fallback
        }
        setCouponDiscount(discount);`;

const discountCall = `        const wRate = allStaff.find(s => s.id === selectedWasherId) ? Number(allStaff.find(s => s.id === selectedWasherId).washing_rate || 0) : 0;
        const discount = calculateCouponDiscount(autoCoupon, totalAppsInCheckout, washCount, wRate);
        setCouponDiscount(discount);`;

content = content.replace(autoApplyTarget, discountCall);

// 3. Replace click logic
const clickTarget = `                                  const sPrice = totalAppsInCheckout.reduce((acc, app) => acc + (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0)), 0);
                                  const wRate = allStaff.find(s => s.id === selectedWasherId) ? Number(allStaff.find(s => s.id === selectedWasherId).washing_rate || 0) : 0;
                                  if (c.prize_name?.includes('10%')) {
                                    setCouponDiscount(sPrice * 0.1);
                                  } else if (c.prize_name?.toLowerCase().includes('corte')) {
                                    const corteApp = totalAppsInCheckout.find(a => a.services?.name?.toLowerCase().includes('corte'));
                                    setCouponDiscount(corteApp ? (corteApp.total_price || corteApp.services?.price || 0) : 0);
                                  } else if (c.prize_name?.toLowerCase().includes('lavado')) {
                                    setCouponDiscount(washCount * (wRate || 1));
                                  } else {
                                    setCouponDiscount(5);
                                  }`;

const clickReplacement = `                                  const wRate = allStaff.find(s => s.id === selectedWasherId) ? Number(allStaff.find(s => s.id === selectedWasherId).washing_rate || 0) : 0;
                                  const discount = calculateCouponDiscount(c, totalAppsInCheckout, washCount, wRate);
                                  setCouponDiscount(discount);`;

content = content.replace(clickTarget, clickReplacement);

// 4. Replace manual code logic
const manualTarget = `                                const sPrice = totalAppsInCheckout.reduce((acc, app) => acc + (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0)), 0);
                                const wRate = allStaff.find(s => s.id === selectedWasherId) ? Number(allStaff.find(s => s.id === selectedWasherId).washing_rate || 0) : 0;
                                if (found.prize_name?.includes('10%')) {
                                  setCouponDiscount(sPrice * 0.1);
                                } else if (found.prize_name?.toLowerCase().includes('corte')) {
                                  const corteApp = totalAppsInCheckout.find(a => a.services?.name?.toLowerCase().includes('corte'));
                                  setCouponDiscount(corteApp ? (corteApp.total_price || corteApp.services?.price || 0) : 0);
                                } else if (found.prize_name?.toLowerCase().includes('lavado')) {
                                  setCouponDiscount(washCount * (wRate || 1));
                                } else {
                                  setCouponDiscount(5);
                                }`;

const manualReplacement = `                                const wRate = allStaff.find(s => s.id === selectedWasherId) ? Number(allStaff.find(s => s.id === selectedWasherId).washing_rate || 0) : 0;
                                const discount = calculateCouponDiscount(found, totalAppsInCheckout, washCount, wRate);
                                setCouponDiscount(discount);`;

content = content.replace(manualTarget, manualReplacement);

fs.writeFileSync(targetFile, content);
console.log('CheckoutPOS updated with shared coupon discount logic');
