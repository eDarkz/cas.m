import { AquaticElement, WaterAnalysis } from './api';
import { adjustDateFromDB, formatDate, formatTime, formatDateTime } from './utils';

interface ReportData {
  element: AquaticElement;
  analyses: WaterAnalysis[];
  period?: { from?: string; to?: string };
}

const PARAMETER_INFO: Record<string, { label: string; unit: string; ideal?: [number, number] }> = {
  ph: { label: 'pH', unit: '', ideal: [7.2, 7.6] },
  cloro_libre: { label: 'Cloro Libre', unit: 'ppm', ideal: [1.0, 3.0] },
  cloro_total: { label: 'Cloro Total', unit: 'ppm' },
  cloraminas: { label: 'Cloraminas', unit: 'ppm' },
  alcalinidad: { label: 'Alcalinidad', unit: 'ppm', ideal: [80, 120] },
  temperatura: { label: 'Temperatura', unit: '°C' },
  turbidez: { label: 'Turbidez', unit: 'NTU' },
  sdt: { label: 'TDS', unit: 'mg/L' },
  conductividad: { label: 'Conductividad', unit: 'µS/cm' },
  lsi: { label: 'LSI', unit: '', ideal: [-0.3, 0.3] },
  rsi: { label: 'RSI', unit: '', ideal: [6.8, 8.5] },
  dureza_calcio: { label: 'Dureza Calcio', unit: 'ppm' },
  fe: { label: 'Hierro', unit: 'mg/L' },
  cu: { label: 'Cobre', unit: 'mg/L' },
};

function generateChartSVG(
  data: Array<{ date: string; value: number }>,
  parameter: string
): string {
  if (data.length === 0) return '';

  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(d => d.value);
  const yMin = Math.min(...values) * 0.9;
  const yMax = Math.max(...values) * 1.1;
  const yRange = yMax - yMin;

  const xScale = (index: number) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
  const yScale = (value: number) => padding.top + chartHeight - ((value - yMin) / yRange) * chartHeight;

  const pathData = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`)
    .join(' ');

  const info = PARAMETER_INFO[parameter];
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yRange / yTicks) * i);

  let idealZone = '';
  if (info?.ideal) {
    const [idealMin, idealMax] = info.ideal;
    idealZone = `
      <rect
        x="${padding.left}"
        y="${yScale(idealMax)}"
        width="${chartWidth}"
        height="${yScale(idealMin) - yScale(idealMax)}"
        fill="rgba(34, 197, 94, 0.1)"
        stroke="rgba(34, 197, 94, 0.3)"
        stroke-width="1"
      />
    `;
  }

  const showEveryNth = Math.ceil(data.length / 8);

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; background: white;">
      ${idealZone}

      ${yTickValues.map(tick => `
        <line
          x1="${padding.left}"
          y1="${yScale(tick)}"
          x2="${padding.left + chartWidth}"
          y2="${yScale(tick)}"
          stroke="#e5e7eb"
          stroke-width="1"
        />
        <text
          x="${padding.left - 10}"
          y="${yScale(tick)}"
          text-anchor="end"
          dominant-baseline="middle"
          style="font-size: 12px; fill: #6b7280;"
        >
          ${tick.toFixed(parameter === 'ph' || parameter === 'lsi' || parameter === 'rsi' ? 1 : 0)}
        </text>
      `).join('')}

      <path
        d="${pathData}"
        fill="none"
        stroke="url(#lineGradient)"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>
      </defs>

      ${data.map((d, i) => `
        <circle
          cx="${xScale(i)}"
          cy="${yScale(d.value)}"
          r="4"
          fill="#06b6d4"
          stroke="white"
          stroke-width="2"
        />
        ${i % showEveryNth === 0 ? `
          <text
            x="${xScale(i)}"
            y="${height - padding.bottom + 15}"
            text-anchor="middle"
            style="font-size: 11px; fill: #6b7280;"
            transform="rotate(-45 ${xScale(i)} ${height - padding.bottom + 15})"
          >
            ${adjustDateFromDB(d.date).toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan', month: 'short', day: 'numeric' })}
          </text>
        ` : ''}
      `).join('')}

      <line
        x1="${padding.left}"
        y1="${padding.top}"
        x2="${padding.left}"
        y2="${padding.top + chartHeight}"
        stroke="#94a3b8"
        stroke-width="2"
      />
      <line
        x1="${padding.left}"
        y1="${padding.top + chartHeight}"
        x2="${padding.left + chartWidth}"
        y2="${padding.top + chartHeight}"
        stroke="#94a3b8"
        stroke-width="2"
      />

      <text
        x="${padding.left - 45}"
        y="${padding.top + chartHeight / 2}"
        text-anchor="middle"
        style="font-size: 14px; font-weight: 600; fill: #374151;"
        transform="rotate(-90 ${padding.left - 45} ${padding.top + chartHeight / 2})"
      >
        ${info?.label || parameter} ${info?.unit ? `(${info.unit})` : ''}
      </text>
    </svg>
  `;
}

export function generateHTMLReport(reportData: ReportData): string {
  const { element, analyses } = reportData;

  const sortedAnalyses = [...analyses].sort(
    (a, b) => new Date(a.sampled_at).getTime() - new Date(b.sampled_at).getTime()
  );

  const parameters = ['ph', 'cloro_libre', 'alcalinidad', 'temperatura', 'lsi', 'rsi'];

  const charts = parameters.map(param => {
    const data = sortedAnalyses
      .filter(a => a[param as keyof WaterAnalysis] != null)
      .map(a => {
        const rawValue = a[param as keyof WaterAnalysis];
        const value = typeof rawValue === 'string' ? parseFloat(rawValue) : rawValue;
        return {
          date: a.sampled_at,
          value: value as number,
        };
      })
      .filter(d => !isNaN(d.value));

    if (data.length === 0) return '';

    const info = PARAMETER_INFO[param];
    return `
      <div style="margin-bottom: 40px; page-break-inside: avoid;">
        <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">
          ${info.label}${info.unit ? ` (${info.unit})` : ''}
        </h3>
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${generateChartSVG(data, param)}
        </div>
        ${info.ideal ? `
          <p style="text-align: center; color: #6b7280; font-size: 13px; margin-top: 8px;">
            Rango ideal: ${info.ideal[0]}-${info.ideal[1]}${info.unit ? ` ${info.unit}` : ''}
          </p>
        ` : ''}
      </div>
    `;
  }).join('');

  const tableRows = sortedAnalyses.map(analysis => {
    const date = new Date(analysis.sampled_at);
    const phOk = analysis.ph != null && analysis.ph >= 7.2 && analysis.ph <= 7.6;
    const clOk = analysis.cloro_libre != null && analysis.cloro_libre >= 1.0 && analysis.cloro_libre <= 3.0;
    const lsiOk = analysis.lsi != null && analysis.lsi >= -0.3 && analysis.lsi <= 0.3;

    const formatValue = (val: number | null | undefined, decimals: number = 2) => {
      if (val == null) return '-';
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(num) ? num.toFixed(decimals) : '-';
    };

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; text-align: center; font-size: 13px;">
          ${formatDate(date)}<br/>
          <span style="color: #6b7280; font-size: 11px;">${formatTime(date)}</span>
        </td>
        <td style="padding: 12px; text-align: center; font-weight: ${phOk ? 'bold' : 'normal'}; color: ${phOk ? '#059669' : '#6b7280'};">
          ${formatValue(analysis.ph, 1)}
        </td>
        <td style="padding: 12px; text-align: center; font-weight: ${clOk ? 'bold' : 'normal'}; color: ${clOk ? '#059669' : '#6b7280'};">
          ${formatValue(analysis.cloro_libre)}
        </td>
        <td style="padding: 12px; text-align: center; color: #6b7280;">
          ${formatValue(analysis.cloro_total)}
        </td>
        <td style="padding: 12px; text-align: center; color: #6b7280;">
          ${formatValue(analysis.alcalinidad, 0)}
        </td>
        <td style="padding: 12px; text-align: center; color: #6b7280;">
          ${formatValue(analysis.temperatura, 1)}
        </td>
        <td style="padding: 12px; text-align: center; font-weight: ${lsiOk ? 'bold' : 'normal'}; color: ${lsiOk ? '#059669' : '#6b7280'};">
          ${formatValue(analysis.lsi)}
        </td>
        <td style="padding: 12px; text-align: center; color: #6b7280;">
          ${formatValue(analysis.rsi)}
        </td>
        <td style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px;">
          ${analysis.comentario || '-'}
        </td>
      </tr>
    `;
  }).join('');

  const statistics = parameters.map(param => {
    const rawData = sortedAnalyses
      .map(a => a[param as keyof WaterAnalysis])
      .filter(v => v != null);

    const data = rawData
      .map(v => typeof v === 'string' ? parseFloat(v) : v)
      .filter(v => typeof v === 'number' && !isNaN(v)) as number[];

    if (data.length === 0) return null;

    const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const info = PARAMETER_INFO[param];

    return `
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); padding: 15px; border-radius: 8px; color: white;">
        <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${info.label}</div>
        <div style="display: flex; justify-content: space-between; font-size: 12px;">
          <div>Prom: <strong>${avg.toFixed(2)}</strong></div>
          <div>Mín: <strong>${min.toFixed(2)}</strong></div>
          <div>Máx: <strong>${max.toFixed(2)}</strong></div>
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reporte - ${element.nombre}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f3f4f6;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #3b82f6;
        }
        .header h1 {
          color: #1f2937;
          font-size: 32px;
          margin: 0 0 10px 0;
        }
        .header p {
          color: #6b7280;
          font-size: 16px;
          margin: 5px 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 40px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        thead {
          background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
          color: white;
        }
        th {
          padding: 12px;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
        }
        .print-button {
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: all 0.3s;
          z-index: 1000;
        }
        .print-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.15);
        }
        @media print {
          body { background: white; padding: 0; }
          .container { box-shadow: none; }
          .print-button { display: none; }
        }
      </style>
    </head>
    <body>
      <button class="print-button" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
      <div class="container">
        <div class="header">
          <h1>Reporte de Química del Agua</h1>
          <p style="font-size: 24px; color: #3b82f6; font-weight: 600;">${element.nombre}</p>
          ${element.ubicacion ? `<p style="color: #6b7280;">📍 ${element.ubicacion}</p>` : ''}
          <p style="color: #6b7280;">
            Período: ${sortedAnalyses.length > 0 ?
              `${formatDate(sortedAnalyses[0].sampled_at)} - ${formatDate(sortedAnalyses[sortedAnalyses.length - 1].sampled_at)}` :
              'N/A'
            }
          </p>
          <p style="color: #6b7280;">Total de análisis: <strong>${analyses.length}</strong></p>
          <p style="color: #6b7280;">Generado: ${formatDateTime(new Date())}</p>
        </div>

        <h2 style="color: #1f2937; font-size: 24px; margin: 30px 0 20px 0;">📊 Estadísticas del Período</h2>
        <div class="stats-grid">
          ${statistics}
        </div>

        <h2 style="color: #1f2937; font-size: 24px; margin: 40px 0 20px 0;">📈 Gráficas de Parámetros</h2>
        ${charts}

        <h2 style="color: #1f2937; font-size: 24px; margin: 40px 0 20px 0;">📋 Historial de Análisis</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>pH</th>
              <th>Cl Libre<br/>(ppm)</th>
              <th>Cl Total<br/>(ppm)</th>
              <th>Alcalinidad<br/>(ppm)</th>
              <th>Temp<br/>(°C)</th>
              <th>LSI</th>
              <th>RSI</th>
              <th>Comentarios</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          <p>Este reporte fue generado automáticamente por el sistema de gestión de química del agua.</p>
          <p>© ${new Date().getFullYear()} - Todos los derechos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function openHTMLReportInWindow(reportData: ReportData) {
  const html = generateHTMLReport(reportData);
  const newWindow = window.open('', '_blank');

  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  } else {
    alert('Por favor, permite las ventanas emergentes para ver el reporte.');
  }
}
