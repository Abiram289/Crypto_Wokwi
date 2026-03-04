/*
 * dashboard.js — IoT Cipher Dashboard (4-Architecture Mode)
 * PRIDE-64 | PRESENT-64 | PRESENT-32 | PRIDE-32
 * Reads from JSONBin every 6s, updates all charts live
 */
const BIN_ID  = "69a8309aae596e708f5e8c38";
const API_KEY = "$2a$10$/upkixSbLDBsl0169uVz8u7niWY7Sve435sDm3CsGyUm.KBZchC/q";
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;

// Colours: A1=green(PRIDE-64) A2=cyan(PRESENT-64) A3=blue(PRESENT-32) A4=lime(PRIDE-32)
const COLORS = [
  { bg:'rgba(0,230,118,.3)',  border:'#00e676' },  // A1 PRIDE-64
  { bg:'rgba(0,200,255,.3)',  border:'#00c8ff' },  // A2 PRESENT-64
  { bg:'rgba(100,149,237,.3)',border:'#6495ed' },  // A3 PRESENT-32
  { bg:'rgba(180,255,100,.3)',border:'#b4ff64' },  // A4 PRIDE-32
];
const LABELS = ['A1\nPRIDE-64','A2\nPRESENT-64','A3\nPRESENT-32','A4\nPRIDE-32'];
const LABELS_SHORT = ['A1 PRIDE-64','A2 PRESENT-64','A3 PRESENT-32','A4 PRIDE-32'];

function makeBar(id, label, yLabel='') {
  return new Chart(document.getElementById(id), {
    type:'bar',
    data:{
      labels: LABELS_SHORT,
      datasets:[{
        label, data:[0,0,0,0],
        backgroundColor: COLORS.map(c=>c.bg),
        borderColor:     COLORS.map(c=>c.border),
        borderWidth:2, borderRadius:6
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{display:false},
        tooltip:{ callbacks:{ label: ctx=>`${ctx.parsed.y.toFixed(3)} ${yLabel}` }}
      },
      scales:{
        y:{ beginAtZero:true, grid:{color:'#1e2233'}, ticks:{color:'#667'} },
        x:{ grid:{color:'#1e2233'}, ticks:{color:'#aaa', font:{size:11}} }
      }
    }
  });
}

const charts = {
  enc : makeBar('encChart',  'Enc Time (µs)',     'µs'),
  dec : makeBar('decChart',  'Dec Time (µs)',     'µs'),
  thr : makeBar('thrChart',  'Throughput (Mbps)', 'Mbps'),
  cyc : makeBar('cycChart',  'Clock Cycles',      'cycles'),
  ene : makeBar('eneChart',  'Energy (nJ)',        'nJ'),
  eff : makeBar('effChart',  'Efficiency',        ''),
};

// FPGA comparison chart (grouped)
const fpgaChart = new Chart(document.getElementById('fpgaChart'), {
  type:'bar',
  data:{
    labels:['A1 PRIDE-64','A2 PRESENT-64','A3 PRESENT-32'],
    datasets:[
      { label:'ESP32 Software (Mbps)', data:[0,0,0],
        backgroundColor:['rgba(0,230,118,.3)','rgba(0,200,255,.3)','rgba(100,149,237,.3)'],
        borderColor:['#00e676','#00c8ff','#6495ed'], borderWidth:2, borderRadius:4 },
      { label:'FPGA Virtex-5 (Mbps)', data:[1165.48, 982.07, 316.12],
        backgroundColor:'rgba(206,147,216,.3)', borderColor:'#ce93d8', borderWidth:2, borderRadius:4 },
    ]
  },
  options:{
    responsive:true, maintainAspectRatio:true,
    plugins:{ legend:{ labels:{ color:'#aaa' } } },
    scales:{
      y:{ beginAtZero:true, grid:{color:'#1e2233'}, ticks:{color:'#667'} },
      x:{ grid:{color:'#1e2233'}, ticks:{color:'#aaa'} }
    }
  }
});

function setChart(chart, values) {
  chart.data.datasets[0].data = values;
  chart.update('active');
}

function updateRelative(rel) {
  const faster = rel.speedup_enc >= 1 ? 'PRIDE-64' : 'PRESENT-64';
  const ratio  = Math.max(rel.speedup_enc, 1/rel.speedup_enc);

  document.getElementById('relSpeedup').textContent   = `${rel.speedup_enc.toFixed(2)}×`;
  document.getElementById('relThroughput').textContent = `${rel.throughput_ratio.toFixed(2)}×`;
  document.getElementById('relEnergy').textContent    = `${rel.energy_ratio.toFixed(2)}×`;
  document.getElementById('relRounds').textContent    = `${rel.rounds_ratio.toFixed(2)}×`;
  document.getElementById('relCycles').textContent    = `${rel.cycles_ratio.toFixed(2)}×`;
  document.getElementById('relWinner').textContent    = `${faster} is ${ratio.toFixed(2)}× faster`;
  document.getElementById('relWinner').className      = faster.includes('PRIDE') ? 'rel-winner green' : 'rel-winner cyan';
}

function updateTable(archs) {
  const rows = [
    { name:'A1 PRIDE-64',   d:archs.A1_PRIDE_64,   block:'64-bit', key:'128-bit', rounds:20 },
    { name:'A2 PRESENT-64', d:archs.A2_PRESENT_64, block:'64-bit', key:'80-bit',  rounds:31 },
    { name:'A3 PRESENT-32', d:archs.A3_PRESENT_32, block:'32-bit', key:'80-bit',  rounds:31 },
    { name:'A4 PRIDE-32',   d:archs.A4_PRIDE_32,   block:'32-bit', key:'128-bit', rounds:20 },
  ];
  document.getElementById('tableBody').innerHTML = rows.map((r,i)=>`
    <tr>
      <td style="color:${COLORS[i].border};font-weight:700">${r.name}</td>
      <td>${r.block}</td><td>${r.key}</td><td>${r.rounds}</td>
      <td>${r.d.enc_us.toFixed(2)}</td>
      <td>${r.d.dec_us.toFixed(2)}</td>
      <td>${r.d.throughput_mbps.toFixed(4)}</td>
      <td>${r.d.clock_cycles.toLocaleString()}</td>
      <td>${r.d.energy_nj.toFixed(4)}</td>
      <td class="${r.d.match?'match-yes':'match-no'}">${r.d.match?'✓ YES':'✗ NO'}</td>
    </tr>`).join('');
}

function render(data) {
  const a = data.architectures;
  const vals = [
    a.A1_PRIDE_64, a.A2_PRESENT_64, a.A3_PRESENT_32, a.A4_PRIDE_32
  ];

  // Top cards
  document.getElementById('tempVal').textContent      = data.sensor.temperature.toFixed(1);
  document.getElementById('humVal').textContent       = `${data.sensor.humidity.toFixed(1)} %RH`;
  document.getElementById('activeCipher').textContent = data.active_arch;
  document.getElementById('activeCT').textContent     = data.ciphertext;
  document.getElementById('liveEncTime').textContent  = `Live enc: ${data.live_enc_us.toFixed(1)} µs`;

  // Fastest arch
  const fastest = vals.reduce((best,v,i)=>v.enc_us<best.v?{i,v:v.enc_us}:best, {i:0,v:Infinity});
  document.getElementById('fastestName').textContent = LABELS_SHORT[fastest.i];
  document.getElementById('fastestTime').textContent = `${vals[fastest.i].enc_us.toFixed(2)} µs`;

  // Charts
  setChart(charts.enc, vals.map(v=>v.enc_us));
  setChart(charts.dec, vals.map(v=>v.dec_us));
  setChart(charts.thr, vals.map(v=>v.throughput_mbps));
  setChart(charts.cyc, vals.map(v=>v.clock_cycles));
  setChart(charts.ene, vals.map(v=>v.energy_nj));
  setChart(charts.eff, vals.map(v=>v.throughput_mbps / (v.clock_cycles/1000)));

  // FPGA SW bars
  fpgaChart.data.datasets[0].data = [
    a.A1_PRIDE_64.throughput_mbps,
    a.A2_PRESENT_64.throughput_mbps,
    a.A3_PRESENT_32.throughput_mbps
  ];
  fpgaChart.update('active');

  updateRelative(data.relative);
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
      dot.className   = 'dot live';
      text.textContent = `Live — ESP32 active`;
    } else {
      text.textContent = `Connected — waiting for ESP32...`;
    }
    document.getElementById('lastUpdate').textContent =
      `Last update: ${new Date().toLocaleTimeString()}`;
  } catch(e) {
    dot.className   = 'dot error';
    text.textContent = `Connection error: ${e.message}`;
  }
}

fetchData();
setInterval(fetchData, 6000);
