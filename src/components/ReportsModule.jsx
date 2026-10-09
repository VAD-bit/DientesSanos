import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  Scissors, 
  TrendingUp, 
  Download,
  Clock,
  ChevronDown,
  X,
  Loader2
} from 'lucide-react';
import { dataService } from '../services/dataService';
import PandaDatePicker from './PandaDatePicker';
import PandaSelect from './PandaSelect';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../assets/logo.png';
import coverBg from '../assets/panda-barbershop-interior.png';

const DEFAULT_WASHING_RATE_USD = 1;
const WASH_ASSISTANT_SHARE = 0.60;

// Etiquetas visibles de rol (los valores/keys internos NO cambian).
const roleLabel = (value) => String(value ?? '')
  .replace(/Asistente de Lavado/gi, 'Asistente Dental')
  .replace(/Barbero/gi, 'Odontólogo')
  .replace(/Tatuador/gi, 'Especialista')
  .replace(/Odontologos/gi, 'Odontólogos');

const ReportsModule = ({ isMobile, rates, staff = [] }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const reportRef = useRef(null);
  const [dateRange, setDateRange] = useState('all'); // 'today', 'week', 'month', 'custom', 'all'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedWeek, setSelectedWeek] = useState(null); // timestamp of week start
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedAssistant, setSelectedAssistant] = useState('all');
  const [chartGranularity, setChartGranularity] = useState('week'); // 'day', 'week', 'month'
  const [hoveredTimelinePoint, setHoveredTimelinePoint] = useState(null);
  const [hoveredHourPoint, setHoveredHourPoint] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  useEffect(() => {
    fetchData();
  }, []);

  // ---------- Week selector logic ----------
  const weeks = React.useMemo(() => {
    if (!transactions.length) return [];
    // Determine overall range
    const dates = transactions.map(t => new Date(t.created_at));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    // Align to start of week (Monday)
    const start = new Date(min);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday as first day
    const weeksArr = [];
    let cur = new Date(start);
    while (cur <= max) {
      const weekStart = new Date(cur);
      const weekEnd = new Date(cur);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weeksArr.push({
        start: weekStart,
        end: weekEnd,
        label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
      });
      cur.setDate(cur.getDate() + 7);
    }
    return weeksArr;
  }, [transactions]);

  const handleWeekClick = (week) => {
    const startStr = week.start.toISOString().split('T')[0];
    const endStr = week.end.toISOString().split('T')[0];
    setDateRange('custom');
    setCustomStartDate(startStr);
    setCustomEndDate(endStr);
    setSelectedWeek(week.start.getTime());
  };

  const handleCaptureFullPage = async () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      let logoImg = null;
      try {
        logoImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = logo;
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(e);
        });
      } catch (e) {
        console.warn("No se pudo cargar el logo para el PDF:", e);
      }

      let coverBgImg = null;
      try {
        coverBgImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = coverBg;
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(e);
        });
      } catch (e) {
        console.warn("No se pudo cargar la imagen de portada:", e);
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const dateLabel = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
      const hours12 = now.getHours() % 12 || 12;
      const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
      const timeLabel = `${pad(hours12)}:${pad(now.getMinutes())} ${ampm}`;

      const champagne = [203, 183, 154];
      const champagneLight = [224, 207, 186];
      const champagneDark = [168, 135, 93];
      const bgDark = [10, 10, 12];
      const bgCard = [18, 18, 21];
      const bgCardAlt = [22, 22, 25];
      const textMuted = [130, 130, 138];
      const textSecondary = [180, 180, 186];

      const rangeText = dateRange === 'all' ? 'Histórico Total' :
                        dateRange === 'today' ? 'Hoy' :
                        dateRange === 'week' ? 'Esta Semana' :
                        dateRange === 'month' ? 'Este Mes' :
                        `Personalizado (${customStartDate} a ${customEndDate})`;
      const serviceName = selectedService === 'all' ? 'Todos los Servicios' : selectedService;
      const staffName = selectedStaff === 'all' ? 'Todo el Personal' :
                        (staff.find(s => String(s.id) === String(selectedStaff))?.name || selectedStaff);

      // ═══════════════════════════════════════════
      // PAGE 1: COVER
      // ═══════════════════════════════════════════
      // Background photo
      if (coverBgImg) {
        const imgRatio = coverBgImg.width / (coverBgImg.height || 1);
        const pageW = 210, pageH = 297;
        let drawW, drawH, drawX, drawY;
        if (imgRatio > pageW / pageH) {
          drawH = pageH;
          drawW = drawH * imgRatio;
          drawX = (pageW - drawW) / 2;
          drawY = 0;
        } else {
          drawW = pageW;
          drawH = drawW / imgRatio;
          drawX = 0;
          drawY = (pageH - drawH) / 2;
        }
        pdf.addImage(coverBgImg, 'PNG', drawX, drawY, drawW, drawH);
      } else {
        pdf.setFillColor(...bgDark);
        pdf.rect(0, 0, 210, 297, 'F');
      }

      // Dark overlay for text readability
      pdf.setFillColor(10, 10, 12);
      try {
        pdf.setGState(new jsPDF.GState({ opacity: 0.72 }));
        pdf.rect(0, 0, 210, 297, 'F');
        pdf.setGState(new jsPDF.GState({ opacity: 1 }));
      } catch (_) {
        pdf.rect(0, 0, 210, 297, 'F');
      }

      // Top champagne accent line
      pdf.setFillColor(...champagne);
      pdf.rect(0, 0, 210, 1.5, 'F');

      // Logo centered (larger)
      if (logoImg) {
        const aspectRatio = logoImg.width / (logoImg.height || 1);
        let logoH = 42;
        let logoW = logoH * aspectRatio;
        if (logoW > 100) { logoW = 100; logoH = logoW / aspectRatio; }
        const logoX = (210 - logoW) / 2;
        pdf.addImage(logoImg, 'PNG', logoX, 48, logoW, logoH);
      }

      // Brand name - BOLD & BIG
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(38);
      pdf.setTextColor(255, 255, 255);
      pdf.text("DIENTES SANOS", 105, 112, { align: 'center' });

      // Champagne line separator
      pdf.setFillColor(...champagne);
      pdf.rect(65, 119, 80, 0.6, 'F');

      // Subtitle
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(13);
      pdf.setTextColor(...champagneLight);
      pdf.text("Centro de Analítica y Rendimiento Operativo", 105, 130, { align: 'center' });

      // Report type badge
      pdf.setFillColor(10, 10, 12);
      try { pdf.setGState(new jsPDF.GState({ opacity: 0.6 })); } catch (_) {}
      const badgeW = 85;
      pdf.roundedRect((210 - badgeW) / 2, 143, badgeW, 12, 3, 3, 'F');
      try { pdf.setGState(new jsPDF.GState({ opacity: 1 })); } catch (_) {}
      pdf.setDrawColor(...champagne);
      pdf.setLineWidth(0.3);
      pdf.roundedRect((210 - badgeW) / 2, 143, badgeW, 12, 3, 3, 'S');
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...champagne);
      pdf.text("REPORTE EJECUTIVO", 105, 150.5, { align: 'center' });

      // Info cards on cover
      const coverCardY = 168;
      const coverCardW = 52;
      const coverCardGap = 4.5;
      const coverCardStartX = (210 - (coverCardW * 3 + coverCardGap * 2)) / 2;
      let maxCardH = 26;

      [
        { label: 'PERÍODO', value: rangeText },
        { label: 'SERVICIO', value: serviceName },
        { label: 'EQUIPO', value: staffName }
      ].forEach((item, i) => {
        const cx = coverCardStartX + i * (coverCardW + coverCardGap);
        const valLines = pdf.splitTextToSize(item.value, coverCardW - 8);
        const cardH = Math.max(26, 22 + valLines.length * 4);
        if (cardH > maxCardH) maxCardH = cardH;

        // Card background
        pdf.setFillColor(10, 10, 12);
        try { pdf.setGState(new jsPDF.GState({ opacity: 0.55 })); } catch (_) {}
        pdf.roundedRect(cx, coverCardY, coverCardW, cardH, 3, 3, 'F');
        try { pdf.setGState(new jsPDF.GState({ opacity: 1 })); } catch (_) {}
        pdf.setDrawColor(...champagneDark);
        pdf.setLineWidth(0.2);
        pdf.roundedRect(cx, coverCardY, coverCardW, cardH, 3, 3, 'S');

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(...champagneDark);
        pdf.text(item.label, cx + coverCardW / 2, coverCardY + 7, { align: 'center' });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        pdf.text(valLines, cx + coverCardW / 2, coverCardY + 14, { align: 'center' });
      });

      // Bottom cover info — positioned below tallest card
      const bottomInfoY = Math.min(coverCardY + maxCardH + 12, 255);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...textMuted);
      pdf.text(`Generado el ${dateLabel} a las ${timeLabel}`, 105, bottomInfoY, { align: 'center' });

      // Bottom champagne accent line
      pdf.setFillColor(...champagne);
      pdf.rect(0, 295, 210, 2, 'F');

      // ═══════════════════════════════════════════
      // PAGE 2: KPIs + OVERVIEW
      // ═══════════════════════════════════════════
      pdf.addPage();
      const totalPages = 3;
      const initPageContent = (pageNum) => {
        pdf.setFillColor(...bgDark);
        pdf.rect(0, 0, 210, 297, 'F');

        // Header bar
        pdf.setFillColor(...bgCard);
        pdf.rect(0, 0, 210, 22, 'F');

        // Header branding
        if (logoImg) {
          const aR = logoImg.width / (logoImg.height || 1);
          let lH = 7; let lW = lH * aR;
          if (lW > 25) { lW = 25; lH = lW / aR; }
          pdf.addImage(logoImg, 'PNG', 15, (22 - lH) / 2, lW, lH);
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(255, 255, 255);
        pdf.text("DIENTES SANOS", 15 + (logoImg ? 28 : 0), 10);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(...textMuted);
        pdf.text("REPORTE EJECUTIVO", 15 + (logoImg ? 28 : 0), 15);

        // Page indicator
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        pdf.setTextColor(...textMuted);
        pdf.text(`${pageNum} / ${totalPages}`, 195, 14, { align: 'right' });

        // Bottom accent
        pdf.setFillColor(...champagne);
        pdf.rect(0, 295.5, 210, 1.5, 'F');

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(...textMuted);
        pdf.text(`Dientes Sanos  \u2022  Reporte ${dateLabel}  \u2022  ${timeLabel}`, 15, 293);
      };

      initPageContent(2);

      // Section title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.text("RESUMEN EJECUTIVO", 15, 34);

      pdf.setFillColor(...champagne);
      pdf.rect(15, 37, 25, 0.5, 'F');

      // KPI Cards — 3x2 grid, bigger and more premium
      const kpiCardW = 56;
      const kpiCardH = 24;
      const kpiGap = 5;
      const kpiStartX = 15;
      const kpiStartY = 44;

      const kpis = [
        { title: "TOTAL REF. $", value: `$${totalIncome.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, accent: true },
        { title: "TICKET PROMEDIO", value: `$${avgTicket.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, accent: false },
        { title: "PROMEDIO SEMANAL", value: `${weeklyAvg}`, accent: false },
        { title: "SERVICIOS", value: `${totalServices}`, accent: false },
        { title: "LIMPIEZAS", value: `${totalLavados}`, accent: false },
        { title: "RATIO LIMPIEZAS", value: `${washRatio.toFixed(1)}%`, accent: false }
      ];

      kpis.forEach((kpi, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const kx = kpiStartX + col * (kpiCardW + kpiGap);
        const ky = kpiStartY + row * (kpiCardH + kpiGap);

        // Card background
        pdf.setFillColor(...bgCard);
        pdf.roundedRect(kx, ky, kpiCardW, kpiCardH, 3, 3, 'F');

        // Left accent bar for first card
        if (kpi.accent) {
          pdf.setFillColor(...champagne);
          pdf.roundedRect(kx, ky, 1.5, kpiCardH, 1, 1, 'F');
        }

        // Label
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(...textMuted);
        pdf.text(kpi.title, kx + (kpi.accent ? 6 : 4), ky + 8);

        // Value
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(kpi.accent ? 203 : 255, kpi.accent ? 183 : 255, kpi.accent ? 154 : 255);
        pdf.text(kpi.value, kx + (kpi.accent ? 6 : 4), ky + 18);
      });

      // ═══ DESGLOSE OPERATIVO ═══
      const sectionY = 108;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255);
      pdf.text("DESGLOSE OPERATIVO", 15, sectionY);

      pdf.setFillColor(...champagne);
      pdf.rect(15, sectionY + 3, 20, 0.4, 'F');

      // Left: Servicios por Barbero
      const leftY = sectionY + 12;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...champagne);
      pdf.text("Servicios por Odontólogo", 15, leftY);

      let barberY = leftY + 8;
      barberServices.slice(0, 5).forEach((b, i) => {
        // Row background
        if (i % 2 === 0) {
          pdf.setFillColor(16, 16, 18);
          pdf.roundedRect(15, barberY - 4, 80, 10, 1.5, 1.5, 'F');
        }

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...textSecondary);
        pdf.text(String(b.name || ''), 18, barberY + 2);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${b.count}`, 88, barberY + 2, { align: 'right' });

        // Progress bar
        const barX = 18;
        const barW = 65;
        pdf.setFillColor(30, 30, 35);
        pdf.roundedRect(barX, barberY + 4, barW, 2, 1, 1, 'F');

        const pct = b.count / maxBarberCount;
        pdf.setFillColor(...champagne);
        pdf.roundedRect(barX, barberY + 4, Math.max(3, barW * pct), 2, 1, 1, 'F');

        barberY += 13;
      });

      // Right: Rendimiento por Día
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...champagne);
      pdf.text("Rendimiento por Día", 110, leftY);

      let dayY = leftY + 8;
      daysFlow.forEach((d, i) => {
        if (i % 2 === 0) {
          pdf.setFillColor(16, 16, 18);
          pdf.roundedRect(110, dayY - 4, 85, 10, 1.5, 1.5, 'F');
        }

        const dayLabel = d.name.charAt(0).toUpperCase() + d.name.slice(1);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...textSecondary);
        pdf.text(String(dayLabel || ''), 113, dayY + 2);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${d.count}`, 192, dayY + 2, { align: 'right' });

        const barX = 113;
        const barW = 68;
        pdf.setFillColor(30, 30, 35);
        pdf.roundedRect(barX, dayY + 4, barW, 2, 1, 1, 'F');

        const pct = d.count / maxDayCount;
        pdf.setFillColor(...champagne);
        pdf.roundedRect(barX, dayY + 4, Math.max(3, barW * pct), 2, 1, 1, 'F');

        dayY += 11;
      });

      // ═══ ASISTENTES DE LAVADO ═══
      const assistSectionY = 208;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.text("RENDIMIENTO DE ASISTENTES", 15, assistSectionY);

      pdf.setFillColor(...champagne);
      pdf.rect(15, assistSectionY + 3, 18, 0.4, 'F');

      const assistList = assistantReport.assistants || [];
      if (assistList.length === 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...textMuted);
        pdf.text("No hay registros de asistentes para este período.", 15, assistSectionY + 12);
      } else {
        let assistX = 15;
        assistList.slice(0, 3).forEach(as => {
          pdf.setFillColor(...bgCard);
          pdf.roundedRect(assistX, assistSectionY + 8, 56, 34, 3, 3, 'F');

          // Name with accent
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(...champagne);
          pdf.text(String(as.name || 'Asistente'), assistX + 5, assistSectionY + 18);

          // Stats
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.setTextColor(...textMuted);
          pdf.text(`Limpiezas: ${Math.round(as.lavados || 0)}`, assistX + 5, assistSectionY + 26);
          pdf.text(`Comisión: $${(as.comision || 0).toFixed(2)}`, assistX + 5, assistSectionY + 32);
          pdf.text(`Propinas: $${(as.propinas || 0).toFixed(2)}`, assistX + 5, assistSectionY + 38);

          assistX += 60;
        });
      }

      // ═══════════════════════════════════════════
      // PAGE 3: TRANSACTIONS TABLE
      // ═══════════════════════════════════════════
      pdf.addPage();
      initPageContent(3);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(255, 255, 255);
      pdf.text("HISTORIAL DE TRANSACCIONES", 15, 34);

      pdf.setFillColor(...champagne);
      pdf.rect(15, 37, 22, 0.4, 'F');

      // Table header
      pdf.setFillColor(28, 28, 32);
      pdf.roundedRect(15, 42, 180, 9, 2, 2, 'F');

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(...champagne);
      pdf.text("FECHA", 18, 48);
      pdf.text("DESCRIPCIÓN / SERVICIO", 50, 48);
      pdf.text("PERSONAL", 125, 48);
      pdf.text("MONTO", 192, 48, { align: 'right' });

      // Rows
      let rowY = 53;
      const tList = filteredTransactions.filter(t => t.type === 'income').slice(0, 30);
      const descColW = 70;
      const staffColX = 125;

      tList.forEach((t, idx) => {
        if (rowY > 275) return;

        const dateStr = new Date(t.created_at).toLocaleDateString('es-VE', {
          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        const staffInvolved = t.metadata?.staffInvolved || [];
        const staffNames = staffInvolved.map(s => s.name.split(' ')[0]).join(' + ') || 'N/A';

        // Wrap description text
        const descLines = pdf.splitTextToSize(t.description, descColW);
        const rowH = Math.max(7, descLines.length * 3.5 + 3);

        if (idx % 2 === 0) {
          pdf.setFillColor(16, 16, 18);
          pdf.roundedRect(15, rowY - 1, 180, rowH, 1, 1, 'F');
        }

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        pdf.setTextColor(...textSecondary);
        pdf.text(dateStr, 18, rowY + 4);
        pdf.text(descLines, 50, rowY + 4);
        pdf.text(staffNames, staffColX, rowY + 4);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`$${t.amount.toFixed(2)}`, 192, rowY + 4, { align: 'right' });

        rowY += rowH;
      });

      if (filteredTransactions.length > 30) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(7);
        pdf.setTextColor(...textMuted);
        pdf.text(`Mostrando las primeras 30 transacciones de un total de ${filteredTransactions.length}.`, 15, rowY + 6);
      }

      // ═══ SAVE ═══
      const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
      const rangeLabel = dateRange === 'all' ? 'Historico'
        : dateRange === 'today' ? 'Hoy'
        : dateRange === 'week' ? 'Semana'
        : dateRange === 'month' ? 'Mes'
        : 'Personalizado';

      pdf.save(`Dientes_Sanos_Reporte_${rangeLabel}_${dateStr}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await dataService.getTransactions();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Obtener lista única de servicios de las transacciones para el filtro
  const uniqueServicesList = (() => {
    const list = new Set();
    transactions.forEach(t => {
      if (t.type !== 'income') return;
      let serviceName = t.metadata?.serviceName;
      if (!serviceName) {
        const parts = t.description.split(' - ');
        if (parts.length >= 3 && parts[2].includes('Servi:')) {
          serviceName = parts[2].replace('Servi: ', '');
        } else {
          serviceName = 'Servicio dental';
        }
      }
      serviceName.split(/\s*[\+,\/]\s*/).map(s => s.trim()).filter(Boolean).forEach(s => list.add(s));
    });
    return Array.from(list).sort();
  })();

  const isBarberRole = (role = '') => {
    const normalizedRole = role.toLowerCase();
    const isExcluded = normalizedRole.includes('admin') || normalizedRole.includes('asistente') || normalizedRole.includes('lavado') || normalizedRole.includes('caja') || normalizedRole.includes('recepcion');
    return !isExcluded && (normalizedRole.includes('barber') || normalizedRole.includes('barbero'));
  };

  const isAssistantRole = (role = '') => {
    const normalizedRole = role.toLowerCase();
    return normalizedRole.includes('asistente') || normalizedRole.includes('lavado') || normalizedRole.includes('operaciones');
  };

  const reportStaffOptions = (() => {
    return staff
      .filter((s) => isBarberRole(s.role))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ value: s.id, label: s.name, imageUrl: s.image_url || s.avatar_url || '', avatarFallback: (s.name || '?').trim().charAt(0).toUpperCase(), subtitle: roleLabel((s.role || 'Barbero').split('|')[0]) }));
  })();

  const assistantOptions = (() => {
    return staff
      .filter((s) => isAssistantRole(s.role))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ value: s.id, label: s.name, imageUrl: s.image_url || s.avatar_url || '', avatarFallback: (s.name || '?').trim().charAt(0).toUpperCase(), subtitle: (s.role || 'Asistente').split('|')[0] }));
  })();

  const filteredTransactions = transactions.filter(t => {
    // 1. Rango de Fecha
    const tDate = new Date(t.created_at);
    const now = new Date();
    
    if (dateRange === 'today') {
      if (tDate.toDateString() !== now.toDateString()) return false;
    } else if (dateRange === 'week') {
      const startOfWeek = new Date(now);
      const dayOffset = (startOfWeek.getDay() + 6) % 7;
      startOfWeek.setDate(startOfWeek.getDate() - dayOffset);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      if (tDate < startOfWeek || tDate > endOfWeek) return false;
    } else if (dateRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      if (tDate < startOfMonth || tDate > endOfMonth) return false;
    } else if (dateRange === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate + 'T00:00:00');
        if (tDate < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate + 'T23:59:59');
        if (tDate > end) return false;
      }
    }

    // 2. Filtro de Servicio
    if (selectedService !== 'all') {
      let serviceName = t.metadata?.serviceName;
      if (!serviceName) {
        const parts = t.description.split(' - ');
        if (parts.length >= 3 && parts[2].includes('Servi:')) {
          serviceName = parts[2].replace('Servi: ', '');
        } else {
          serviceName = 'Servicio dental';
        }
      }
      const individualServices = serviceName.split(/\s*[\+,\/]\s*/).map(s => s.trim().toLowerCase()).filter(Boolean);
      if (!individualServices.includes(selectedService.toLowerCase())) return false;
    }

    // 3. Filtro de Personal (Odontologos, Líderes y Asistentes)
    if (selectedStaff !== 'all') {
      const staffInvolved = [...(t.metadata?.staffInvolved || []), ...(t.metadata?.serviceStaff || [])];
      const isInvolved = staffInvolved.some(s => 
        String(s.staffId) === String(selectedStaff) || 
        s.name.trim().toLowerCase() === selectedStaff.trim().toLowerCase()
      );
      if (!isInvolved) return false;
    }

    return true;
  });

  const isCountableService = transaction => Number(transaction.metadata?.service_count || 0) > 0 ||
    (Array.isArray(transaction.metadata?.serviceStaff) && transaction.metadata.serviceStaff.length > 0) ||
    (transaction.type === 'income' && transaction.category === 'Ventas Panda' && transaction.metadata?.serviceName && transaction.metadata.serviceName !== 'Venta de Productos');

  // Calculate Metrics (Looker Studio Style)
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const totalServices = filteredTransactions
    .filter(isCountableService)
    .length || 0;

  const avgTicket = totalServices > 0 ? totalIncome / totalServices : 0;

  const selectedRangeDays = (() => {
    if (dateRange === 'today') return 1;
    if (dateRange === 'week') return 7;
    if (dateRange === 'month') {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      const start = new Date(`${customStartDate}T00:00:00`);
      const end = new Date(`${customEndDate}T00:00:00`);
      return Math.max(1, Math.round((end - start) / 86400000) + 1);
    }

    const dates = filteredTransactions.map(t => new Date(t.created_at).getTime());
    if (dates.length > 1) {
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      return Math.max(1, Math.ceil((maxDate - minDate) / 86400000) + 1);
    }
    return 1;
  })();

  // Estimate weeks represented in the dateRange
  const weeksCount = (() => {
    if (dateRange === 'today') return 1 / 7;
    if (dateRange === 'week') return 1;
    if (dateRange === 'month') return 4.3;
    
    const dates = filteredTransactions.map(t => new Date(t.created_at).getTime());
    if (dates.length > 1) {
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 1;
      return Math.ceil(diffDays / 7) || 1;
    }
    return 1;
  })();

  const weeklyAvg = Math.round(totalServices / (weeksCount || 1));

  const totalLavados = filteredTransactions.filter(t => 
    isCountableService(t) &&
    (t.metadata?.didWash || t.metadata?.staffInvolved?.some(s => s.role?.toLowerCase().includes('lavado')))
  ).length || 0;

  const washRatio = totalServices > 0 ? (totalLavados / totalServices) * 100 : 0;

  // 1. SERVICES Table with pagination
  const serviceStats = (() => {
    const stats = {};
    filteredTransactions.forEach(t => {
      if (!isCountableService(t)) return;
      
      let serviceName = t.metadata?.serviceName;
      if (!serviceName) {
        const parts = t.description.split(' - ');
        if (parts.length >= 3 && parts[2].includes('Servi:')) {
          serviceName = parts[2].replace('Servi: ', '');
        } else {
          serviceName = 'Servicio dental'; // Fallback neutral cuando no se reconoce el servicio
        }
      }
      
      // Split multiple services (e.g. "Gravedad Cero + En órbita")
      const individualServices = serviceName.split(/\s*[\+,\/]\s*/).map(s => s.trim()).filter(Boolean);
      
      individualServices.forEach(sName => {
        if (!stats[sName]) {
          stats[sName] = { usd: 0, count: 0 };
        }
        stats[sName].count += 1;
        // Attribute proportional USD amount to each individual service
        stats[sName].usd += (t.amount || 0) / individualServices.length;
      });
    });

    const totalIncomeServices = Object.values(stats).reduce((acc, s) => acc + s.usd, 0) || 1;

    return Object.entries(stats).map(([name, s]) => {
      const pct = (s.usd / totalIncomeServices) * 100;
      return {
        name,
        usd: Math.round(s.usd),
        percent: pct
      };
    }).sort((a, b) => b.usd - a.usd);
  })();

  // Pagination for services table
  const paginatedServices = serviceStats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(serviceStats.length / itemsPerPage) || 1;

  // 2. BARBER SERVICES (Horizontal Bar Chart)
  const barberServices = (() => {
    const stats = {};
    filteredTransactions.forEach(t => {
      if (!isCountableService(t)) return;
      const staffInvolved = (t.metadata?.serviceStaff?.length ? t.metadata.serviceStaff : t.metadata?.staffInvolved) || [];
      staffInvolved.forEach(involvedMember => {
        // El perfil actual del equipo es la fuente de verdad. Algunas
        // transacciones antiguas guardaron "barber" también para asistentes.
        const currentMember = staff.find(member =>
          String(member.id) === String(involvedMember.staffId) ||
          (!involvedMember.staffId && member.name === involvedMember.name)
        );
        const role = currentMember?.role ?? involvedMember.role;
        if (!isBarberRole(role)) return;

        const name = currentMember?.name || involvedMember.name;
        if (!name) return;
        stats[name] = (stats[name] || 0) + 1;
      });
    });
    // Map with default barbero statistics if database is fresh
    const list = Object.entries(stats).map(([name, count]) => ({ name, count }));
    return list.sort((a, b) => b.count - a.count);
  })();

  const maxBarberCount = Math.max(...barberServices.map(b => b.count)) || 1;

  // 3. DAYS FLOW (Vertical Bar Chart)
  const daysFlow = (() => {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const stats = {};
    filteredTransactions.forEach(t => {
      if (!isCountableService(t)) return;
      const day = days[new Date(t.created_at).getDay()];
      stats[day] = (stats[day] || 0) + 1;
    });
    
    // Sort in specific order matching Looker Studio's graph layout (sábado, viernes, jueves, miércoles, martes, domingo, lunes)
    const renderOrder = ['sábado', 'viernes', 'jueves', 'miércoles', 'martes', 'domingo', 'lunes'];
    const list = renderOrder.map(day => ({
      name: day,
      count: stats[day] || 0
    }));

    return list;
  })();

  const maxDayCount = Math.max(...daysFlow.map(d => d.count)) || 1;

  // 4. ASSISTANT WASHING REPORT
  const assistantReport = (() => {
    const byAssistant = {};
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayOrder = ['sabado', 'viernes', 'jueves', 'miercoles', 'martes', 'domingo', 'lunes'];
    const byDay = dayOrder.reduce((acc, day) => ({ ...acc, [day]: 0 }), {});
    const byHour = { '9a.m.': 0, '12p.m.': 0, '3p.m.': 0, '6p.m.': 0, '9p.m.': 0 };
    let unassignedWashes = 0;
    const assistantsCatalog = staff.filter((s) => isAssistantRole(s.role));
    const soleAssistant = assistantsCatalog.length === 1 ? assistantsCatalog[0] : null;

    assistantsCatalog
      .filter((s) => selectedAssistant === 'all' || String(s.id) === String(selectedAssistant))
      .forEach((s) => {
        byAssistant[s.id] = {
          id: s.id,
          name: s.name,
          lavados: 0,
          clientes: 0,
          comision: 0,
          propinas: 0,
          total: 0
        };
      });

    filteredTransactions.forEach(t => {
      if (t.type !== 'income') return;
      const staffInvolved = t.metadata?.staffInvolved || [];
      let assistantStaff = staffInvolved.filter(s => isAssistantRole(s.role));
      const washCount = Number(t.metadata?.washCount || 0) || (t.metadata?.didWash ? 1 : 0);

      if (assistantStaff.length === 0 && washCount > 0 && soleAssistant) {
        assistantStaff = [{
          staffId: soleAssistant.id,
          id: soleAssistant.id,
          name: soleAssistant.name,
          role: soleAssistant.role,
          commissionEarned: (Number(soleAssistant.washing_rate || 0) || DEFAULT_WASHING_RATE_USD) * washCount * WASH_ASSISTANT_SHARE,
          tip: 0
        }];
      }

      assistantStaff = assistantStaff.filter((assistant) => selectedAssistant === 'all' || String(assistant.staffId || assistant.id) === String(selectedAssistant));

      if (assistantStaff.length === 0) {
        if (washCount > 0 && selectedAssistant === 'all') unassignedWashes += washCount;
        return;
      }

      const tDate = new Date(t.created_at);
      const dayKey = dayNames[tDate.getDay()];
      const hour = tDate.getHours();
      const hourKey = hour < 11 ? '9a.m.' : hour < 14 ? '12p.m.' : hour < 17 ? '3p.m.' : hour < 20 ? '6p.m.' : '9p.m.';
      const washesPerAssistant = Math.max(1, washCount) / assistantStaff.length;

      assistantStaff.forEach((assistant) => {
        const id = assistant.staffId || assistant.id || assistant.name;
        if (!byAssistant[id]) {
          byAssistant[id] = {
            id,
            name: assistant.name || 'Asistente',
            lavados: 0,
            clientes: 0,
            comision: 0,
            propinas: 0,
            total: 0
          };
        }

        const catalogAssistant = assistantsCatalog.find((item) => String(item.id) === String(id));
        const configuredRate = Number(catalogAssistant?.washing_rate || 0);
        const washingRate = configuredRate > 0 ? configuredRate : DEFAULT_WASHING_RATE_USD;
        // Cada tarifa de lavado se reparte 60% asistente / 40% barbería.
        // Se reconstruye también para transacciones históricas que guardaron
        // el dólar completo como comisión de la asistente.
        const assistantShare = Number(t.metadata?.washAssistantSharePct || 60) / 100;
        const commission = washesPerAssistant * washingRate * assistantShare;
        const tip = Number(assistant.tip || 0);

        byAssistant[id].lavados += washesPerAssistant;
        byAssistant[id].clientes += washesPerAssistant;
        byAssistant[id].comision += commission;
        byAssistant[id].propinas += tip;
        byAssistant[id].total += commission + tip;

        byDay[dayKey] = (byDay[dayKey] || 0) + washesPerAssistant;
        byHour[hourKey] = (byHour[hourKey] || 0) + washesPerAssistant;
      });
    });

    const assistants = Object.values(byAssistant)
      .filter(a => a.lavados > 0 || a.comision > 0 || a.propinas > 0)
      .sort((a, b) => b.lavados - a.lavados);

    const totalLavadosAssistant = assistants.reduce((sum, a) => sum + a.lavados, 0);
    const totalComisionAssistant = assistants.reduce((sum, a) => sum + a.comision, 0);
    const totalTipsAssistant = assistants.reduce((sum, a) => sum + a.propinas, 0);
    const maxAssistantDay = Math.max(...Object.values(byDay), 1);
    const maxAssistantHour = Math.max(...Object.values(byHour), 1);

    return {
      assistants,
      byDay: dayOrder.map(day => ({ name: day, count: byDay[day] || 0 })),
      byHour: Object.entries(byHour).map(([label, count]) => ({ label, count })),
      totalLavados: totalLavadosAssistant,
      totalClientes: totalLavadosAssistant,
      totalComision: totalComisionAssistant,
      totalPropinas: totalTipsAssistant,
      unassignedWashes,
      maxDay: maxAssistantDay,
      maxHour: maxAssistantHour
    };
  })();

  // 5. REF $ OVER TIME (Line Chart with Custom Granularity)
  const toInputDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatLongDate = (date) => date.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const getIsoWeekNumber = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    normalized.setDate(normalized.getDate() + 3 - ((normalized.getDay() + 6) % 7));
    const weekOne = new Date(normalized.getFullYear(), 0, 4);
    return 1 + Math.round(((normalized - weekOne) / 86400000 - 3 + ((weekOne.getDay() + 6) % 7)) / 7);
  };

  const isTimelineWeekDrilldown = (() => {
    if (dateRange !== 'custom' || chartGranularity !== 'week' || !customStartDate || !customEndDate) return false;
    const start = new Date(`${customStartDate}T00:00:00`);
    const end = new Date(`${customEndDate}T00:00:00`);
    const days = Math.round((end - start) / 86400000) + 1;
    return days > 0 && days <= 7;
  })();

  const effectiveTimelineGranularity = isTimelineWeekDrilldown ? 'day' : chartGranularity;

  const getTimelineGroup = (date) => {
    const start = new Date(date);
    const end = new Date(date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (effectiveTimelineGranularity === 'week') {
      const dayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - dayOffset);
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const weekNumber = getIsoWeekNumber(start);

      return {
        key: toInputDate(start),
        date: start.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' }),
        sortKey: start.getTime(),
        startDate: toInputDate(start),
        endDate: toInputDate(end),
        rangeLabel: `Del ${formatLongDate(start)} al ${formatLongDate(end)} (Semana ${weekNumber})`
      };
    }

    if (effectiveTimelineGranularity === 'month') {
      start.setDate(1);
      end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);

      return {
        key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        date: start.toLocaleDateString('es-VE', { month: 'short', year: '2-digit' }),
        sortKey: start.getTime(),
        startDate: toInputDate(start),
        endDate: toInputDate(end),
        rangeLabel: `${formatLongDate(start)} - ${formatLongDate(end)}`
      };
    }

    return {
      key: toInputDate(start),
      date: start.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
      sortKey: start.getTime(),
      startDate: toInputDate(start),
      endDate: toInputDate(end),
      rangeLabel: formatLongDate(start)
    };
  };

  const timelineData = (() => {
    const groups = {};
    const incomeTransactions = filteredTransactions
      .filter(t => t.type === 'income')
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    if (incomeTransactions.length === 0) return [];
    
    incomeTransactions.forEach(t => {
      const tDate = new Date(t.created_at);
      const group = getTimelineGroup(tDate);

      if (!groups[group.key]) {
        groups[group.key] = {
          ...group,
          amount: 0
        };
      }
      groups[group.key].amount += t.amount;
    });

    if (isTimelineWeekDrilldown) {
      const start = new Date(`${customStartDate}T00:00:00`);
      const end = new Date(`${customEndDate}T00:00:00`);
      for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
        const group = getTimelineGroup(cur);
        if (!groups[group.key]) {
          groups[group.key] = {
            ...group,
            amount: 0
          };
        }
      }
    }

    const list = Object.values(groups).sort((a, b) => a.sortKey - b.sortKey);
    return list.slice(-7);
  })();

  const maxTimelineAmount = timelineData.length > 0 ? Math.max(...timelineData.map(d => d.amount)) || 1 : 1;
  const timelineHeight = 110;
  const timelineWidth = 360;
  const timelinePoints = timelineData.map((d, i) => {
    const x = 35 + i * (300 / (timelineData.length - 1 || 1));
    const y = 130 - (d.amount / maxTimelineAmount) * timelineHeight;
    return {
      x,
      y,
      amount: d.amount,
      date: d.date,
      startDate: d.startDate,
      endDate: d.endDate,
      rangeLabel: d.rangeLabel,
      sortKey: d.sortKey
    };
  });

  const handleTimelinePointClick = (point) => {
    if (!point?.startDate || !point?.endDate) return;
    setDateRange('custom');
    setCustomStartDate(point.startDate);
    setCustomEndDate(point.endDate);
    setSelectedWeek(new Date(`${point.startDate}T00:00:00`).getTime());
    setHoveredTimelinePoint(null);
  };

  const timelinePath = timelinePoints.reduce((path, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = timelinePoints[i - 1];
    return `${path} C ${(prev.x + p.x) / 2} ${prev.y}, ${(prev.x + p.x) / 2} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const timelineFill = timelinePoints.length > 0 
    ? `${timelinePath} L ${timelinePoints[timelinePoints.length - 1].x} 150 L ${timelinePoints[0].x} 150 Z` 
    : '';

  // 5. HOURS FLOW (Curved Line Chart)
  const hoursFlowData = (() => {
    const hrs = Array(24).fill(0);
    filteredTransactions.forEach(t => {
      if (t.type !== 'income') return;
      if (t.metadata?.timeMissing) return;
      const h = new Date(t.created_at).getHours();
      hrs[h] += 1;
    });
    
    const businessHours = Array.from({ length: 13 }, (_, i) => i + 9);
    const list = businessHours.map(h => {
      const label = h === 12 ? '12p.m.' : (h > 12 ? `${h - 12}p.m.` : `${h}a.m.`);
      const total = hrs[h] || 0;
      const avg = total / selectedRangeDays;
      return { hour: h, label, count: avg, total };
    });

    return list.filter(h => h.total > 0);
  })();

  const maxHourCount = hoursFlowData.length > 0 ? Math.max(...hoursFlowData.map(h => h.count)) || 1 : 1;
  const hoursPoints = hoursFlowData.map((d, i) => {
    const x = 35 + i * (285 / (hoursFlowData.length - 1 || 1));
    const y = 165 - (d.count / maxHourCount) * 135;
    return { x, y, label: d.label, hour: d.hour, count: d.count, total: d.total };
  });

  const hoursPath = hoursPoints.reduce((path, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
  }, '');

  const hoursFill = hoursPoints.length > 0
    ? `${hoursPath} L ${hoursPoints[hoursPoints.length - 1].x} 175 L ${hoursPoints[0].x} 175 Z`
    : '';

  return (
    <div ref={reportRef} className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: isMobile ? '80px' : '20px', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header (Premium Google Looker Studio Title) */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '20px' : '0',
        marginBottom: '32px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Centro de <span className="text-gold">Analítica</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Auditoría y rendimiento operativo.</p>
        </div>
        
        <div data-pdf-exclude="true" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleCaptureFullPage}
            disabled={generatingPdf}
            style={{ 
              backgroundColor: generatingPdf ? 'rgba(255, 255, 255,0.15)' : 'var(--bg-tertiary)', 
              border: `1px solid ${generatingPdf ? 'var(--gold-primary)' : 'var(--border-color)'}`, 
              color: generatingPdf ? 'var(--gold-primary)' : 'white', 
              padding: '10px 16px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: generatingPdf ? 'wait' : 'pointer',
              transition: 'background-color 0.3s ease, color 0.3s ease'
            }}>
            {generatingPdf ? '⏳ Generando PDF...' : <><Download size={16} /> PDF</>}
          </button>
        </div>
      </div>

      {generatingPdf && (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          padding: '32px',
          borderRadius: '24px',
          border: '1px solid rgba(17, 17, 17, 0.15)',
          marginBottom: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(17, 17, 17,0.1)', border: '1px solid rgba(17, 17, 17,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s ease-in-out infinite' }}>
            <Loader2 size={24} color="var(--gold-primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '15px', fontWeight: '800', color: 'white', margin: 0 }}>Generando PDF</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Preparando reporte, esto puede tomar unos segundos...</p>
          </div>
        </div>
      )}

      {/* FILTER CONTROL BAR (Looker Studio Style) */}
      <div className="glass-card" data-pdf-exclude="true" style={{
        padding: '20px',
        borderRadius: '20px',
        marginBottom: '32px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))',
        gap: '16px',
        border: '1px solid rgba(255, 255, 255,0.15)',
        background: 'rgba(255, 255, 255, 0.01)'
      }}>
        {/* Date Range Selector */}
        <PandaSelect 
          label="Rango de Fecha"
          value={dateRange}
          onChange={setDateRange}
          options={[
            { value: 'today', label: 'Hoy' },
            { value: 'week', label: 'Esta Semana' },
            { value: 'month', label: 'Este Mes' },
            { value: 'custom', label: 'Rango Personalizado' },
            { value: 'all', label: 'Histórico Total' }
          ]}
        />

        {/* Service Selector */}
        <PandaSelect 
          label="Servicio"
          value={selectedService}
          onChange={setSelectedService}
          options={[
            { value: 'all', label: 'Todos los Servicios' },
            ...uniqueServicesList.map((s) => ({ value: s, label: s }))
          ]}
        />

        {/* Staff Selector */}
        <PandaSelect 
          label="Miembro del Equipo"
          value={selectedStaff}
          onChange={setSelectedStaff}
          options={[
            { value: 'all', label: 'Todos los Odontólogos', imageUrl: '/panda-team-avatar.png', avatarFallback: 'EQ', subtitle: 'Todo el equipo' },
            ...reportStaffOptions
          ]}
        />

        {/* Chart Granularity Selector */}
        <PandaSelect 
          label="Agrupamiento Ref. $"
          value={chartGranularity}
          onChange={setChartGranularity}
          options={[
            { value: 'day', label: 'Por Día' },
            { value: 'week', label: 'Por Semana' },
            { value: 'month', label: 'Por Mes' }
          ]}
        />



        {/* Custom Date Picker Fields (Only visible when "custom" is selected) */}
        {dateRange === 'custom' && (
          <div className="animate-fade-in" style={{
            gridColumn: isMobile ? 'span 1' : 'span 4',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'flex-end',
            gap: '16px',
            marginTop: '8px',
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '12px'
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Fecha Inicial (Desde)</label>
              <PandaDatePicker 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Fecha Final (Hasta)</label>
              <PandaDatePicker 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
            <div style={{ flexShrink: 0 }}>
              <button 
                onClick={() => {
                  setDateRange('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  height: '42px',
                  fontSize: '13px',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255,0.15)',
                  border: '1px solid var(--gold-primary)',
                  color: 'var(--gold-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--gold-primary)';
                  e.currentTarget.style.color = 'black';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255,0.15)';
                  e.currentTarget.style.color = 'var(--gold-primary)';
                }}
              >
                <X size={14} />
                Quitar Filtro
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TOP METRICS GRID (Looker Studio Box Layout) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        {[
          { label: "Total Ref. $", value: `$${totalIncome.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` },
          { label: "Ticket Promedio Ref. $", value: `$${avgTicket.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, isGold: true },
          { label: "Promedio semanal", value: weeklyAvg.toString() },
          { label: "Servicios", value: totalServices.toString() },
          { label: "Limpiezas", value: totalLavados.toString() },
          { label: "Ratio Limpiezas", value: `${washRatio.toFixed(1)} %` }
        ].map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ 
              fontSize: '13px', 
              fontWeight: '800', 
              fontStyle: 'italic', 
              color: 'white', 
              textTransform: 'uppercase', 
              marginBottom: '6px',
              textAlign: 'center',
              letterSpacing: '0.5px'
            }}>
              {m.label}
            </span>
            <div style={{ 
              width: '100%', 
              padding: '16px 8px', 
              background: 'rgba(255, 255, 255, 0.03)', 
              border: '1px solid rgba(255, 255, 255, 0.08)', 
              borderRadius: '12px', 
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60px'
            }}>
              <span style={{ 
                fontSize: m.value.length > 8 ? '16px' : '22px', 
                fontWeight: '900', 
                color: m.isGold ? 'var(--gold-primary)' : 'white' 
              }}>
                {m.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MIDDLE CHARTS (3-Columns Grid clone) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', 
        gap: '24px', 
        marginBottom: '24px' 
      }}>
        
        {/* CHART 1: Ref $ Over Time Line Chart */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--gold-primary)', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Ref. $</span>
          </div>
          
          <div style={{ position: 'relative', height: '170px' }}>
            {timelineData.length === 0 ? (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                No hay datos para mostrar
              </div>
            ) : (
              <svg width="100%" height="160" viewBox="0 0 360 160" style={{ overflow: 'visible' }}>
                {/* Horizontal grid lines */}
                {[40, 75, 110, 145].map((gY, gi) => (
                  <line key={gi} x1="30" y1={gY} x2="330" y2={gY} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                ))}
                
                {/* Timeline Fill Area */}
                {timelineFill && (
                  <path d={timelineFill} fill="url(#goldGrad)" opacity="0.15" />
                )}
                
                {/* Timeline Path Line */}
                {timelinePath && (
                  <path d={timelinePath} fill="none" stroke="var(--gold-primary)" strokeWidth="3" strokeLinecap="round" />
                )}

                {/* Data points and badges */}
                {timelinePoints.map((p, i) => {
                  const isHovered = hoveredTimelinePoint?.sortKey === p.sortKey;
                  return (
                  <g
                    key={i}
                    onMouseEnter={() => setHoveredTimelinePoint(p)}
                    onMouseLeave={() => setHoveredTimelinePoint(null)}
                    onClick={() => handleTimelinePointClick(p)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx={p.x} cy={p.y} r="13" fill="transparent" pointerEvents="all" />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? "7" : "5"}
                      fill="var(--gold-primary)"
                      stroke={isHovered ? "#ffffff" : "#121212"}
                      strokeWidth="2"
                    />
                    
                    {/* Point Labels bubbles matching the white Looker bubbles */}
                    <g transform={`translate(${p.x}, ${p.y - 18})`}>
                      <rect x="-30" y="-8" width="60" height="15" rx="3" fill="#ffffff" />
                      <text x="0" y="3" fill="#000000" fontSize="9" fontWeight="950" textAnchor="middle">
                        {p.amount >= 1000 ? `$${(p.amount/1000).toFixed(2)} mil` : `$${Math.round(p.amount)}`}
                      </text>
                    </g>
                    
                    {/* X Axis Labels */}
                    <text x={p.x} y="156" fill="#8c8c8c" fontSize="9" fontWeight="800" textAnchor="middle">
                      {p.date}
                    </text>
                  </g>
                )})}
                
                {/* Gradients */}
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold-primary)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
            )}
            {hoveredTimelinePoint && (
              <div style={{
                position: 'absolute',
                left: `${(hoveredTimelinePoint.x / timelineWidth) * 100}%`,
                top: `${Math.max(hoveredTimelinePoint.y - 8, 28)}px`,
                transform: hoveredTimelinePoint.x < 120 
                  ? 'translate(-10%, -105%)' 
                  : hoveredTimelinePoint.x > 240 
                    ? 'translate(-90%, -105%)' 
                    : 'translate(-50%, -105%)',
                minWidth: '270px',
                padding: '12px 14px',
                background: '#f4f4f6',
                color: '#1b1b1f',
                borderRadius: '8px',
                boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
                zIndex: 200,
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '900', marginBottom: '10px', lineHeight: 1.35 }}>
                  {hoveredTimelinePoint.rangeLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', fontSize: '12px', fontWeight: '800' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '18px', height: '2px', background: 'var(--gold-primary)', display: 'inline-block', position: 'relative' }}>
                      <span style={{
                        position: 'absolute',
                        left: '7px',
                        top: '-4px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--gold-primary)'
                      }} />
                    </span>
                    Ref $
                  </span>
                  <span>$${hoveredTimelinePoint.amount.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ marginTop: '8px', color: '#5e6068', fontSize: '10px', fontWeight: '800' }}>
                  Click para filtrar este rango
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CHART 2: Servicios Barbero Horizontal Bar Chart */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--gold-primary)', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Servicios por Odontólogo</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '170px', justifyContent: 'center' }}>
            {barberServices.length === 0 ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                fontWeight: '600',
                height: '100%'
              }}>
                No hay datos para mostrar
              </div>
            ) : (
              barberServices.slice(0, 3).map((b, idx) => {
                const pct = (b.count / maxBarberCount) * 80;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '100px', fontSize: '12px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.name}
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '24px',
                        background: 'var(--gold-gradient)',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '12px',
                        boxShadow: '0 4px 10px rgba(255, 255, 255,0.15)'
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: '950', color: '#000000' }}>{b.count}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CHART 3: Días Flujo Vertical Bar Chart */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--gold-primary)', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Días Flujo</span>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end', 
            height: '140px', 
            padding: '10px 0',
            marginTop: '20px'
          }}>
            {daysFlow.map((d, idx) => {
              const h = (d.count / maxDayCount) * 90;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ fontSize: '10px', fontWeight: '950', color: 'var(--gold-primary)' }}>{d.count}</span>
                  <div style={{ 
                    width: '18px', 
                    height: `${Math.max(h, 4)}px`, 
                    background: 'var(--gold-gradient)', 
                    borderRadius: '2px 2px 0 0',
                    boxShadow: '0 4px 10px rgba(255, 255, 255,0.15)'
                  }}></div>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: '#8c8c8c', textTransform: 'lowercase', marginTop: '2px' }}>
                    {d.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION (Table and Hour Flow) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', 
        gap: '24px' 
      }}>
        
        {/* WIDGET 1: Top Services Table (Spans 2 columns on desktop) */}
        <div className="glass-card" style={{ 
          padding: '24px', 
          borderRadius: '24px', 
          gridColumn: isMobile ? 'span 1' : 'span 2',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '340px'
        }}>
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '4px 0 0 4px' }}>Servicio</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ref $</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', borderRadius: '0 4px 4px 0' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {paginatedServices.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', fontWeight: '800' }}>
                    <td style={{ padding: '14px 16px', color: '#ffffff', textAlign: 'left' }}>
                      {(currentPage - 1) * itemsPerPage + idx + 1}. {s.name}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#e6e6e6', textAlign: 'right' }}>
                      {s.usd.toLocaleString('es-VE')}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#e6e6e6', textAlign: 'right' }}>
                      {s.percent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {paginatedServices.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay datos disponibles.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center', 
            gap: '16px', 
            marginTop: '20px', 
            borderTop: '1px solid rgba(255,255,255,0.05)', 
            paddingTop: '16px' 
          }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#b3b3b3' }}>
              {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, serviceStats.length)} / {serviceStats.length}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: currentPage === 1 ? '#4d4d4d' : 'var(--gold-primary)', 
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '900',
                  fontSize: '18px',
                  padding: '0 8px'
                }}
              >
                &lt;
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: currentPage === totalPages ? '#4d4d4d' : 'var(--gold-primary)', 
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: '900',
                  fontSize: '18px',
                  padding: '0 8px'
                }}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* WIDGET 2: Horas Flujo Peak Line Chart */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', minHeight: '340px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--gold-primary)', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Horas Flujo</span>
          </div>

          <div style={{ position: 'relative', height: '220px', marginTop: '20px' }}>
            {hoursPoints.length > 0 ? (
            <svg width="100%" height="210" viewBox="0 0 350 210" style={{ overflow: 'visible' }}>
              {/* Horizontal grid lines */}
              {[35, 70, 105, 140, 175].map((gY, gi) => (
                <line key={gi} x1="30" y1={gY} x2="325" y2={gY} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              ))}

              <line x1="30" y1="175" x2="325" y2="175" stroke="var(--gold-primary)" strokeWidth="1" opacity="0.75" />

              <defs>
                <linearGradient id="hoursGoldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold-primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--gold-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {hoursFill && (
                <path d={hoursFill} fill="url(#hoursGoldGrad)" />
              )}

              {/* Peak line path */}
              {hoursPath && (
                <path d={hoursPath} fill="none" stroke="var(--gold-primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Hourly points */}
              {hoursPoints.map((p, i) => {
                const isKeyLabel = hoursPoints.length <= 7 || [9, 12, 15, 18, 21].includes(p.hour);
                const isHovered = hoveredHourPoint?.hour === p.hour;
                return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredHourPoint(p)}
                  onMouseLeave={() => setHoveredHourPoint(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={p.x} cy={p.y} r="12" fill="transparent" pointerEvents="all" />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? "7" : "4.5"}
                    fill="var(--gold-primary)"
                    stroke={isHovered ? "#ffffff" : "#121212"}
                    strokeWidth="2"
                  />
                  
                  {/* Axis labels */}
                  {isKeyLabel && (
                    <text x={p.x} y="198" fill="#d8d8d8" fontSize="10" fontWeight="900" textAnchor="middle">
                      {p.label}
                    </text>
                  )}
                </g>
              )})}
            </svg>
            ) : (
              <div style={{
                height: '210px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '700',
                padding: '20px'
              }}>
                No hay servicios con hora registrada en este rango.
              </div>
            )}
            {hoveredHourPoint && hoursPoints.length > 0 && (
              <div style={{
                position: 'absolute',
                left: `${Math.min(Math.max((hoveredHourPoint.x / 350) * 100, 8), 80)}%`,
                top: `${Math.max(hoveredHourPoint.y - 10, 20)}px`,
                transform: 'translate(-50%, -100%)',
                minWidth: '190px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#f4f4f6',
                color: '#1b1b1f',
                boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
                pointerEvents: 'none',
                zIndex: 25
              }}>
                <div style={{ fontSize: '13px', fontWeight: '900', marginBottom: '10px' }}>
                  {hoveredHourPoint.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', fontSize: '12px', fontWeight: '850' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '22px', height: '3px', background: 'var(--gold-primary)', borderRadius: '8px', display: 'inline-block' }} />
                    Promedio
                  </span>
                  <span>{hoveredHourPoint.count.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                </div>
                <div style={{ marginTop: '8px', color: '#5e6068', fontSize: '10px', fontWeight: '800' }}>
                  Total: {hoveredHourPoint.total} servicios
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ASSISTANT WASHING REPORT */}
      <div style={{ marginTop: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '6px', backgroundColor: '#0a84ff', borderRadius: '2px' }}></div>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Reporte de Asistentes
            </h3>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px' }}>
            <PandaSelect
              label="Asistente"
              value={selectedAssistant}
              onChange={setSelectedAssistant}
              options={[
                { value: 'all', label: 'Todas las Asistentes', imageUrl: '/panda-team-avatar.png', avatarFallback: 'EQ', subtitle: 'Todo el equipo' },
                ...assistantOptions
              ]}
            />
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))',
          gap: '14px',
          marginBottom: '20px'
        }}>
          {[
            { label: 'Limpiezas', value: Math.round(assistantReport.totalLavados).toString() },
            { label: 'Clientes asistidos', value: Math.round(assistantReport.totalClientes).toString() },
            { label: 'Tarifa Ref. $', value: `$${assistantReport.totalComision.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: 'Propinas Ref. $', value: `$${assistantReport.totalPropinas.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: 'Sin asignar', value: Math.round(assistantReport.unassignedWashes).toString() }
          ].map((m, idx) => (
            <div key={idx} style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              minHeight: '78px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '10px', color: '#b3b3b3', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                {m.label}
              </span>
              <span style={{ fontSize: m.value.length > 8 ? '16px' : '22px', color: idx === 3 ? 'var(--gold-primary)' : '#ffffff', fontWeight: '950' }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
          gap: '24px'
        }}>
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', minHeight: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{ width: '12px', height: '6px', backgroundColor: '#0a84ff', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Asistentes</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {assistantReport.assistants.length > 0 ? assistantReport.assistants.map((assistant) => (
                <div key={assistant.id} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ color: '#ffffff', fontWeight: '900', fontSize: '14px' }}>{assistant.name}</span>
                    <span style={{ color: 'var(--gold-primary)', fontWeight: '950', fontSize: '16px' }}>{Math.round(assistant.lavados)}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                    <div>
                      <div style={{ color: '#8c8c8c', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Tarifa</div>
                      <div style={{ color: '#ffffff', fontSize: '12px', fontWeight: '800' }}>${assistant.comision.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8c8c8c', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Propina</div>
                      <div style={{ color: '#ffffff', fontSize: '12px', fontWeight: '800' }}>${assistant.propinas.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8c8c8c', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Total</div>
                      <div style={{ color: 'var(--gold-primary)', fontSize: '12px', fontWeight: '900' }}>${assistant.total.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '38px 10px' }}>
                  No hay limpiezas asignadas a asistentes en este rango.
                </div>
              )}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', minHeight: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{ width: '12px', height: '6px', backgroundColor: '#0a84ff', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Limpiezas por Dia</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '190px', gap: '8px' }}>
              {assistantReport.byDay.map((d) => {
                const height = (d.count / assistantReport.maxDay) * 120;
                return (
                  <div key={d.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#0a84ff', fontSize: '10px', fontWeight: '950' }}>{Math.round(d.count)}</span>
                    <div style={{
                      width: '20px',
                      height: `${Math.max(height, 4)}px`,
                      borderRadius: '3px 3px 0 0',
                      background: 'linear-gradient(135deg, #0a84ff, #64d2ff)',
                      boxShadow: '0 6px 14px rgba(10,132,255,0.18)'
                    }} />
                    <span style={{ color: '#8c8c8c', fontSize: '9px', fontWeight: '800', textTransform: 'lowercase' }}>{d.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', minHeight: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{ width: '12px', height: '6px', backgroundColor: '#0a84ff', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Limpiezas por Hora</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px', height: '210px' }}>
              {assistantReport.byHour.map((h) => {
                const width = (h.count / assistantReport.maxHour) * 82;
                return (
                  <div key={h.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '48px', color: '#ffffff', fontSize: '12px', fontWeight: '850' }}>{h.label}</span>
                    <div style={{ flex: 1, height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.max(width, h.count > 0 ? 6 : 0)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #0a84ff, #64d2ff)',
                        borderRadius: '4px'
                      }} />
                    </div>
                    <span style={{ width: '26px', color: '#0a84ff', fontSize: '12px', fontWeight: '950', textAlign: 'right' }}>{Math.round(h.count)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ReportsModule;
