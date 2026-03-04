/*
 * dashboard.js — IoT Cipher Dashboard (4-Architecture Mode)
 * Fixes: rounds chart, FPGA SW bars, metrics table, removed transfer time
 */
const BIN_ID  = "69a8309aae596e708f5e8c38";
const API_KEY = "$2a$10$/upkixSbLDBsl0169uVz8u7niWY7Sve435sDm3CsGyUm.KBZchC/q";
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;

const COLORS = [
  { bg:'rgba(0,230,118,.3)',   border:'#00e676' },  // A1 PRIDE-64
  { bg:'rgba(0,200,255,.3)',   border:'#00c8ff' },  // A2 PRESENT-64
  { bg:'rgba(100,149,237,.3)', border:'#6495ed' },  // A3 PRESENT-32
  { bg:'rgba(180,255,100,.3)', border:'#b4ff64' },  // A4 PRIDE-32
];
const LABELS = ['A1 PRIDE-64','A2 PRESENT-64','A3 PRESENT-32','A4 PRIDE-32'];

function makeBar(id, yLabel='') {
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  return new Chart(ctx, {
    type:'bar',
    data:{
      labels: LABELS,
      datasets:[{
        data:[0,0,0,0],
        backgroundColor: COLORS.map(c=>c.bg),
        borderColor:     COLORS.map(c=>c.border),
        borderWidth:2, borderRadius:6
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{display:false},
        tooltip:{ callbacks:{ label: ctx=>`${Number(ctx.parsed.y).toFixed(4)} ${yLabel}` }}
      },
      scales:{
        y:{ beginAtZero:true, grid:{color:'#1e2233'}, ticks:{color:'#667'} },
        x:{ grid:{color:'#1e2233'}, ticks:{color:'#aaa', font:{size:11}} }
      }
    }
  });
}

// Static rounds chart — data never changes
function makeRoundsChart() {
  const ctx = document.getElementById('rndChart');
  if (!ctx) return null;
  return new Chart(ctx, {
    type:'bar',
    data:{
      labels: LABELS,
      datasets:[{
        label:'Rounds',
        data:[20, 31, 31, 20],  // fixed: A1=20, A2=31, A3=31, A4=20
        backgroundColor: COLORS.map(c=>c.bg),
        borderColor:     COLORS.map(c=>c.border),
        borderWidth:2, borderRadius:6
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{display:false} },
      scales:{
        y:{ beginAtZero:true, min:0, max:40,
            grid:{color:'#1e2233'}, ticks:{color:'#667'} },
        x:{ grid:{color:'#1e2233'}, ticks:{color:'#aaa', font:{size:11}} }
      }
    }
  });
}

const charts = {
  enc : makeBar('encChart',  'µs'),
  dec : makeBar('decChart',  'µs'),
  thr : makeBar('thrChart',  'Mbps'),
  cyc : makeBar('cycChart',  'cycles'),
  ene : makeBar('eneChart',  'nJ'),
  rnd : makeRoundsChart(),
};

// FPGA comparison — grouped bars, SW values update live, HW values fixed
const fpgaChart = new Chart(document.getElementById('fpgaChart'), {
  type:'bar',
  data:{
    labels:['A1 PRIDE-64','A2 PRESENT-64','A3 PRESENT-32'],
    datasets:[
      { label:'ESP32 Software (Mbps)',
        data:[0, 0, 0],
        backgroundColor:['rgba(0,230,118,.35)','rgba(0,200,255,.35)','rgba(100,149,237,.35)'],
        borderColor:['#00e676','#00c8ff','#6495ed'],
        borderWidth:2, borderRadius:4
      },
      { label:'FPGA Virtex-5 (Mbps)',
        data:[1165.48, 982.07, 316.12],
        backgroundColor:'rgba(206,147,216,.35)',
        borderColor:'#ce93d8',
        borderWidth:2, borderRadius:4
      },
    ]
  },
  options:{
    responsive:true, maintainAspectRatio:true,
    plugins:{ legend:{ labels:{ color:'#ccc', font:{size:12} } },
      tooltip:{ callbacks:{ label: ctx=>`${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(4)} Mbps` }}
    },
    scales:{
      y:{ beginAtZero:true, grid:{color:'#1e2233'}, ticks:{color:'#667'} },
      x:{ grid:{color:'#1e2233'}, ticks:{color:'#aaa'} }
    }
  }
});

function setChart(chart, values) {
  if (!chart) return;
  chart.data.datasets[0].data = values;
  chart.update('active');
}

function updateRelative(rel) {
  const enc  = rel.speedup_enc  || 0;
  const thr  = rel.throughput_ratio || 0;
  const ene  = rel.energy_ratio || 0;
  const cyc  = rel.cycles_ratio || 0;

  document.getElementById('relSpeedup').textContent    = enc.toFixed(3)  + '×';
  document.getElementById('relThroughput').textContent = thr.toFixed(3)  + '×';
  document.getElementById('relEnergy').textContent     = ene.toFixed(3)  + '×';
  document.getElementById('relCycles').textContent     = cyc.toFixed(3)  + '×';

  // Top card
  const faster = enc >= 1 ? 'PRIDE-64' : 'PRESENT-64';
  const ratio  = Math.max(enc, enc>0?1/enc:1).toFixed(2);
  const el = document.getElementById('fastestName');
  if (el) {
    // fastest on ESP32 SW
  }
}

function updateTable(archs) {
  const rows = [
    { name:'A1 PRIDE-64',   d:archs.A1_PRIDE_64,   block:'64-bit', key:'128-bit', rounds:20, ci:0 },
    { name:'A2 PRESENT-64', d:archs.A2_PRESENT_64, block:'64-bit', key:'80-bit',  rounds:31, ci:1 },
    { name:'A3 PRESENT-32', d:archs.A3_PRESENT_32, block:'32-bit', key:'80-bit',  rounds:31, ci:2 },
    { name:'A4 PRIDE-32',   d:archs.A4_PRIDE_32,   block:'32-bit', key:'128-bit', rounds:20, ci:3 },
  ];
  const tb = document.getElementById('tableBody');
  if (!tb) return;
  tb.innerHTML = rows.map(r => `
    <tr>
      <td style="color:${COLORS[r.ci].border};font-weight:700">${r.name}</td>
      <td>${r.block}</td>
      <td>${r.key}</td>
      <td>${r.rounds}</td>
      <td>${Number(r.d.enc_us).toFixed(2)}</td>
      <td>${Number(r.d.dec_us).toFixed(2)}</td>
      <td>${Number(r.d.throughput_mbps).toFixed(4)}</td>
      <td>${Number(r.d.clock_cycles).toLocaleString()}</td>
      <td>${Number(r.d.energy_nj).toFixed(4)}</td>
      <td class="${r.d.match?'match-yes':'match-no'}">${r.d.match?'✓ YES':'✗ NO'}</td>
    </tr>`).join('');
}

function render(data) {
  const a = data.architectures;
  if (!a) return;

  const v = [a.A1_PRIDE_64, a.A2_PRESENT_64, a.A3_PRESENT_32, a.A4_PRIDE_32];

  // Guard: skip if any arch missing
  if (v.some(x => !x)) return;

  // Top cards
  document.getElementById('tempVal').textContent      = Number(data.sensor.temperature).toFixed(1);
  document.getElementById('humVal').textContent       = `${Number(data.sensor.humidity).toFixed(1)} %RH`;
  document.getElementById('activeCipher').textContent = data.active_arch || '---';
  document.getElementById('activeCT').textContent     = data.ciphertext  || '';
  document.getElementById('liveEncTime').textContent  = `Live enc: ${Number(data.live_enc_us).toFixed(1)} µs`;

  // Fastest on ESP32
  const fastest = v.reduce((best,x,i) => Number(x.enc_us)<best.v ? {i,v:Number(x.enc_us)} : best, {i:0,v:Infinity});
  document.getElementById('fastestName').textContent = LABELS[fastest.i];
  document.getElementById('fastestTime').textContent = `${v[fastest.i].enc_us.toFixed(2)} µs enc time`;

  // Bar charts
  setChart(charts.enc, v.map(x=>Number(x.enc_us)));
  setChart(charts.dec, v.map(x=>Number(x.dec_us)));
  setChart(charts.thr, v.map(x=>Number(x.throughput_mbps)));
  setChart(charts.cyc, v.map(x=>Number(x.clock_cycles)));
  setChart(charts.ene, v.map(x=>Number(x.energy_nj)));
  // rounds chart is static — no update needed

  // FPGA comparison — update SW bars only
  fpgaChart.data.datasets[0].data = [
    Number(a.A1_PRIDE_64.throughput_mbps),
    Number(a.A2_PRESENT_64.throughput_mbps),
    Number(a.A3_PRESENT_32.throughput_mbps)
  ];
  fpgaChart.update('active');

  // Relative metrics
  if (data.relative) updateRelative(data.relative);

  // Table
  updateTable(a);
}

let lastTs = 0;
async function fetchData() {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  try {
    const res  = await fetch(API_URL, { headers:{'X-Master-Key':API_KEY} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = json.record;
    if (data.timestamp !== lastTs) {
      lastTs = data.timestamp;
      render(data);
      dot.className    = 'dot live';
      text.textContent = 'Live — ESP32 active';
    } else {
      text.textContent = 'Connected — waiting for ESP32...';
    }
    document.getElementById('lastUpdate').textContent =
      `Last update: ${new Date().toLocaleTimeString()}`;
  } catch(e) {
    dot.className    = 'dot error';
    text.textContent = `Error: ${e.message}`;
    console.error(e);
  }
}

fetchData();
setInterval(fetchData, 6000);
