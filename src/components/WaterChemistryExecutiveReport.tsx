import { useEffect, useRef } from 'react';
import { AquaticElement, WaterAnalysis, ANALYSIS_PARAMS, AmenityLimit } from '../lib/api';

interface Props {
  elements: AquaticElement[];
  limits?: AmenityLimit[];
  onClose: () => void;
}

export default function WaterChemistryExecutiveReport({ elements, limits, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const html = generateHTML();
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(html);
      iframe.contentWindow.document.close();
    }
  }, [elements]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getParameterStats = (paramKey: string) => {
    const values: number[] = [];
    const elementsWithData: string[] = [];

    elements.forEach(el => {
      if (el.last && el.last[paramKey as keyof WaterAnalysis] != null) {
        const value = el.last[paramKey as keyof WaterAnalysis] as number;
        if (typeof value === 'number' && !isNaN(value)) {
          values.push(value);
          elementsWithData.push(el.nombre);
        }
      }
    });

    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { avg, min, max, count: values.length, elementsWithData };
  };

  const getRecentAnalyses = () => {
    const analyses: Array<{ element: string; date: string; analysis: WaterAnalysis }> = [];

    elements.forEach(el => {
      if (el.last) {
        analyses.push({
          element: el.nombre,
          date: el.last.sampled_at,
          analysis: el.last
        });
      }
    });

    return analyses.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, 10);
  };

  const getOldestAnalyses = () => {
    const analyses: Array<{ element: string; date: string; days: number }> = [];
    const now = new Date();

    elements.forEach(el => {
      if (el.last_sampled_at) {
        const lastDate = new Date(el.last_sampled_at);
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        analyses.push({
          element: el.nombre,
          date: el.last_sampled_at,
          days: diffDays
        });
      }
    });

    return analyses.sort((a, b) => b.days - a.days).slice(0, 10);
  };

  const getAnalysesByMonth = () => {
    const monthCounts: { [key: string]: number } = {};
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    elements.forEach(el => {
      if (el.last_sampled_at) {
        const date = new Date(el.last_sampled_at);
        if (date >= sixMonthsAgo) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const count = el.analyses_count || 0;
          monthCounts[key] = (monthCounts[key] || 0) + count;
        }
      }
    });

    return Object.keys(monthCounts)
      .sort()
      .map(key => {
        const [year, month] = key.split('-');
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        return { month: monthName, count: monthCounts[key] };
      });
  };

  const getElementsWithMostAnalyses = () => {
    return elements
      .filter(el => (el.analyses_count || 0) > 0)
      .sort((a, b) => (b.analyses_count || 0) - (a.analyses_count || 0))
      .slice(0, 15);
  };

  const getElementsWithLeastAnalyses = () => {
    return elements
      .filter(el => (el.analyses_count || 0) > 0)
      .sort((a, b) => (a.analyses_count || 0) - (b.analyses_count || 0))
      .slice(0, 10);
  };

  const getElementsWithHighestDeviation = () => {
    const elementsWithDeviation = elements
      .filter(el => el.last && el.amenity_type_id)
      .map(el => {
        let totalDeviation = 0;
        let paramCount = 0;
        const deviations: { [key: string]: { value: number; deviation: number; param: string; min?: number; max?: number; target?: number } } = {};

        const elementLimits = limits?.filter(l => l.amenity_type_id === el.amenity_type_id) || [];

        ANALYSIS_PARAMS.forEach(param => {
          const value = el.last![param.key as keyof WaterAnalysis] as number | undefined;
          if (value == null || typeof value !== 'number' || isNaN(value)) return;

          const limit = elementLimits.find(l => l.param_key === param.key);

          if (!limit || (limit.min_value == null && limit.max_value == null)) return;

          let deviation = 0;
          let target: number | undefined;

          if (limit.min_value != null && limit.max_value != null) {
            target = (limit.min_value + limit.max_value) / 2;
            if (value < limit.min_value) {
              deviation = ((limit.min_value - value) / limit.min_value) * 100;
            } else if (value > limit.max_value) {
              deviation = ((value - limit.max_value) / limit.max_value) * 100;
            }
          } else if (limit.min_value != null) {
            target = limit.min_value;
            if (value < limit.min_value) {
              deviation = ((limit.min_value - value) / limit.min_value) * 100;
            }
          } else if (limit.max_value != null) {
            target = limit.max_value;
            if (value > limit.max_value) {
              deviation = ((value - limit.max_value) / limit.max_value) * 100;
            }
          }

          if (deviation > 0) {
            totalDeviation += deviation;
            paramCount++;

            deviations[param.key] = {
              value,
              deviation,
              param: param.label,
              min: limit.min_value || undefined,
              max: limit.max_value || undefined,
              target
            };
          }
        });

        const avgDeviation = paramCount > 0 ? totalDeviation / paramCount : 0;

        return {
          element: el,
          avgDeviation,
          deviations,
          paramCount
        };
      })
      .filter(item => item.paramCount > 0)
      .sort((a, b) => b.avgDeviation - a.avgDeviation)
      .slice(0, 5);

    return elementsWithDeviation;
  };

  const generateHTML = () => {
    const activeElements = elements.filter(e => e.is_archived === 0);
    const archivedElements = elements.filter(e => e.is_archived === 1);
    const elementsWithAnalyses = elements.filter(e => (e.analyses_count || 0) > 0);
    const totalAnalyses = elements.reduce((sum, e) => sum + (e.analyses_count || 0), 0);
    const elementsWithRecent = elements.filter(e => e.last_sampled_at);
    const elementsWithoutAnalyses = elements.filter(e => (e.analyses_count || 0) === 0);

    const now = new Date();
    const last7Days = elements.filter(e => {
      if (!e.last_sampled_at) return false;
      const diff = now.getTime() - new Date(e.last_sampled_at).getTime();
      return diff <= 7 * 24 * 60 * 60 * 1000;
    });

    const last30Days = elements.filter(e => {
      if (!e.last_sampled_at) return false;
      const diff = now.getTime() - new Date(e.last_sampled_at).getTime();
      return diff <= 30 * 24 * 60 * 60 * 1000;
    });

    const recentAnalyses = getRecentAnalyses();
    const oldestAnalyses = getOldestAnalyses();
    const analysesByMonth = getAnalysesByMonth();
    const elementsWithMost = getElementsWithMostAnalyses();
    const elementsWithLeast = getElementsWithLeastAnalyses();
    const elementsWithHighestDeviation = getElementsWithHighestDeviation();
    const avgAnalysesPerElement = elementsWithAnalyses.length > 0
      ? (totalAnalyses / elementsWithAnalyses.length).toFixed(1)
      : '0';

    const parameterStatsHTML = ANALYSIS_PARAMS.map(param => {
      const stats = getParameterStats(param.key);
      if (!stats) return '';

      return `
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 8px; font-size: 15px;">
            ${param.label}${param.unit ? ` (${param.unit})` : ''}
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; font-size: 13px;">
            <div>
              <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Promedio</div>
              <div style="color: #111827; font-weight: 600; font-size: 16px;">${stats.avg.toFixed(2)}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Mínimo</div>
              <div style="color: #2563eb; font-weight: 600; font-size: 16px;">${stats.min.toFixed(2)}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Máximo</div>
              <div style="color: #dc2626; font-weight: 600; font-size: 16px;">${stats.max.toFixed(2)}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Elementos</div>
              <div style="color: #059669; font-weight: 600; font-size: 16px;">${stats.count}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const recentAnalysesHTML = recentAnalyses.map((item, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 16px; font-weight: 600; color: #111827;">${idx + 1}</td>
        <td style="padding: 12px 16px; color: #374151; text-transform: uppercase; font-weight: 600;">${item.element}</td>
        <td style="padding: 12px 16px; color: #6b7280;">${formatDateTime(item.date)}</td>
        <td style="padding: 12px 16px;">
          ${item.analysis.ph != null ? `<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px;">pH: ${item.analysis.ph}</span>` : ''}
          ${item.analysis.cloro_libre != null ? `<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px;">Cl: ${item.analysis.cloro_libre}</span>` : ''}
          ${item.analysis.temperatura != null ? `<span style="background: #fef3c7; color: #854d0e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">T: ${item.analysis.temperatura}°C</span>` : ''}
        </td>
      </tr>
    `).join('');

    const oldestAnalysesHTML = oldestAnalyses.map((item, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb; ${item.days > 30 ? 'background: #fef2f2;' : ''}">
        <td style="padding: 12px 16px; font-weight: 600; color: #111827;">${idx + 1}</td>
        <td style="padding: 12px 16px; color: #374151; text-transform: uppercase; font-weight: 600;">${item.element}</td>
        <td style="padding: 12px 16px; color: #6b7280;">${formatDate(item.date)}</td>
        <td style="padding: 12px 16px;">
          <span style="background: ${item.days > 30 ? '#fee2e2' : '#fef3c7'}; color: ${item.days > 30 ? '#991b1b' : '#854d0e'}; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px;">
            ${item.days} ${item.days === 1 ? 'día' : 'días'}
          </span>
        </td>
      </tr>
    `).join('');

    const analysesByMonthHTML = analysesByMonth.length > 0 ? analysesByMonth.map((item, idx) => {
      const maxCount = Math.max(...analysesByMonth.map(m => m.count));
      const barWidth = (item.count / maxCount) * 100;
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; color: #111827; text-transform: capitalize;">${item.month}</td>
          <td style="padding: 12px 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="flex: 1; height: 24px; background: #f3f4f6; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; background: linear-gradient(90deg, #0891b2 0%, #06b6d4 100%); width: ${barWidth}%; transition: width 0.3s;"></div>
              </div>
              <div style="font-weight: 700; color: #0891b2; font-size: 16px; min-width: 50px; text-align: right;">
                ${item.count}
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('') : '';

    const elementsWithMostHTML = elementsWithMost.map((item, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb; ${idx < 3 ? 'background: #f0fdf4;' : ''}">
        <td style="padding: 12px 16px; font-weight: 600; color: #111827;">
          ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
        </td>
        <td style="padding: 12px 16px; color: #374151; text-transform: uppercase; font-weight: 600;">${item.nombre}</td>
        <td style="padding: 12px 16px; text-align: center;">
          <span style="background: ${idx < 3 ? '#dcfce7' : '#dbeafe'}; color: ${idx < 3 ? '#166534' : '#1e40af'}; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 14px;">
            ${item.analyses_count || 0}
          </span>
        </td>
        <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">
          ${item.last_sampled_at ? formatDate(item.last_sampled_at) : 'Sin registro'}
        </td>
      </tr>
    `).join('');

    const elementsWithLeastHTML = elementsWithLeast.map((item, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 16px; font-weight: 600; color: #111827;">${idx + 1}</td>
        <td style="padding: 12px 16px; color: #374151; text-transform: uppercase; font-weight: 600;">${item.nombre}</td>
        <td style="padding: 12px 16px; text-align: center;">
          <span style="background: #fef3c7; color: #854d0e; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 14px;">
            ${item.analyses_count || 0}
          </span>
        </td>
        <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">
          ${item.last_sampled_at ? formatDate(item.last_sampled_at) : 'Sin registro'}
        </td>
      </tr>
    `).join('');

    const elementsWithoutAnalysesHTML = elementsWithoutAnalyses.length > 0 ? `
      <div style="margin-top: 24px; page-break-inside: avoid;">
        <h2 style="color: #111827; font-size: 18px; font-weight: 700; margin-bottom: 12px;">
          ⚠️ Elementos sin Análisis (${elementsWithoutAnalyses.length})
        </h2>
        <div style="background: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 16px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
            ${elementsWithoutAnalyses.map(el => `
              <div style="background: white; padding: 8px 12px; border-radius: 6px; color: #991b1b; font-size: 14px; text-transform: uppercase; font-weight: 600;">
                • ${el.nombre}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte Ejecutivo - Química del Agua</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            color: #1f2937;
            background: #f9fafb;
            padding: 20px;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
          }

          .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 3px solid #0891b2;
          }

          .header h1 {
            font-size: 32px;
            color: #111827;
            margin-bottom: 8px;
            font-weight: 800;
          }

          .header-subtitle {
            font-size: 16px;
            color: #0891b2;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .header-info {
            font-size: 14px;
            color: #6b7280;
            margin-top: 12px;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
          }

          .summary-card {
            background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }

          .summary-card.secondary {
            background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          }

          .summary-card.success {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          }

          .summary-card.warning {
            background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
          }

          .summary-card.danger {
            background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
          }

          .summary-value {
            font-size: 36px;
            font-weight: 800;
            color: white;
            display: block;
            margin-bottom: 8px;
          }

          .summary-label {
            font-size: 13px;
            color: rgba(255,255,255,0.9);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }

          th {
            background: #f3f4f6;
            padding: 14px 16px;
            text-align: left;
            font-weight: 700;
            color: #374151;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .section-title {
            color: #111827;
            font-size: 20px;
            font-weight: 700;
            margin: 32px 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }

          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #0891b2;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            z-index: 1000;
            transition: background 0.2s;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }

          .print-button:hover {
            background: #0e7490;
          }

          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
          }

          @media print {
            body {
              background: white;
              padding: 0;
            }

            .container {
              box-shadow: none;
              padding: 20px;
            }

            .print-button {
              display: none;
            }

            .header {
              border-bottom: 2px solid #000;
            }

            table {
              page-break-inside: auto;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }

            .section-title {
              page-break-after: avoid;
            }
          }

          @page {
            margin: 1.5cm;
            size: letter;
          }
        </style>
      </head>
      <body>
        <button class="print-button" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>

        <div class="container">
          <div class="header">
            <div class="header-subtitle">Reporte Ejecutivo</div>
            <h1>💧 Química del Agua</h1>
            <div class="header-info">
              <strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <span class="summary-value">${elements.length}</span>
              <span class="summary-label">Total Elementos</span>
            </div>
            <div class="summary-card success">
              <span class="summary-value">${activeElements.length}</span>
              <span class="summary-label">Activos</span>
            </div>
            <div class="summary-card secondary">
              <span class="summary-value">${totalAnalyses.toLocaleString()}</span>
              <span class="summary-label">Total Análisis</span>
            </div>
            <div class="summary-card success">
              <span class="summary-value">${elementsWithAnalyses.length}</span>
              <span class="summary-label">Con Análisis</span>
            </div>
            <div class="summary-card warning">
              <span class="summary-value">${last7Days.length}</span>
              <span class="summary-label">Últimos 7 días</span>
            </div>
            <div class="summary-card secondary">
              <span class="summary-value">${last30Days.length}</span>
              <span class="summary-label">Últimos 30 días</span>
            </div>
            <div class="summary-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);">
              <span class="summary-value">${avgAnalysesPerElement}</span>
              <span class="summary-label">Promedio Análisis/Elemento</span>
            </div>
            ${elementsWithoutAnalyses.length > 0 ? `
              <div class="summary-card danger">
                <span class="summary-value">${elementsWithoutAnalyses.length}</span>
                <span class="summary-label">Sin Análisis</span>
              </div>
            ` : ''}
            ${archivedElements.length > 0 ? `
              <div class="summary-card" style="background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%);">
                <span class="summary-value">${archivedElements.length}</span>
                <span class="summary-label">Archivados</span>
              </div>
            ` : ''}
          </div>

          ${analysesByMonth.length > 0 ? `
            <h2 class="section-title">📈 Análisis por Mes (Últimos 6 Meses)</h2>
            <table style="margin-bottom: 32px;">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Cantidad de Análisis</th>
                </tr>
              </thead>
              <tbody>
                ${analysesByMonthHTML}
              </tbody>
            </table>
          ` : ''}

          ${elementsWithMost.length > 0 ? `
            <h2 class="section-title">🏆 Top 15 Elementos con Más Análisis</h2>
            <table style="margin-bottom: 32px;">
              <thead>
                <tr>
                  <th style="width: 80px;">Ranking</th>
                  <th>Elemento</th>
                  <th style="width: 150px; text-align: center;">Total Análisis</th>
                  <th style="width: 200px;">Último Análisis</th>
                </tr>
              </thead>
              <tbody>
                ${elementsWithMostHTML}
              </tbody>
            </table>
          ` : ''}

          ${elementsWithLeast.length > 0 ? `
            <h2 class="section-title">⚡ Elementos con Menos Análisis</h2>
            <table style="margin-bottom: 32px;">
              <thead>
                <tr>
                  <th style="width: 60px;">#</th>
                  <th>Elemento</th>
                  <th style="width: 150px; text-align: center;">Total Análisis</th>
                  <th style="width: 200px;">Último Análisis</th>
                </tr>
              </thead>
              <tbody>
                ${elementsWithLeastHTML}
              </tbody>
            </table>
          ` : ''}

          <h2 class="section-title">📊 Estadísticas por Parámetro</h2>
          <div style="margin-bottom: 32px;">
            ${parameterStatsHTML || '<p style="color: #6b7280; text-align: center; padding: 20px;">No hay datos de parámetros disponibles</p>'}
          </div>

          ${elementsWithHighestDeviation.length > 0 ? `
            <h2 class="section-title">⚠️ Top 5 Elementos con Mayor Desviación de Parámetros</h2>
            <div style="margin-bottom: 32px;">
              ${elementsWithHighestDeviation.map((item, idx) => {
                const topDeviations = Object.entries(item.deviations)
                  .sort((a, b) => b[1].deviation - a[1].deviation)
                  .slice(0, 3);

                return `
                  <div style="background: ${idx === 0 ? '#fef2f2' : '#fef3c7'}; border: 2px solid ${idx === 0 ? '#fca5a5' : '#fcd34d'}; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                      <div>
                        <div style="font-size: 18px; font-weight: 700; color: #111827; text-transform: uppercase;">
                          ${idx === 0 ? '🔴' : idx === 1 ? '🟠' : idx === 2 ? '🟡' : '⚠️'} ${item.element.nombre}
                        </div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                          Última medición: ${item.element.last_sampled_at ? formatDateTime(item.element.last_sampled_at) : 'N/A'}
                        </div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-size: 32px; font-weight: 800; color: ${idx === 0 ? '#dc2626' : '#ea580c'};">
                          ${item.avgDeviation.toFixed(1)}%
                        </div>
                        <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                          Desviación Promedio
                        </div>
                      </div>
                    </div>

                    <div style="background: white; border-radius: 8px; padding: 16px; margin-top: 12px;">
                      <div style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        Parámetros más desviados:
                      </div>
                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                        ${topDeviations.map(([key, data]) => {
                          const param = ANALYSIS_PARAMS.find(p => p.key === key);
                          let rangeText = '';
                          if (data.min != null && data.max != null) {
                            rangeText = `Rango: ${data.min} - ${data.max}`;
                          } else if (data.min != null) {
                            rangeText = `Mín: ${data.min}`;
                          } else if (data.max != null) {
                            rangeText = `Máx: ${data.max}`;
                          }
                          return `
                            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
                              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px; font-weight: 600;">
                                ${data.param}
                              </div>
                              <div style="display: flex; justify-content: space-between; align-items: end;">
                                <div>
                                  <div style="font-size: 20px; font-weight: 700; color: #111827;">
                                    ${data.value.toFixed(2)}
                                  </div>
                                  <div style="font-size: 10px; color: #9ca3af;">
                                    ${rangeText}${param?.unit ? ' ' + param.unit : ''}
                                  </div>
                                </div>
                                <div style="background: ${data.deviation > 20 ? '#fee2e2' : '#fef3c7'}; color: ${data.deviation > 20 ? '#991b1b' : '#92400e'}; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">
                                  ${data.deviation.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          <h2 class="section-title">⏱️ Últimos 10 Análisis Registrados</h2>
          ${recentAnalyses.length > 0 ? `
            <table style="margin-bottom: 32px;">
              <thead>
                <tr>
                  <th style="width: 60px;">#</th>
                  <th>Elemento</th>
                  <th>Fecha y Hora</th>
                  <th>Parámetros Clave</th>
                </tr>
              </thead>
              <tbody>
                ${recentAnalysesHTML}
              </tbody>
            </table>
          ` : '<p style="color: #6b7280; text-align: center; padding: 20px; background: #f9fafb; border-radius: 8px; margin-bottom: 32px;">No hay análisis registrados</p>'}

          ${oldestAnalyses.length > 0 ? `
            <h2 class="section-title">⚠️ Elementos con Análisis Más Antiguos</h2>
            <table style="margin-bottom: 32px;">
              <thead>
                <tr>
                  <th style="width: 60px;">#</th>
                  <th>Elemento</th>
                  <th>Último Análisis</th>
                  <th>Días Transcurridos</th>
                </tr>
              </thead>
              <tbody>
                ${oldestAnalysesHTML}
              </tbody>
            </table>
          ` : ''}

          ${elementsWithoutAnalysesHTML}

          <div class="footer">
            <p>Reporte generado automáticamente por el Sistema de Gestión de Química del Agua</p>
            <p>© ${new Date().getFullYear()} - Todos los derechos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-cyan-50 to-blue-50">
          <h3 className="text-xl font-bold text-gray-900">
            📊 Reporte Ejecutivo - Química del Agua
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title="Reporte Ejecutivo"
          />
        </div>
      </div>
    </div>
  );
}
