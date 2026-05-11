/* ============================================================
   IoT Environmental Monitor – Dashboard JavaScript
   ============================================================
   CSV format from Arduino (comma-separated, one row / 2 sec):
   timestamp,temperature,humidity,airQuality,lat,lon,alt,relay
   ============================================================ */

'use strict';

// ─── Chart.js defaults ────────────────────────────────────────
Chart.defaults.color          = '#6b7a9c';
Chart.defaults.borderColor    = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family    = "'Outfit', sans-serif";

// ─── State ────────────────────────────────────────────────────
const MAX_POINTS = 60; // keep last 60 readings per chart
let   demoTimer  = null;
let   serialPort = null;
let   serialReader = null;
let   demoMode   = false;

const labels  = [];
const tempData = [];
const humData  = [];
const airData  = [];

// ─── DOM refs ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const kpiTemp   = $('kpiTemp');
const kpiHum    = $('kpiHum');
const kpiAir    = $('kpiAir');
const kpiRelay  = $('kpiRelay');
const tempBar   = $('tempBar');
const humBar    = $('humBar');
const airBar    = $('airBar');
const tempStatus = $('tempStatus');
const humStatus  = $('humStatus');
const airStatus  = $('airStatus');
const relayStatus = $('relayStatus');
const relayInd  = $('relayIndicator');
const gpsLat    = $('gpsLat');
const gpsLon    = $('gpsLon');
const gpsAlt    = $('gpsAlt');
const gpsFix    = $('gpsFix');
const mapLink   = $('mapLink');
const logContainer = $('logContainer');
const connBadge = $('connectionBadge');
const lastLbl   = $('lastUpdateLabel');
const alertToast = $('alertToast');
const toastMsg  = $('toastMsg');

// ─── Chart builder ────────────────────────────────────────────
function buildChart(canvasId, label, color, yMin, yMax) {
  const ctx = document.getElementById(canvasId).getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, color + '44');
  gradient.addColorStop(1, color + '00');

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label,
        data: [],
        borderColor: color,
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: color,
        tension: 0.45,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 400 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(11,14,26,0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 10,
          titleFont: { weight: '600' },
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { maxTicksLimit: 8, maxRotation: 0 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          min: yMin,
          max: yMax,
          ticks: { maxTicksLimit: 6 }
        }
      }
    }
  });
}

const chartTemp = buildChart('chartTemp', 'Temperature (°C)', '#f97316', 0, 60);
const chartHum  = buildChart('chartHum',  'Humidity (%)',     '#38bdf8', 0, 100);
const chartAir  = buildChart('chartAir',  'Air Quality (ADC)','#22c55e', 0, 1023);

// ─── Push a new data point to charts ─────────────────────────
function pushPoint(timeLabel, temp, hum, air) {
  labels.push(timeLabel);
  chartTemp.data.datasets[0].data.push(temp);
  chartHum.data.datasets[0].data.push(hum);
  chartAir.data.datasets[0].data.push(air);

  if (labels.length > MAX_POINTS) {
    labels.shift();
    chartTemp.data.datasets[0].data.shift();
    chartHum.data.datasets[0].data.shift();
    chartAir.data.datasets[0].data.shift();
  }

  chartTemp.update('none');
  chartHum.update('none');
  chartAir.update('none');
}

// ─── Update KPI cards ─────────────────────────────────────────
function updateKPIs(temp, hum, air, relay) {
  // Temperature
  kpiTemp.textContent = temp.toFixed(1);
  const tPct = Math.min((temp / 60) * 100, 100);
  tempBar.style.setProperty('--pct', tPct);
  if (temp > 35) {
    kpiTemp.className = 'kpi-value state-danger';
    tempBar.style.setProperty('--hue', '0');
    tempStatus.textContent = '⚠ High';
    tempStatus.style.color = 'var(--danger)';
  } else if (temp > 28) {
    kpiTemp.className = 'kpi-value state-warn';
    tempBar.style.setProperty('--hue', '45');
    tempStatus.textContent = '● Warm';
    tempStatus.style.color = 'var(--warn)';
  } else {
    kpiTemp.className = 'kpi-value state-good';
    tempBar.style.setProperty('--hue', '142');
    tempStatus.textContent = '✔ Normal';
    tempStatus.style.color = 'var(--good)';
  }

  // Humidity
  kpiHum.textContent = hum.toFixed(1);
  humBar.style.setProperty('--pct', Math.min(hum, 100));
  if (hum > 80) {
    kpiHum.className = 'kpi-value state-warn';
    humStatus.textContent = '↑ High'; humStatus.style.color = 'var(--warn)';
  } else if (hum < 30) {
    kpiHum.className = 'kpi-value state-warn';
    humStatus.textContent = '↓ Dry';  humStatus.style.color = 'var(--warn)';
  } else {
    kpiHum.className = 'kpi-value state-good';
    humStatus.textContent = '✔ Normal'; humStatus.style.color = 'var(--good)';
  }

  // Air Quality
  kpiAir.textContent = air;
  const aPct = Math.min((air / 1023) * 100, 100);
  airBar.style.setProperty('--pct', aPct);
  if (air > 400) {
    kpiAir.className = 'kpi-value state-danger';
    airBar.style.setProperty('--hue', '0');
    airStatus.textContent = '✕ Poor'; airStatus.style.color = 'var(--danger)';
  } else if (air > 200) {
    kpiAir.className = 'kpi-value state-warn';
    airBar.style.setProperty('--hue', '45');
    airStatus.textContent = '~ Moderate'; airStatus.style.color = 'var(--warn)';
  } else {
    kpiAir.className = 'kpi-value state-good';
    airBar.style.setProperty('--hue', '142');
    airStatus.textContent = '✔ Good'; airStatus.style.color = 'var(--good)';
  }

  // Relay
  if (relay) {
    kpiRelay.textContent = 'ON';
    kpiRelay.className   = 'kpi-value state-good';
    relayInd.classList.add('on');
    relayStatus.textContent = '● Active';
    relayStatus.style.color = 'var(--good)';
  } else {
    kpiRelay.textContent = 'OFF';
    kpiRelay.className   = 'kpi-value';
    relayInd.classList.remove('on');
    relayStatus.textContent = '○ Idle';
    relayStatus.style.color = 'var(--muted)';
  }
}

// ─── Update GPS panel ─────────────────────────────────────────
function updateGPS(lat, lon, alt) {
  const fixed = (lat !== 0 || lon !== 0);
  gpsLat.textContent = fixed ? lat.toFixed(6) : '--';
  gpsLon.textContent = fixed ? lon.toFixed(6) : '--';
  gpsAlt.textContent = fixed ? alt.toFixed(1) + ' m' : '-- m';

  if (fixed) {
    gpsFix.textContent = '✔ Fixed';
    gpsFix.classList.add('fixed');
    mapLink.href = `https://www.google.com/maps?q=${lat},${lon}`;
    mapLink.classList.remove('hidden');
  } else {
    gpsFix.textContent = 'No Fix';
    gpsFix.classList.remove('fixed');
    mapLink.classList.add('hidden');
  }
}

// ─── Event Log ────────────────────────────────────────────────
function addLog(text, type = 'info') {
  const now  = new Date();
  const time = now.toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-dot ${type}"></span>
    <span class="log-text">${text}</span>`;
  logContainer.prepend(entry);

  // Cap at 200 entries
  while (logContainer.children.length > 200) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

// ─── Toast alert ──────────────────────────────────────────────
let toastTimeout = null;
function showToast(msg) {
  toastMsg.textContent = msg;
  alertToast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => alertToast.classList.add('hidden'), 6000);
}

$('toastClose').addEventListener('click', () => alertToast.classList.add('hidden'));

// ─── Process one CSV line from Arduino ───────────────────────
// Format: timestamp,temp,hum,air,lat,lon,alt,relay
function processLine(line) {
  line = line.trim();
  if (!line || line.startsWith('timestamp') || line.startsWith('BOOT')) return;

  const parts = line.split(',');
  if (parts.length < 8) return;

  const [tsRaw, tempRaw, humRaw, airRaw, latRaw, lonRaw, altRaw, relayRaw] = parts;

  const temp  = parseFloat(tempRaw);
  const hum   = parseFloat(humRaw);
  const air   = parseInt(airRaw, 10);
  const lat   = parseFloat(latRaw);
  const lon   = parseFloat(lonRaw);
  const alt   = parseFloat(altRaw);
  const relay = parseInt(relayRaw, 10) === 1;

  if (isNaN(temp) || isNaN(hum) || isNaN(air)) return;

  const nowStr = new Date().toLocaleTimeString();
  updateKPIs(temp, hum, air, relay);
  updateGPS(lat, lon, alt);
  pushPoint(nowStr, temp, hum, air);

  // Connection status
  connBadge.textContent = '● Connected';
  connBadge.className   = 'badge badge--online';
  lastLbl.textContent   = 'Updated ' + nowStr;

  // Alerts
  if (temp > 35) {
    showToast(`🌡️ High temperature: ${temp.toFixed(1)}°C`);
    addLog(`High temperature: ${temp.toFixed(1)}°C`, 'danger');
  }
  if (air > 400) {
    showToast(`☁️ Poor air quality detected: ${air} ADC`);
    addLog(`Poor air quality: ${air} ADC`, 'danger');
  }
  if (relay) {
    addLog('Relay D40 activated', 'warn');
  }

  addLog(`T:${temp.toFixed(1)}°C  H:${hum.toFixed(1)}%  AQ:${air}  Relay:${relay ? 'ON':'OFF'}`, 'info');
}

// ─── Web Serial API ───────────────────────────────────────────
$('connectBtn').addEventListener('click', async () => {
  if (!('serial' in navigator)) {
    showToast('Web Serial not supported. Use Chrome/Edge 89+.');
    addLog('Web Serial API not available in this browser.', 'danger');
    return;
  }

  try {
    // Stop demo if running
    stopDemo();

    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 9600 });
    addLog('Serial port opened at 9600 baud.', 'good');

    connBadge.textContent = '● Connected';
    connBadge.className   = 'badge badge--online';

    const decoder = new TextDecoderStream();
    serialPort.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();
    serialReader = reader;

    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      lines.forEach(processLine);
    }
  } catch (err) {
    addLog('Serial error: ' + err.message, 'danger');
    connBadge.textContent = '● Disconnected';
    connBadge.className   = 'badge badge--offline';
  }
});

// ─── Demo Mode ────────────────────────────────────────────────
function startDemo() {
  demoMode = true;
  $('demoBtn').style.background = 'rgba(108,99,255,0.35)';
  addLog('Demo mode activated — simulated data running.', 'info');

  let t = 0;
  demoTimer = setInterval(() => {
    const temp  = 25 + 10 * Math.sin(t * 0.1)  + Math.random() * 1.5;
    const hum   = 55 +  20 * Math.sin(t * 0.05) + Math.random() * 3;
    const air   = Math.floor(150 + 300 * Math.abs(Math.sin(t * 0.08)) + Math.random() * 40);
    const relay = temp > 33 || air > 380;
    const lat   = 19.076090 + Math.sin(t * 0.02) * 0.001;
    const lon   = 72.877426 + Math.cos(t * 0.02) * 0.001;
    const alt   = 14.5 + Math.random();

    const line = `${t},${temp.toFixed(1)},${hum.toFixed(1)},${air},${lat.toFixed(6)},${lon.toFixed(6)},${alt.toFixed(1)},${relay ? 1 : 0}`;
    processLine(line);
    t++;
  }, 2000);
}

function stopDemo() {
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
    demoMode = false;
    $('demoBtn').style.background = '';
    addLog('Demo mode stopped.', 'info');
  }
}

$('demoBtn').addEventListener('click', () => {
  if (demoMode) stopDemo();
  else startDemo();
});

// ─── Clear log ────────────────────────────────────────────────
$('clearLog').addEventListener('click', () => {
  logContainer.innerHTML = '';
  addLog('Log cleared.', 'info');
});

// ─── Init ─────────────────────────────────────────────────────
addLog('Dashboard ready. Connect serial port or enable Demo Mode.', 'info');
