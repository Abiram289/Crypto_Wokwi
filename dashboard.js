/*
 * dashboard.js — IoT Cipher Benchmark Dashboard
 * Reads from JSONBin.io every 6 seconds and updates all charts
 * REPLACE BIN_ID and API_KEY with your own values
 */

const BIN_ID  = "69a8309aae596e708f5e8c38";
const API_KEY = "$2a$10$/upkixSbLDBsl0169uVz8u7niWY7Sve435sDm3CsGyUm.KBZchC/q";
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;

// ── Chart colour palette ─────────────────────────────────────
const C = {
  present : { bg:'rgba(0,200,255,.25)', border:'#00c8ff' },
  pride   : { bg:'rgba(0,230,118,.25)', border:'#00e676' },
  aes     : { bg:'rgba(255,215,64,.25)', border:'#ffd740' },
};
const LABELS = ['PRESENT-80','PRIDE','AES-128'];

// ── Chart factory ─────────────────────────────────────────────
function makeBar(id, label, colors, data=[0,0,0]) {
  return new Chart(document.getElementById(id), {
    type:'bar',
    data:{
      labels: LABELS,
      datasets:[{
        label, data,
        backgroundColor: colors.map(c=>c.bg),
        borderColor:     colors.map(c=>c.border),
        borderWidth:2, borderRadius:6
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{display:false} },
      scales:{
        y:{ beginAtZero:true, grid:{color:'#1e2233'}, ticks:{color:'#667'} },
        x:{ grid:{color:'#1e2233'}, ticks:{color:'#aaa'} }
      }
    }
  });
}

// ── Initialise all charts ────────────────────────────────────
const COLOR3 = [C.present, C.pride, C.aes];

const charts = {
  enc  : makeBar('encChart',  'Enc Time (µs)',     COLOR3),
  dec  : makeBar('decChart',  'Dec Time (µs)',     COLOR3),
  thr  : makeBar('thrChart',  'Throughput (Mbps)', COLOR3),
  cyc  : makeBar('cycChart',  'Clock Cycles',      COLOR3),
  ene  : makeBar('eneChart',  'Energy (nJ)',        COLOR3),
  rnd  : makeBar('rndChart',  'Rounds',            COLOR3, [31,20,10]),
};

// FPGA comparison chart (grouped: SW vs FPGA)
const fpgaChart = new Chart(document.getElementById('fpgaChart'), {
  type:'bar',
  data:{
    labels:['PRESENT','PRIDE'],
    datasets:[
      { label:'ESP32 Software (Mbps)', data:[0,0],
        backgroundColor:'rgba(0,200,255,.3)', borderColor:'#00c8ff', borderWidth:2, borderRadius:4 },
      { label:'FPGA Virtex-5 (Mbps)', data:[982.07, 1165.48],
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

// ── Update chart data ─────────────────────────────────────────
function setChart(chart, values) {
  chart.data.datasets[0].data = values;
  chart.update('active');
}

// ── Update metrics table ──────────────────────────────────────
function updateTable(m) {
  const ciphers = [
    { name:'PRESENT-80', d:m.PRESENT, block:64,  key:80,  rounds:31 },
    { name:'PRIDE',      d:m.PRIDE,   block:64,  key:128, rounds:20 },
    { name:'AES-128',    d:m.AES,     block:128, key:128, rounds:10 },
  ];
  const tb = document.getElementById('tableBody');
  tb.innerHTML = ciphers.map((c,i)=>{
    const nameClass = i===1 ? 'green' : '';
    return `<tr>
      <td class="${nameClass}">${c.name}</td>
      <td>${c.block}-bit</td><td>${c.key}-bit</td><td>${c.rounds}</td>
      <td>${c.d.enc_us.toFixed(2)}</td>
      <td>${c.d.dec_us.toFixed(2)}</td>
      <td>${c.d.throughput_mbps.toFixed(2)}</td>
      <td>${c.d.clock_cycles.toLocaleString()}</td>
      <td>${c.d.energy_nj.toFixed(4)}</td>
      <td class="hex">${'--'}</td>
      <td class="${c.d.match?'match-yes':'match-no'}">${c.d.match?'✓ YES':'✗ NO'}</td>
    </tr>`;
  }).join('');
}

// ── Parse and render data ────────────────────────────────────
function render(data) {
  const m = data.metrics;
  const p = m.PRESENT, r = m.PRIDE, a = m.AES;

  // Top cards
  document.getElementById('tempVal').textContent    = data.sensor.temperature.toFixed(1);
  document.getElementById('humVal').textContent     = `${data.sensor.humidity.toFixed(1)} %RH`;
  document.getElementById('activeCipher').textContent = data.active_cipher;
  document.getElementById('activeCT').textContent   = data.ciphertext;
  document.getElementById('liveEncTime').textContent = `Live enc: ${data.live_enc_us.toFixed(1)} µs`;

  // Fastest
  const times = [{n:'PRESENT-80',v:p.enc_us},{n:'PRIDE',v:r.enc_us},{n:'AES-128',v:a.enc_us}];
  const fastest = times.reduce((a,b)=>a.v<b.v?a:b);
  document.getElementById('fastestName').textContent = fastest.n;
  document.getElementById('fastestTime').textContent = `${fastest.v.toFixed(2)} µs enc time`;

  // Charts
  setChart(charts.enc, [p.enc_us,  r.enc_us,  a.enc_us]);
  setChart(charts.dec, [p.dec_us,  r.dec_us,  a.dec_us]);
  setChart(charts.thr, [p.throughput_mbps, r.throughput_mbps, a.throughput_mbps]);
  setChart(charts.cyc, [p.clock_cycles, r.clock_cycles, a.clock_cycles]);
  setChart(charts.ene, [p.energy_nj, r.energy_nj, a.energy_nj]);

  // FPGA comparison — SW throughput
  fpgaChart.data.datasets[0].data = [p.throughput_mbps, r.throughput_mbps];
  fpgaChart.update('active');

  updateTable(m);
}

// ── Fetch from JSONBin ────────────────────────────────────────
let lastTimestamp = 0;

async function fetchData() {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  try {
    const res = await fetch(API_URL, {
      headers: { 'X-Master-Key': API_KEY }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = json.record;

    if (data.timestamp !== lastTimestamp) {
      lastTimestamp = data.timestamp;
      render(data);
      dot.className  = 'dot live';
      text.textContent = `Live — device active`;
    } else {
      text.textContent = `Connected — waiting for new data...`;
    }
    document.getElementById('lastUpdate').textContent =
      `Last update: ${new Date().toLocaleTimeString()}`;
  } catch(e) {
    dot.className  = 'dot error';
    text.textContent = `Error: ${e.message}. Check BIN_ID and API_KEY in dashboard.js`;
    console.error(e);
  }
}

fetchData();
setInterval(fetchData, 6000);
