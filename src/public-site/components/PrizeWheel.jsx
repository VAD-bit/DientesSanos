import { useState, useRef, useEffect } from 'react';
import { Cake, PartyPopper, Gift, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { publicService } from '../services/publicService';
import pandaLogo from '../../assets/panda_logo_black.png';

const FALLBACK_PRIZES = [
  { name: '10% Descuento', weight: 80, color: '#1a1a1d' },
  { name: 'Limpieza Premium', weight: 15, color: '#121214' },
  { name: 'Blanqueamiento Gratis', weight: 5, color: '#1a1a1d' }
];

const PRESET_COLORS = ['#1a1a1d', '#121214'];

export default function PrizeWheel({ clientId, onWin, externalPrizes, onGenerateCoupon }) {
  const [spinning, setSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [dbPrizes, setDbPrizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wheelRotation, setWheelRotation] = useState(0);
  const wheelRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (externalPrizes) {
      if (externalPrizes.length > 0) {
        setDbPrizes(externalPrizes.map((p, i) => ({
          name: p.name?.replace('ROULETTE_PRIZE:', '') || p,
          weight: 10,
          color: PRESET_COLORS[i % PRESET_COLORS.length]
        })));
      } else {
        setDbPrizes(FALLBACK_PRIZES);
      }
      setLoading(false);
      return;
    }

    publicService.getRoulettePrizes().then(data => {
      if (data && data.length > 0) {
        setDbPrizes(data.map((p, i) => ({
          name: p.name.replace('ROULETTE_PRIZE:', ''),
          weight: 10,
          color: PRESET_COLORS[i % PRESET_COLORS.length]
        })));
      } else {
        setDbPrizes(FALLBACK_PRIZES);
      }
      setLoading(false);
    });
  }, [externalPrizes]);

  const getWeightedPrizeIndex = () => {
    const totalWeight = dbPrizes.reduce((acc, p) => acc + p.weight, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < dbPrizes.length; i++) {
      r -= dbPrizes[i].weight;
      if (r <= 0) return i;
    }
    return 0;
  };

  const handleSpin = async () => {
    if (spinning || wonPrize || dbPrizes.length === 0) return;

    setSpinning(true);
    const winIndex = getWeightedPrizeIndex();
    const prize = dbPrizes[winIndex];

    const segmentAngle = 360 / dbPrizes.length;
    const targetAngle = segmentAngle * winIndex + segmentAngle / 2;
    const extraRotations = 360 * 8; // 8 spins for maximum tension
    const finalRotation = wheelRotation + extraRotations + (360 - targetAngle) - (wheelRotation % 360);
    
    setWheelRotation(finalRotation);

    setTimeout(async () => {
      setSpinning(false);
      setWonPrize(prize);
      confetti({
        particleCount: 250,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#111111', '#ffffff', '#1a1a1d', '#111111', '#8B5C1A']
      });
      try {
        let couponData;
        if (clientId === 'preview') {
          couponData = { id: 'PREVIEW-VIP-123' };
        } else if (onGenerateCoupon) {
          couponData = await onGenerateCoupon(prize.name);
        } else {
          couponData = await publicService.generateCoupon(clientId, prize.name);
        }
        setCoupon(couponData);
        if (onWin) onWin(prize.name);
      } catch (e) {
        console.error('Error generating coupon:', e);
      }
    }, 7100);
  };

  const handleMouseMove = (e) => {
    if (spinning || wonPrize) return; // Freeze 3D effect while spinning or won
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left - bounds.width / 2;
    const y = e.clientY - bounds.top - bounds.height / 2;
    // Calculate rotation limits (max 15 degrees)
    const rotateX = -(y / (bounds.height / 2)) * 10;
    const rotateY = (x / (bounds.width / 2)) * 10;
    setMousePos({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center gap-3">
        <div className="w-40 h-40 rounded-full bg-white/5 animate-pulse" />
        <div className="w-32 h-3 rounded-full bg-white/5 animate-pulse" />
      </div>
    );
  }

  const segmentAngle = 360 / dbPrizes.length;
  const gradientStops = dbPrizes.map((p, i) => {
    const start = i * segmentAngle;
    const end = (i + 1) * segmentAngle;
    return `${p.color} ${start}deg ${end - 0.5}deg, rgba(17, 17, 17, 0.4) ${end - 0.5}deg ${end}deg`;
  }).join(', ');
  const wheelBackground = `conic-gradient(${gradientStops})`;

  // Generate 72 tick marks (every 5 degrees)
  const ticks = Array.from({ length: 72 }).map((_, i) => i * 5);

  return (
    <div 
      className="vip-wheel-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="vw-glow vw-glow-1" style={{ transform: `translate(${mousePos.y * 2}px, ${-mousePos.x * 2}px)` }} />
      <div className="vw-glow vw-glow-2" style={{ transform: `translate(${-mousePos.y * 2}px, ${mousePos.x * 2}px)` }} />

      {/* Birthday confetti particles */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className={`vw-confetti vw-confetti-${i % 6}`} style={{
          left: `${(i * 37 + 11) % 90 + 5}%`,
          animationDelay: `${(i * 0.4) % 3}s`,
          animationDuration: `${3 + (i % 4) * 0.7}s`
        }} />
      ))}

      <div className="vw-header">
        <PartyPopper size={18} color="#111111" />
        <h2 className="vw-shimmer-text">REGALO DE CUMPLEAÑOS</h2>
        <Cake size={18} color="#111111" />
      </div>
      <p className="vw-subtitle">¡Gira la ruleta y descubre tu premio especial!</p>

      <div className="vw-content">
        {!wonPrize ? (
          <div className={`vw-wheel-wrapper ${spinning ? 'is-spinning' : ''}`}>
            
            {/* The Mechanical Pointer (Needle) */}
            <div className={`vw-pointer ${spinning ? 'vw-pointer-ticking' : ''}`}>
              <div className="vw-pointer-head" />
              <div className="vw-pointer-base" />
            </div>

            {/* The Wheel */}
            <div className="vw-wheel-outer-bezel">
              {/* Watch Ticks */}
              <div className="vw-ticks-container">
                {ticks.map(deg => (
                  <div key={deg} className={`vw-tick ${deg % 30 === 0 ? 'vw-tick-major' : ''}`} style={{ transform: `rotate(${deg}deg)` }} />
                ))}
              </div>

              <div 
                ref={wheelRef}
                className="vw-wheel"
                style={{
                  background: wheelBackground,
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: spinning ? 'transform 7s cubic-bezier(0.05, 0.95, 0.15, 1)' : 'none'
                }}
              >
                {/* Sector Texts */}
                {dbPrizes.map((p, i) => {
                  const rot = segmentAngle * i + segmentAngle / 2;
                  return (
                    <div 
                      key={i} 
                      className="vw-sector-text"
                      style={{ transform: `rotate(${rot}deg) translateY(-100px)` }}
                    >
                      {p.name}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reactor Center Button */}
            <button 
              className={`vw-spin-btn ${spinning ? 'spinning' : ''}`}
              onClick={handleSpin}
              disabled={spinning}
            >
              <div className="vw-spin-btn-inner">
                {spinning ? <div className="vw-reactor-core" /> : 'GIRAR'}
              </div>
            </button>
          </div>
        ) : (
          /* VICTORY STATE: BIRTHDAY TICKET */
          <div className="vw-golden-ticket animate-ticket-flip">
            <div className="vw-ticket-hologram" />
            {/* Birthday candles decoration */}
            <div className="vw-candles-row">
              {[0,1,2].map(i => (
                <div key={i} className="vw-candle">
                  <div className="vw-candle-body" />
                  <div className="vw-candle-flame" style={{ animationDelay: `${i * 0.15}s` }} />
                </div>
              ))}
            </div>

            <div className="vw-ticket-header">
              <Sparkles size={28} className="vw-star-pulse" color="#111111" style={{ margin: '0 auto 8px', display: 'block' }} />
              <h3>¡FELIZ CUMPLEAÑOS!</h3>
              <p>Tu regalo de hoy te espera</p>
            </div>

            <div className="vw-ticket-prize vw-shimmer-text">
              {wonPrize.name}
            </div>

            {coupon && (
              <div className="vw-ticket-coupon">
                <div className="vw-tc-label">TU CUPÓN</div>
                <div className="vw-tc-code">{coupon.id?.substring(0, 8).toUpperCase()}</div>
                <div className="vw-tc-desc">Muéstrale este código a tu odontólogo al llegar.</div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        /* ── CONTAINER ── */
        .vip-wheel-container {
          position: relative;
          background: linear-gradient(145deg, #121014, #060408);
          border: 1px solid rgba(17, 17, 17, 0.2);
          border-radius: 36px;
          padding: 40px 20px;
          margin: 20px auto;
          max-width: 440px;
          overflow: hidden;
          box-shadow: inset 0 0 120px rgba(0,0,0,0.9), 0 30px 60px rgba(0,0,0,0.8), 0 0 60px rgba(17, 17, 17, 0.08);
          text-align: center;
        }

        /* ── BIRTHDAY CONFETTI PARTICLES ── */
        .vw-confetti {
          position: absolute;
          top: -10px;
          width: 7px; height: 7px;
          border-radius: 1px;
          pointer-events: none;
          animation: confettiFall linear infinite;
          opacity: 0.6;
          z-index: 1;
        }
        .vw-confetti-0 { background: #111111; border-radius: 50%; }
        .vw-confetti-1 { background: #e07070; }
        .vw-confetti-2 { background: #70b5e0; border-radius: 50%; }
        .vw-confetti-3 { background: #111111; width: 5px; height: 10px; }
        .vw-confetti-4 { background: #90d09a; }
        .vw-confetti-5 { background: #e0c070; border-radius: 50%; }
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.4; }
          100% { transform: translateY(600px) rotate(540deg); opacity: 0; }
        }

        /* ── GLOWS (React to mouse) ── */
        .vw-glow {
          position: absolute;
          width: 300px; height: 300px;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
          transition: transform 0.1s ease-out;
        }
        .vw-glow-1 {
          background: rgba(17, 17, 17, 0.12);
          top: -80px; left: -80px;
        }
        .vw-glow-2 {
          background: rgba(255,255,255,0.05);
          bottom: -80px; right: -80px;
        }

        /* ── HEADER & SHIMMER ── */
        .vw-header {
          position: relative; z-index: 2;
          display: flex; justify-content: center; alignItems: center; gap: 12px;
          margin-bottom: 6px;
        }
        .vw-header h2 {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 5px;
          margin: 0;
        }
        .vw-subtitle {
          position: relative; z-index: 2;
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 40px;
          font-weight: 800;
        }

        .vw-shimmer-text {
          color: #111111;
          background: linear-gradient(90deg, #111111 0%, #ffffff 50%, #111111 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        @keyframes shimmer {
          to { background-position: 200% center; }
        }

        .vw-content {
          position: relative; z-index: 2;
          display: flex; justify-content: center;
        }

        /* ── WHEEL WRAPPER ── */
        .vw-wheel-wrapper {
          position: relative;
          width: 320px; height: 320px;
        }
        .vw-wheel-wrapper.is-spinning {
          animation: wheelStartShake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes wheelStartShake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        /* ── OUTER BEZEL (Rolex Metal) ── */
        .vw-wheel-outer-bezel {
          position: absolute; inset: 0;
          border-radius: 50%;
          background: conic-gradient(from 45deg, #111, #444, #111, #222, #555, #111);
          padding: 12px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.9), inset 0 2px 5px rgba(255,255,255,0.2), inset 0 -2px 5px rgba(0,0,0,0.8);
        }

        /* ── WATCH TICKS ── */
        .vw-ticks-container {
          position: absolute; inset: 4px;
          border-radius: 50%;
          pointer-events: none;
        }
        .vw-tick {
          position: absolute;
          top: 0; left: 50%;
          width: 2px; height: 6px;
          background: rgba(17, 17, 17, 0.3);
          transform-origin: 50% 156px;
          margin-left: -1px;
        }
        .vw-tick-major {
          width: 4px; height: 10px;
          margin-left: -2px;
          background: #111111;
          box-shadow: 0 0 4px rgba(17, 17, 17, 0.8);
        }

        /* ── THE WHEEL ── */
        .vw-wheel {
          width: 100%; height: 100%;
          border-radius: 50%;
          position: relative;
          box-shadow: inset 0 0 50px rgba(0,0,0,0.95);
          border: 1px solid rgba(0,0,0,0.9);
          overflow: hidden;
        }

        /* ── SECTOR TEXT ── */
        .vw-sector-text {
          position: absolute;
          top: 50%; left: 50%;
          width: 140px;
          margin-left: -70px;
          margin-top: -6px;
          transform-origin: center;
          text-align: center;
          color: #e5d9c5;
          font-weight: 900;
          font-size: 11px;
          letter-spacing: 1px;
          text-transform: uppercase;
          text-shadow: 0 4px 6px rgba(0,0,0,1);
        }

        /* ── MECHANICAL POINTER ── */
        .vw-pointer {
          position: absolute;
          top: -28px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          filter: drop-shadow(0 15px 15px rgba(0,0,0,0.8));
          transform-origin: top center;
        }
        .vw-pointer-ticking {
          animation: tickBounce 0.05s infinite alternate;
        }
        @keyframes tickBounce {
          0% { transform: translateX(-50%) rotate(0deg); }
          100% { transform: translateX(-50%) rotate(-4deg) translateY(-2px); }
        }
        .vw-pointer-base {
          width: 32px; height: 16px;
          background: linear-gradient(180deg, #f5e6d3, #8B5C1A);
          border-radius: 16px 16px 0 0;
          box-shadow: inset 0 3px 4px rgba(255,255,255,0.6), 0 -2px 10px rgba(17, 17, 17, 0.3);
          border: 1px solid #111111;
        }
        .vw-pointer-head {
          width: 0; height: 0;
          border-left: 14px solid transparent;
          border-right: 14px solid transparent;
          border-top: 30px solid #111111;
          margin-bottom: -6px;
          position: relative;
        }
        .vw-pointer-head::after {
          content: ''; position: absolute;
          top: -30px; left: -14px;
          border-left: 14px solid transparent;
          border-right: 14px solid transparent;
          border-top: 30px solid rgba(255,255,255,0.3);
          pointer-events: none;
        }

        /* ── REACTOR BUTTON ── */
        .vw-spin-btn {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 86px; height: 86px;
          border-radius: 50%;
          background: linear-gradient(145deg, #0a0a0c, #1c1c1e);
          border: 3px solid #000;
          padding: 6px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.9), inset 0 2px 5px rgba(255,255,255,0.1);
          z-index: 5;
          cursor: pointer;
          transition: box-shadow 0.2s ease;
        }
        .vw-spin-btn:not(.spinning):hover {
          box-shadow: 0 0 30px rgba(17, 17, 17, 0.4), 0 20px 40px rgba(0,0,0,0.9);
        }
        .vw-spin-btn:not(.spinning):active {
          box-shadow: 0 0 50px rgba(17, 17, 17, 0.6), 0 10px 20px rgba(0,0,0,0.9);
        }
        .vw-spin-btn-inner {
          width: 100%; height: 100%;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #2c2c2e, #0a0a0c);
          border: 2px solid rgba(17, 17, 17, 0.4);
          display: flex; justify-content: center; align-items: center;
          color: #111111;
          font-weight: 900;
          font-size: 14px;
          letter-spacing: 3px;
          box-shadow: inset 0 4px 10px rgba(255,255,255,0.05);
        }
        .vw-spin-btn:not(.spinning) .vw-spin-btn-inner {
          animation: pulseRing 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
        }
        @keyframes pulseRing {
          0%, 100% { border-color: rgba(17, 17, 17, 0.2); box-shadow: 0 0 0 rgba(17, 17, 17, 0); }
          50% { border-color: rgba(17, 17, 17, 0.8); box-shadow: inset 0 0 15px rgba(17, 17, 17, 0.3); }
        }
        
        .vw-reactor-core {
          width: 24px; height: 24px;
          border-radius: 50%;
          background: #111111;
          box-shadow: 0 0 20px #111111, 0 0 40px #fff;
          animation: pulseCore 0.5s infinite alternate;
        }
        @keyframes pulseCore {
          0% { transform: scale(0.8); opacity: 0.7; }
          100% { transform: scale(1.2); opacity: 1; }
        }

        /* ── BIRTHDAY CANDLES ── */
        .vw-candles-row {
          display: flex; justify-content: center; gap: 18px;
          margin-bottom: 24px;
        }
        .vw-candle {
          display: flex; flex-direction: column; align-items: center; gap: 0;
        }
        .vw-candle-body {
          width: 8px; height: 28px;
          background: linear-gradient(180deg, #e5c97a, #c4973a);
          border-radius: 2px 2px 0 0;
          box-shadow: inset 0 0 4px rgba(255,255,255,0.3);
        }
        .vw-candle-flame {
          width: 10px; height: 16px;
          background: radial-gradient(ellipse at 50% 80%, #fff 0%, #111111 40%, #FF6B00 70%, transparent 100%);
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          margin-bottom: -2px;
          filter: blur(0.5px);
          animation: flicker 0.8s ease-in-out infinite alternate;
        }
        @keyframes flicker {
          0%   { transform: scaleX(1) scaleY(1) rotate(-1deg);   opacity: 1; }
          50%  { transform: scaleX(0.85) scaleY(1.1) rotate(1deg); opacity: 0.9; }
          100% { transform: scaleX(1.05) scaleY(0.95) rotate(-2deg); opacity: 1; }
        }

        /* ── VIP TICKET (VICTORY) ── */
        .vw-golden-ticket {
          width: 100%;
          background: linear-gradient(135deg, #161618 0%, #050507 100%);
          border: 1px solid rgba(17, 17, 17, 0.4);
          border-radius: 28px;
          padding: 40px 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 40px 80px rgba(0,0,0,0.9), inset 0 2px 2px rgba(255,255,255,0.1);
        }
        .animate-ticket-flip {
          animation: ticketFlip 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes ticketFlip {
          0% { opacity: 0; transform: perspective(1200px) rotateY(-180deg) scale(0.5); }
          100% { opacity: 1; transform: perspective(1200px) rotateY(0deg) scale(1); }
        }

        .vw-ticket-hologram {
          position: absolute; inset: -50%;
          background: linear-gradient(45deg, transparent 40%, rgba(17, 17, 17, 0.15) 50%, transparent 60%);
          background-size: 300% 300%;
          animation: holoMove 3s infinite linear;
          pointer-events: none;
        }
        @keyframes holoMove {
          0% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }

        .vw-star-pulse {
          animation: starPulse 2s infinite;
        }
        @keyframes starPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(17, 17, 17, 0.5)); }
          50% { transform: scale(1.2); filter: drop-shadow(0 0 15px rgba(17, 17, 17, 1)); }
        }

        .vw-ticket-header h3 { font-weight: 950; font-size: 20px; letter-spacing: 3px; color: #fff; margin: 0 0 8px 0; }
        .vw-ticket-header p { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 900; letter-spacing: 2px; margin: 0; }

        .vw-ticket-prize { font-size: 24px; font-weight: 950; margin: 32px 0; text-transform: uppercase; }

        .vw-ticket-coupon {
          background: rgba(0,0,0,0.6);
          border-radius: 16px;
          padding: 24px;
          border: 1px dashed rgba(17, 17, 17, 0.3);
          margin-bottom: 32px;
          position: relative;
          backdrop-filter: blur(10px);
        }
        .vw-ticket-coupon::before, .vw-ticket-coupon::after {
          content: ''; position: absolute; top: 50%; transform: translateY(-50%);
          width: 20px; height: 20px; background: #0a0a0c; border-radius: 50%;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }
        .vw-ticket-coupon::before { left: -10px; border-right: 1px solid rgba(17, 17, 17, 0.1); }
        .vw-ticket-coupon::after { right: -10px; border-left: 1px solid rgba(17, 17, 17, 0.1); }

        .vw-tc-label { font-size: 10px; color: #111111; font-weight: 900; letter-spacing: 3px; margin-bottom: 8px; }
        .vw-tc-code { font-family: monospace; font-size: 32px; font-weight: 950; color: #fff; letter-spacing: 6px; text-shadow: 0 0 10px rgba(255,255,255,0.3); }
        .vw-tc-desc { font-size: 9px; color: rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; margin-top: 12px; }

        .vw-ticket-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(90deg, #111111, #e5d9c5); color: #000; 
          padding: 16px; border-radius: 14px;
          font-size: 13px; font-weight: 950; text-transform: uppercase; letter-spacing: 2px;
          transition: all 0.3s cubic-bezier(0.2,0.8,0.2,1);
          box-shadow: 0 10px 20px rgba(17, 17, 17, 0.2);
        }
        .vw-ticket-btn:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 15px 30px rgba(17, 17, 17, 0.4); }
        .vw-ticket-btn:active { transform: translateY(1px); }
      `}</style>
    </div>
  );
}
