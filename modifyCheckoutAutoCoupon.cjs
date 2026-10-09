const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'CheckoutPOS.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

const effectTarget = "  useEffect(() => {\r\n    setTotalAppsInCheckout([...bundledApps, ...linkedApps]);\r\n  }, [bundledApps, linkedApps]);";
const effectTargetAlt = "  useEffect(() => {\n    setTotalAppsInCheckout([...bundledApps, ...linkedApps]);\n  }, [bundledApps, linkedApps]);";

const autoCouponEffect = `
  useEffect(() => {
    setTotalAppsInCheckout([...bundledApps, ...linkedApps]);
  }, [bundledApps, linkedApps]);

  // Auto-apply coupon from metadata
  useEffect(() => {
    if (selectedApp?.metadata?.coupon_id && clientCoupons.length > 0 && !activeCoupon) {
      const autoCoupon = clientCoupons.find(c => c.id === selectedApp.metadata.coupon_id);
      if (autoCoupon) {
        setActiveCoupon(autoCoupon);
        // Calculate discount
        const sPrice = totalAppsInCheckout.reduce((acc, app) => acc + (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0)), 0);
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
        setCouponDiscount(discount);
        showToast(\`Cupón automático aplicado: \${autoCoupon.prize_name}\`, "success");
      }
    }
  }, [selectedApp, clientCoupons, totalAppsInCheckout, activeCoupon, selectedWasherId, washCount, allStaff]);
`;

content = content.replace(effectTarget, autoCouponEffect);
if (content.indexOf(autoCouponEffect) === -1) {
  content = content.replace(effectTargetAlt, autoCouponEffect);
}

fs.writeFileSync(targetFile, content);
console.log('Added auto-apply coupon effect to CheckoutPOS.jsx');
