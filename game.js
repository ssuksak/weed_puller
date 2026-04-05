// =============================================
// 🌿 잡초 뽑기 - Weed Puller v3 (생존형 연타)
// 연타 + 성장 + 번식 + 골든잡초 + 게임오버
// =============================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ============ AUDIO ============
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null, bgmGain = null, bgmPlaying = false, bgmInterval = null, bgmNextTime = 0, bgmIdx = 0;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
    bgmGain = audioCtx.createGain();
    bgmGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    bgmGain.connect(audioCtx.destination);
  }
  // 모바일에서 suspended 상태 해제
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 🎵 박진감 BGM — 메인 멜로디 + 베이스 + 드럼
const BGM_MELODY = [
  // 긴장감 있는 단조 멜로디
  [392,0.5],[370,0.25],[349,0.25],[330,0.5],[294,0.25],[330,0.25],
  [349,0.5],[392,0.5],[440,0.5],[392,0.5],
  [370,0.5],[349,0.25],[330,0.25],[294,0.5],[262,0.25],[294,0.25],
  [330,0.5],[349,0.5],[392,1],
];
const BGM_BASS = [
  // 펄스 베이스 (옥타브 낮게)
  [131,1],[147,1],[165,1],[131,1],
  [147,1],[165,1],[175,1],[131,1],
];
const BGM_FEVER_MELODY = [
  [523,0.25],[587,0.25],[659,0.25],[698,0.25],
  [784,0.5],[659,0.25],[587,0.25],
  [523,0.25],[587,0.25],[784,0.5],[698,0.25],[659,0.25],
  [587,0.5],[523,0.5],[659,1],
];

let bgmBassIdx = 0, bgmBassNext = 0;
let bgmDrumNext = 0, bgmDrumBeat = 0;

function startBGM() {
  if (bgmPlaying) return;
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  bgmPlaying = true; bgmIdx = 0; bgmBassIdx = 0; bgmDrumBeat = 0;
  bgmNextTime = audioCtx.currentTime;
  bgmBassNext = audioCtx.currentTime;
  bgmDrumNext = audioCtx.currentTime;
  scheduleBGM();
}

function scheduleBGM() {
  if (!bgmPlaying || !audioCtx) return;
  const mel = feverMode ? BGM_FEVER_MELODY : BGM_MELODY;
  const tempo = feverMode ? 0.10 : 0.15;

  // 멜로디 (리드)
  while (bgmNextTime < audioCtx.currentTime + 0.5) {
    const [f, d] = mel[bgmIdx % mel.length];
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(bgmGain);
    o.type = feverMode ? 'square' : 'triangle';
    o.frequency.setValueAtTime(f, bgmNextTime);
    g.gain.setValueAtTime(0.3, bgmNextTime);
    g.gain.linearRampToValueAtTime(0.15, bgmNextTime + d * tempo * 0.3);
    g.gain.exponentialRampToValueAtTime(0.01, bgmNextTime + d * tempo * 0.9);
    o.start(bgmNextTime); o.stop(bgmNextTime + d * tempo);
    bgmNextTime += d * tempo; bgmIdx++;
  }

  // 베이스 (두꺼운 저음)
  const bassTempo = tempo * 4;
  while (bgmBassNext < audioCtx.currentTime + 0.5) {
    const [f, d] = BGM_BASS[bgmBassIdx % BGM_BASS.length];
    // 메인 베이스
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(bgmGain);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, bgmBassNext);
    g.gain.setValueAtTime(0.2, bgmBassNext);
    g.gain.exponentialRampToValueAtTime(0.02, bgmBassNext + d * bassTempo * 0.4);
    o.start(bgmBassNext); o.stop(bgmBassNext + d * bassTempo * 0.5);
    // 서브 베이스 (옥타브 아래)
    const o2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();
    o2.connect(g2); g2.connect(bgmGain);
    o2.type = 'sine';
    o2.frequency.setValueAtTime(f * 0.5, bgmBassNext);
    g2.gain.setValueAtTime(0.15, bgmBassNext);
    g2.gain.exponentialRampToValueAtTime(0.01, bgmBassNext + d * bassTempo * 0.3);
    o2.start(bgmBassNext); o2.stop(bgmBassNext + d * bassTempo * 0.4);
    bgmBassNext += d * bassTempo; bgmBassIdx++;
  }

  // 드럼 (킥 + 스네어 + 하이햇)
  const drumTempo = tempo * 2;
  while (bgmDrumNext < audioCtx.currentTime + 0.5) {
    const beat = bgmDrumBeat % 4;
    if (beat === 0 || beat === 2) {
      // 킥 드럼 (강하게)
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(bgmGain);
      o.type = 'sine';
      o.frequency.setValueAtTime(180, bgmDrumNext);
      o.frequency.exponentialRampToValueAtTime(35, bgmDrumNext + 0.1);
      g.gain.setValueAtTime(0.4, bgmDrumNext);
      g.gain.exponentialRampToValueAtTime(0.01, bgmDrumNext + 0.12);
      o.start(bgmDrumNext); o.stop(bgmDrumNext + 0.12);
    }
    if (beat === 1 || beat === 3) {
      // 스네어 (노이즈 + 톤)
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.06, audioCtx.sampleRate);
      const sn = buf.getChannelData(0);
      for (let i = 0; i < sn.length; i++) sn[i] = (Math.random() * 2 - 1) * (1 - i / sn.length);
      const n = audioCtx.createBufferSource(), ng = audioCtx.createGain();
      n.buffer = buf; n.connect(ng); ng.connect(bgmGain);
      ng.gain.setValueAtTime(0.2, bgmDrumNext);
      ng.gain.exponentialRampToValueAtTime(0.01, bgmDrumNext + 0.06);
      n.start(bgmDrumNext);
      // 스네어 톤
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(bgmGain);
      o.type = 'triangle';
      o.frequency.setValueAtTime(200, bgmDrumNext);
      o.frequency.exponentialRampToValueAtTime(120, bgmDrumNext + 0.04);
      g.gain.setValueAtTime(0.15, bgmDrumNext);
      g.gain.exponentialRampToValueAtTime(0.01, bgmDrumNext + 0.05);
      o.start(bgmDrumNext); o.stop(bgmDrumNext + 0.05);
    }
    // 하이햇 (매 비트)
    const hbuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.015, audioCtx.sampleRate);
    const hd = hbuf.getChannelData(0);
    for (let i = 0; i < hd.length; i++) hd[i] = (Math.random() * 2 - 1) * (1 - i / hd.length) * 0.8;
    const hn = audioCtx.createBufferSource(), hg = audioCtx.createGain();
    hn.buffer = hbuf; hn.connect(hg); hg.connect(bgmGain);
    hg.gain.setValueAtTime(0.1, bgmDrumNext);
    hg.gain.exponentialRampToValueAtTime(0.001, bgmDrumNext + 0.015);
    hn.start(bgmDrumNext);

    bgmDrumNext += drumTempo * 0.25; bgmDrumBeat++;
  }

  bgmInterval = setTimeout(scheduleBGM, 150);
}
function stopBGM() { bgmPlaying = false; clearTimeout(bgmInterval); }

function sfx(type, extra) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const mk = () => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); return {o,g}; };

  if (type === 'tap') {
    // 탭 피치: extra = progress (0~1)
    const p = extra || 0;
    const {o,g} = mk();
    o.type = 'sine';
    o.frequency.setValueAtTime(300 + p * 800, now);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    o.start(now); o.stop(now + 0.06);
  } else if (type === 'pull') {
    const {o,g} = mk();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, now);
    o.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    o.start(now); o.stop(now + 0.15);
    // noise burst
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.04, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const n = audioCtx.createBufferSource(), ng = audioCtx.createGain();
    n.buffer = buf; n.connect(ng); ng.connect(audioCtx.destination);
    ng.gain.setValueAtTime(0.2, now + 0.08);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    n.start(now + 0.08);
  } else if (type === 'combo') {
    const pitch = Math.min(600 + (extra || 0) * 80, 2000);
    const {o,g} = mk();
    o.type = 'triangle';
    o.frequency.setValueAtTime(pitch, now);
    o.frequency.exponentialRampToValueAtTime(pitch * 1.5, now + 0.06);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    o.start(now); o.stop(now + 0.18);
  } else if (type === 'fever') {
    [523,659,784,1046].forEach((f,i) => {
      const {o,g} = mk();
      o.type = 'square'; o.frequency.setValueAtTime(f, now+i*0.06);
      g.gain.setValueAtTime(0.1, now+i*0.06);
      g.gain.exponentialRampToValueAtTime(0.01, now+i*0.06+0.12);
      o.start(now+i*0.06); o.stop(now+i*0.06+0.12);
    });
  } else if (type === 'miss') {
    const {o,g} = mk();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(400, now);
    o.frequency.exponentialRampToValueAtTime(80, now + 0.25);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    o.start(now); o.stop(now + 0.3);
  } else if (type === 'golden') {
    [784,988,1175,1568].forEach((f,i) => {
      const {o,g} = mk();
      o.type = 'triangle'; o.frequency.setValueAtTime(f, now+i*0.05);
      g.gain.setValueAtTime(0.15, now+i*0.05);
      g.gain.exponentialRampToValueAtTime(0.01, now+i*0.05+0.15);
      o.start(now+i*0.05); o.stop(now+i*0.05+0.15);
    });
  } else if (type === 'pop') {
    const {o,g} = mk();
    o.type = 'sine';
    o.frequency.setValueAtTime(250+Math.random()*200, now);
    o.frequency.exponentialRampToValueAtTime(500+Math.random()*200, now+0.04);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.01, now+0.05);
    o.start(now); o.stop(now+0.05);
  } else if (type === 'spread') {
    const {o,g} = mk();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, now);
    o.frequency.exponentialRampToValueAtTime(300, now+0.15);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.01, now+0.2);
    o.start(now); o.stop(now+0.2);
  } else if (type === 'countdown') {
    const {o,g} = mk(); o.type='sine'; o.frequency.setValueAtTime(880,now);
    g.gain.setValueAtTime(0.12,now); g.gain.exponentialRampToValueAtTime(0.01,now+0.1);
    o.start(now); o.stop(now+0.1);
  } else if (type === 'go') {
    [523,784,1046].forEach((f,i) => { const {o,g}=mk(); o.type='square'; o.frequency.setValueAtTime(f,now+i*0.06); g.gain.setValueAtTime(0.12,now+i*0.06); g.gain.exponentialRampToValueAtTime(0.01,now+i*0.06+0.1); o.start(now+i*0.06); o.stop(now+i*0.06+0.1); });
  } else if (type === 'end') {
    [440,392,349,261].forEach((f,i) => { const {o,g}=mk(); o.type='triangle'; o.frequency.setValueAtTime(f,now+i*0.2); g.gain.setValueAtTime(0.12,now+i*0.2); g.gain.exponentialRampToValueAtTime(0.01,now+i*0.2+0.25); o.start(now+i*0.2); o.stop(now+i*0.2+0.25); });
  } else if (type === 'warning') {
    const {o,g}=mk(); o.type='square'; o.frequency.setValueAtTime(200,now);
    g.gain.setValueAtTime(0.08,now); g.gain.exponentialRampToValueAtTime(0.01,now+0.1);
    o.start(now); o.stop(now+0.1);
  } else if (type === 'heartbeat') {
    // 심장 쿵쿵 (위기 시)
    [0, 0.15].forEach(delay => {
      const {o,g}=mk(); o.type='sine';
      o.frequency.setValueAtTime(60, now+delay);
      o.frequency.exponentialRampToValueAtTime(30, now+delay+0.1);
      g.gain.setValueAtTime(0.3, now+delay);
      g.gain.exponentialRampToValueAtTime(0.01, now+delay+0.15);
      o.start(now+delay); o.stop(now+delay+0.15);
    });
  } else if (type === 'survive') {
    // 기사회생! 화려한 상승음
    [392,440,523,587,659,784].forEach((f,i) => {
      const {o,g}=mk(); o.type='triangle';
      o.frequency.setValueAtTime(f, now+i*0.04);
      g.gain.setValueAtTime(0.15, now+i*0.04);
      g.gain.exponentialRampToValueAtTime(0.01, now+i*0.04+0.1);
      o.start(now+i*0.04); o.stop(now+i*0.04+0.1);
    });
  } else if (type === 'newrecord') {
    // 신기록!! 팡파레
    [523,0,659,0,784,0,1046].forEach((f,i) => {
      if (!f) return;
      const {o,g}=mk(); o.type='square';
      o.frequency.setValueAtTime(f, now+i*0.08);
      g.gain.setValueAtTime(0.12, now+i*0.08);
      g.gain.exponentialRampToValueAtTime(0.01, now+i*0.08+0.2);
      o.start(now+i*0.08); o.stop(now+i*0.08+0.2);
    });
  } else if (type === 'wave') {
    // 웨이브 전환
    [440,523,659].forEach((f,i) => {
      const {o,g}=mk(); o.type='triangle';
      o.frequency.setValueAtTime(f, now+i*0.06);
      g.gain.setValueAtTime(0.12, now+i*0.06);
      g.gain.exponentialRampToValueAtTime(0.01, now+i*0.06+0.12);
      o.start(now+i*0.06); o.stop(now+i*0.06+0.12);
    });
  } else if (type === 'badge') {
    // 업적 달성
    [784,988,1175].forEach((f,i) => {
      const {o,g}=mk(); o.type='sine';
      o.frequency.setValueAtTime(f, now+i*0.1);
      g.gain.setValueAtTime(0.15, now+i*0.1);
      g.gain.exponentialRampToValueAtTime(0.01, now+i*0.1+0.15);
      o.start(now+i*0.1); o.stop(now+i*0.1+0.15);
    });
  }
}

// ============ HIGH SCORE ============
let highScore = parseInt(localStorage.getItem('weedpuller_highscore') || '0');
let highSurvive = parseInt(localStorage.getItem('weedpuller_highsurvive') || '0');
let isNewRecord = false;

// ============ WAVE SYSTEM ============
let wave = 1;
let waveTimer = 0;
const WAVE_DURATION = 12; // 12초마다 웨이브 증가
let dangerLevel = 0; // 0~1 (채움률)
let wasDanger = false; // 위기 상태였는지 (기사회생 체크용)
let heartbeatTimer = 0;

// ============ ACHIEVEMENTS ============
const BADGES = [
  { id: 'first_pull', name: '🌱 첫 수확', desc: '잡초 1개 뽑기', check: () => pullCount >= 1 },
  { id: 'combo5', name: '🔥 콤보 입문', desc: '5 콤보 달성', check: () => maxCombo >= 5 },
  { id: 'combo10', name: '💥 콤보 마스터', desc: '10 콤보 달성', check: () => maxCombo >= 10 },
  { id: 'combo20', name: '🌪️ 콤보 신', desc: '20 콤보 달성', check: () => maxCombo >= 20 },
  { id: 'score500', name: '⭐ 500점', desc: '500점 돌파', check: () => score >= 500 },
  { id: 'score1000', name: '🌟 1000점', desc: '1000점 돌파', check: () => score >= 1000 },
  { id: 'score3000', name: '💎 3000점', desc: '3000점 돌파', check: () => score >= 3000 },
  { id: 'survive30', name: '⏱️ 30초', desc: '30초 생존', check: () => elapsed >= 30 },
  { id: 'survive60', name: '⏱️ 1분', desc: '1분 생존', check: () => elapsed >= 60 },
  { id: 'survive120', name: '🏆 2분', desc: '2분 생존', check: () => elapsed >= 120 },
  { id: 'golden', name: '⭐ 골든 헌터', desc: '골든 잡초 뽑기', check: () => goldenCount >= 1 },
  { id: 'survive_crisis', name: '💪 기사회생', desc: '위기에서 생존', check: () => surviveCount >= 1 },
];
let unlockedBadges = JSON.parse(localStorage.getItem('weedpuller_badges') || '[]');
let badgeQueue = []; // 표시 대기중인 뱃지
let goldenCount = 0, surviveCount = 0;

function checkBadges() {
  BADGES.forEach(b => {
    if (!unlockedBadges.includes(b.id) && b.check()) {
      unlockedBadges.push(b.id);
      localStorage.setItem('weedpuller_badges', JSON.stringify(unlockedBadges));
      badgeQueue.push(b);
      sfx('badge');
    }
  });
}

let badgeShowTimer = 0;
let currentBadge = null;

// ============ STATE ============
let plants = [], particles = [], holes = [];
let score = 0, combo = 0, maxCombo = 0;
let gameRunning = false, gameOver = false;
let pullCount = 0, flowerMissCount = 0;
let spawnTimer = 0, elapsed = 0;
let feverMode = false, feverTimer = 0;
let screenShake = 0, shakeX = 0, shakeY = 0;

// ============ GRID ============
const COLS = 6, ROWS = 8;
let gridX = 0, gridY = 0, cellW = 0, cellH = 0;
const occupied = new Set();
function cellKey(c,r) { return `${c},${r}`; }

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const aW = canvas.width - 32, aH = canvas.height * 0.62;
  cellW = aW / COLS; cellH = aH / ROWS;
  gridX = 16; gridY = canvas.height * 0.15;
}
window.addEventListener('resize', () => { resize(); invalidateBgCache(); });
resize();

// ============ FACES ============
function drawFace(type, x, y, r) {
  const s = r;
  if (type === 'angry') {
    ctx.fillStyle='#000';
    ctx.fillRect(x-s*0.3-2,y-s*0.15-1.5,4,3); ctx.fillRect(x+s*0.3-2,y-s*0.15-1.5,4,3);
    ctx.strokeStyle='#000'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x-s*0.45,y-s*0.35); ctx.lineTo(x-s*0.15,y-s*0.25);
    ctx.moveTo(x+s*0.45,y-s*0.35); ctx.lineTo(x+s*0.15,y-s*0.25); ctx.stroke();
    ctx.lineWidth=1.5; ctx.beginPath();
    ctx.moveTo(x-s*0.2,y+s*0.2); ctx.lineTo(x,y+s*0.15); ctx.lineTo(x+s*0.2,y+s*0.2); ctx.stroke();
  } else if (type === 'happy') {
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.arc(x-s*0.25,y-s*0.1,3,Math.PI,0); ctx.fill();
    ctx.beginPath(); ctx.arc(x+s*0.25,y-s*0.1,3,Math.PI,0); ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x,y+s*0.1,s*0.2,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
  } else if (type === 'surprised') {
    ctx.fillStyle='#FFF';
    ctx.beginPath(); ctx.arc(x-s*0.25,y-s*0.1,4,0,Math.PI*2); ctx.arc(x+s*0.25,y-s*0.1,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.arc(x-s*0.25,y-s*0.1,2,0,Math.PI*2); ctx.arc(x+s*0.25,y-s*0.1,2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x,y+s*0.15,4,0,Math.PI*2); ctx.stroke();
  } else if (type === 'cute') {
    ctx.fillStyle='#FF6B9D';
    [-1,1].forEach(d => {
      const ex=x+d*s*0.25,ey=y-s*0.1;
      ctx.beginPath(); ctx.moveTo(ex,ey+2);
      ctx.bezierCurveTo(ex-3,ey-2,ex-5,ey+2,ex,ey+5);
      ctx.bezierCurveTo(ex+5,ey+2,ex+3,ey-2,ex,ey+2); ctx.fill();
    });
    ctx.fillStyle='rgba(255,150,150,0.4)';
    ctx.beginPath(); ctx.arc(x-s*0.4,y+s*0.1,4,0,Math.PI*2); ctx.arc(x+s*0.4,y+s*0.1,4,0,Math.PI*2); ctx.fill();
  } else if (type === 'dead') {
    ctx.strokeStyle='#000'; ctx.lineWidth=2;
    [-1,1].forEach(d => {
      const ex=x+d*s*0.25,ey=y-s*0.1;
      ctx.beginPath(); ctx.moveTo(ex-3,ey-3); ctx.lineTo(ex+3,ey+3);
      ctx.moveTo(ex+3,ey-3); ctx.lineTo(ex-3,ey+3); ctx.stroke();
    });
    ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,y+s*0.15,4,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
    ctx.fillStyle='#FF6B6B'; ctx.beginPath(); ctx.ellipse(x+2,y+s*0.25,3,4,0.2,0,Math.PI*2); ctx.fill();
  } else if (type === 'scared') {
    ctx.fillStyle='#FFF';
    ctx.beginPath(); ctx.ellipse(x-s*0.25,y-s*0.12,4,5,0,0,Math.PI*2); ctx.ellipse(x+s*0.25,y-s*0.12,4,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.arc(x-s*0.25,y-s*0.06,2,0,Math.PI*2); ctx.arc(x+s*0.25,y-s*0.06,2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x-4,y+s*0.2); ctx.lineTo(x-1,y+s*0.15); ctx.lineTo(x+1,y+s*0.22); ctx.lineTo(x+4,y+s*0.17); ctx.stroke();
  } else if (type === 'golden') {
    // 별눈
    ctx.fillStyle='#FFD700';
    [-1,1].forEach(d => {
      const ex=x+d*s*0.25, ey=y-s*0.1;
      ctx.beginPath();
      for (let i=0;i<5;i++) {
        const a = (i/5)*Math.PI*2 - Math.PI/2;
        const r2 = i%2===0 ? 4 : 2;
        ctx.lineTo(ex+Math.cos(a)*r2, ey+Math.sin(a)*r2);
      }
      ctx.closePath(); ctx.fill();
    });
    ctx.strokeStyle='#B8860B'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x,y+s*0.12,s*0.15,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
  }
}

// ============ PLANT TYPES ============
const WEED_TYPES = [
  { name:'민들레', color:'#7CB342', inner:'#AED581', face:'angry', leaves:6, leafL:12 },
  { name:'바랭이', color:'#558B2F', inner:'#8BC34A', face:'surprised', leaves:4, leafL:18 },
  { name:'쇠비름', color:'#BF360C', inner:'#E57373', face:'happy', leaves:8, leafL:8 },
  { name:'명아주', color:'#33691E', inner:'#9CCC65', face:'angry', leaves:5, leafL:14 },
];
const FLOWER_TYPES = [
  { name:'데이지', color:'#388E3C', inner:'#FFF176', face:'cute', petal:'white', petalN:8 },
  { name:'튤립', color:'#2E7D32', inner:'#F48FB1', face:'cute', petal:'#E91E63', petalN:5 },
];

// ============ ITEMS & EVENTS ============
let items = []; // 드롭 아이템
let rainEvent = false;
let rainTimer = 0;
let moleTimer = 0;

class Item {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type; // 'shovel', 'freeze', 'fertilizer'
    this.life = 6; // 6초 후 사라짐
    this.r = Math.min(cellW, cellH) * 0.2;
    this.wobble = Math.random() * Math.PI * 2;
    this.collected = false;
  }
  update(dt) {
    this.wobble += dt * 4;
    this.life -= dt;
  }
  draw() {
    if (this.collected || this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life < 2 ? this.life / 2 : 1;
    const bounce = Math.sin(this.wobble) * 3;
    const emoji = this.type === 'shovel' ? '🔨' : this.type === 'freeze' ? '❄️' : '💊';
    ctx.font = `${this.r * 2}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, this.x, this.y + bounce);
    // 빛나는 원
    ctx.strokeStyle = this.type === 'shovel' ? '#FF9800' : this.type === 'freeze' ? '#03A9F4' : '#4CAF50';
    ctx.lineWidth = 2;
    ctx.globalAlpha *= 0.3 + Math.sin(this.wobble * 2) * 0.2;
    ctx.beginPath(); ctx.arc(this.x, this.y + bounce, this.r * 1.3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  contains(px, py) {
    return (px - this.x) ** 2 + (py - this.y) ** 2 < (this.r * 1.5) ** 2;
  }
}

function useItem(item) {
  item.collected = true;
  if (item.type === 'shovel') {
    // 가장 잡초 많은 행 전체 제거
    let bestRow = 0, bestCount = 0;
    for (let r = 0; r < ROWS; r++) {
      let cnt = 0;
      plants.forEach(p => { if (p.row === r && !p.isPulled && !p.isFlower) cnt++; });
      if (cnt > bestCount) { bestCount = cnt; bestRow = r; }
    }
    plants.forEach(p => {
      if (p.row === bestRow && !p.isPulled) {
        p.isPulled = true; p.face = 'dead'; p.pullDir = { x: 0, y: -1 };
        occupied.delete(cellKey(p.col, p.row));
        burst(p.x, p.y, '#FF9800', 5);
        score += 5;
      }
    });
    showFB(canvas.width / 2 - 40, gridY + bestRow * cellH, '🔨 한 줄 제거!', '#FF9800', 22);
    sfx('golden'); triggerShake(6);
  } else if (item.type === 'freeze') {
    // 5초간 성장/번식 멈춤
    plants.forEach(p => { p.growTimer = -5; p.spreadTimer = -5; });
    showFB(canvas.width / 2 - 40, canvas.height * 0.4, '❄️ 5초 동결!', '#03A9F4', 24);
    sfx('survive');
  } else if (item.type === 'fertilizer') {
    // 모든 잡초 1단계 축소 (큰→중, 중→작)
    plants.forEach(p => {
      if (!p.isPulled && !p.isFlower && !p.isGolden && p.growStage > 1) {
        p.growStage--;
        p.r *= 0.85;
        p.maxTaps = [0, 3, 5, 8][p.growStage];
        p.taps = Math.min(p.taps, p.maxTaps - 1);
      }
    });
    showFB(canvas.width / 2 - 40, canvas.height * 0.4, '💊 축소!', '#4CAF50', 24);
    sfx('survive');
  }
  pullCount++;
  updateHUD();
}

// ============ PLANT ============
// size: 1=작음(3탭), 2=중간(5탭), 3=큼(8탭)
// golden: 특수 (5탭, 대박 점수)
// bomb: 시간 내 못 뽑으면 폭발 (주변 잡초 생성)
// mole: 이동하는 두더지 (잡으면 보너스)
class Plant {
  constructor(col, row, opts = {}) {
    this.col = col; this.row = row;
    this.isFlower = opts.flower || false;
    this.isGolden = opts.golden || false;
    this.isBomb = opts.bomb || false;
    this.isMole = opts.mole || false;

    if (this.isMole) {
      this.type = { name:'두더지', color:'#795548', inner:'#D7CCC8', face:'surprised', leaves:0, leafL:0 };
      this.maxTaps = 2;
      this.points = 40;
      this.moveTimer = 0;
      this.moveInterval = 1.5 + Math.random(); // 1.5~2.5초마다 이동
    } else if (this.isBomb) {
      this.type = { name:'폭탄잡초', color:'#D32F2F', inner:'#FF8A80', face:'angry', leaves:5, leafL:10 };
      this.maxTaps = 4;
      this.points = 30;
      this.fuseTimer = 5 + Math.random() * 3; // 5~8초 후 폭발
    } else if (this.isGolden) {
      this.type = { name:'골든잡초', color:'#FFD700', inner:'#FFF9C4', face:'golden', leaves:6, leafL:14 };
      this.maxTaps = 5;
      this.points = 100;
    } else if (this.isFlower) {
      const ft = FLOWER_TYPES[Math.floor(Math.random()*FLOWER_TYPES.length)];
      this.type = ft;
      this.maxTaps = 1;
      this.points = -30;
    } else {
      this.type = WEED_TYPES[Math.floor(Math.random()*WEED_TYPES.length)];
      this.maxTaps = 3;
      this.points = 10;
    }

    this.taps = 0;
    this.x = gridX + col * cellW + cellW / 2;
    this.y = gridY + row * cellH + cellH / 2;
    this.r = Math.min(cellW, cellH) * 0.24;
    this.growAnim = 0;
    this.growStage = 1;
    this.growTimer = 0;
    this.isPulled = false;
    this.opacity = 1;
    this.wobble = Math.random() * Math.PI * 2;
    this.face = this.type.face;
    this.shake = 0;
    this.pullDir = {x:0,y:0};
    this.spreadTimer = 0;
  }

  get progress() { return this.taps / this.maxTaps; }

  update(dt) {
    if (this.growAnim < 1) this.growAnim = Math.min(1, this.growAnim + dt * 5);
    this.wobble += dt * 2;

    if (this.isPulled) {
      this.opacity -= dt * 4;
      this.x += this.pullDir.x * dt * 300;
      this.y += this.pullDir.y * dt * 300;
      return;
    }

    // 폭탄 카운트다운
    if (this.isBomb) {
      this.fuseTimer -= dt;
      if (this.fuseTimer <= 0) {
        // 폭발! 주변 4칸에 잡초 생성
        this.isPulled = true; this.face = 'dead';
        occupied.delete(cellKey(this.col, this.row));
        burst(this.x, this.y, '#FF1744', 15);
        burst(this.x, this.y, '#FF9100', 10);
        sfx('miss'); triggerShake(12);
        showFB(this.x, this.y, '💥 폭발!', '#FF1744', 28);
        combo = 0;
        // 주변에 잡초 생성
        [[0,-1],[0,1],[-1,0],[1,0]].forEach(([dc,dr]) => {
          const nc = this.col+dc, nr = this.row+dr;
          if (nc>=0 && nc<COLS && nr>=0 && nr<ROWS && !occupied.has(cellKey(nc,nr))) {
            const p = new Plant(nc, nr);
            plants.push(p); occupied.add(cellKey(nc,nr));
          }
        });
        updateHUD();
        return;
      }
      // 깜빡임 (남은 시간 적을수록 빠르게)
      if (this.fuseTimer < 2) {
        this.shake = Math.sin(Date.now() * 0.02) * 4;
      }
    }

    // 두더지 이동
    if (this.isMole) {
      this.moveTimer += dt;
      if (this.moveTimer >= this.moveInterval) {
        this.moveTimer = 0;
        // 빈 인접 칸으로 이동
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]].sort(() => Math.random() - 0.5);
        for (const [dc,dr] of dirs) {
          const nc = this.col+dc, nr = this.row+dr;
          if (nc>=0 && nc<COLS && nr>=0 && nr<ROWS && !occupied.has(cellKey(nc,nr))) {
            occupied.delete(cellKey(this.col, this.row));
            this.col = nc; this.row = nr;
            this.x = gridX + nc * cellW + cellW / 2;
            this.y = gridY + nr * cellH + cellH / 2;
            occupied.add(cellKey(nc, nr));
            this.taps = 0; // 이동하면 탭 리셋
            sfx('pop');
            break;
          }
        }
      }
    }

    // 성장 (잡초만, 꽃/골든/폭탄/두더지 제외)
    if (!this.isFlower && !this.isGolden && !this.isBomb && !this.isMole && this.growStage < 3) {
      this.growTimer += dt;
      const growTime = 8 - Math.min(elapsed * 0.05, 4); // 시간 지날수록 빨리 자람
      if (this.growTimer > growTime) {
        this.growTimer = 0;
        this.growStage++;
        this.r *= 1.2;
        this.maxTaps = [0, 3, 5, 8][this.growStage];
        this.points = [0, 10, 20, 35][this.growStage];
        this.taps = Math.min(this.taps, this.maxTaps - 1);
        sfx('pop');
      }
    }

    // 번식 (큰 잡초만)
    if (!this.isFlower && !this.isGolden && !this.isBomb && !this.isMole && this.growStage >= 3) {
      this.spreadTimer += dt;
      const spreadTime = 10 - Math.min(elapsed * 0.03, 5);
      if (this.spreadTimer > spreadTime) {
        this.spreadTimer = 0;
        spreadWeed(this.col, this.row);
      }
    }

    if (this.shake > 0) this.shake *= 0.85;
  }

  draw() {
    if (this.opacity <= 0) return;
    ctx.save(); ctx.globalAlpha = this.opacity;

    const sc = this.growAnim < 1 ? easeOutBack(this.growAnim) : 1 + Math.sin(this.wobble) * 0.03;
    const r = this.r * sc;
    const sx = (Math.random()-0.5) * this.shake;
    const sy = (Math.random()-0.5) * this.shake;
    const x = this.x + sx, y = this.y + sy;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(x, y+r*0.7, r*0.8, r*0.25, 0, 0, Math.PI*2); ctx.fill();

    if (this.isMole) {
      // 두더지 — 둥근 갈색 몸체
      ctx.fillStyle = '#795548';
      ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#D7CCC8';
      ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 0.35, 0, Math.PI * 2); ctx.fill();
      // 코
      ctx.fillStyle = '#FF8A80';
      ctx.beginPath(); ctx.arc(x, y + r * 0.05, 3, 0, Math.PI * 2); ctx.fill();
      drawFace(this.isPulled ? 'dead' : 'surprised', x, y, r);
      // 발
      ctx.fillStyle = '#5D4037';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.4, y + r * 0.4, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + r * 0.4, y + r * 0.4, 5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (this.isBomb) {
      // 폭탄 잡초 — 빨간 몸체 + 카운트다운
      const pulse = Math.sin(Date.now() * 0.01) * 0.15;
      ctx.fillStyle = `rgba(255,0,0,${0.15 + pulse})`;
      ctx.beginPath(); ctx.arc(x, y, r * 1.3, 0, Math.PI * 2); ctx.fill();
      // 잎
      ctx.fillStyle = '#D32F2F';
      for (let i = 0; i < 5; i++) {
        const a = (i/5)*Math.PI*2 + Math.sin(this.wobble+i)*0.2;
        ctx.save(); ctx.translate(x,y); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(r*0.5,0,r*0.35,r*0.15,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#D32F2F'; ctx.beginPath(); ctx.arc(x,y,r*0.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF8A80'; ctx.beginPath(); ctx.arc(x,y,r*0.35,0,Math.PI*2); ctx.fill();
      drawFace(this.isPulled ? 'dead' : 'angry', x, y, r);
      // 카운트다운 숫자
      if (this.fuseTimer !== undefined) {
        ctx.fillStyle = '#FFF';
        ctx.font = `bold ${r * 0.5}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(Math.ceil(this.fuseTimer), x, y + r + 8);
      }
    } else if (this.isGolden) {
      // 골든 글로우
      ctx.fillStyle = 'rgba(255,215,0,0.2)';
      ctx.beginPath(); ctx.arc(x, y, r*1.5 + Math.sin(this.wobble*2)*3, 0, Math.PI*2); ctx.fill();
      // 잎
      ctx.fillStyle = '#FFD700';
      for (let i=0;i<6;i++) {
        const a=(i/6)*Math.PI*2+Math.sin(this.wobble+i)*0.15;
        ctx.save(); ctx.translate(x,y); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(r*0.8,0,r*0.5,r*0.2,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle='#FFD700'; ctx.beginPath(); ctx.arc(x,y,r*0.55,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFF9C4'; ctx.beginPath(); ctx.arc(x-r*0.06,y-r*0.06,r*0.4,0,Math.PI*2); ctx.fill();
      // 반짝임
      const sp = Math.sin(Date.now()*0.008);
      ctx.fillStyle=`rgba(255,255,255,${0.5+sp*0.4})`;
      ctx.beginPath(); ctx.arc(x+r*0.4,y-r*0.4,3+sp*2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x-r*0.3,y+r*0.2,2+sp,0,Math.PI*2); ctx.fill();
    } else if (this.isFlower) {
      const pc=this.type.petalN;
      ctx.fillStyle=this.type.petal;
      for (let i=0;i<pc;i++) {
        const a=(i/pc)*Math.PI*2+this.wobble*0.3;
        ctx.beginPath(); ctx.ellipse(x+Math.cos(a)*r*0.55,y+Math.sin(a)*r*0.45,r*0.3,r*0.16,a,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle=this.type.inner;
      ctx.beginPath(); ctx.arc(x,y,r*0.38,0,Math.PI*2); ctx.fill();
      // 반짝
      const sp2=Math.sin(Date.now()*0.005+this.wobble);
      ctx.fillStyle=`rgba(255,255,255,${0.3+sp2*0.3})`;
      ctx.beginPath(); ctx.arc(x+r*0.3,y-r*0.3,2+sp2,0,Math.PI*2); ctx.fill();
    } else {
      // Weed
      const lc=this.type.leaves, ll=this.type.leafL*sc*(0.7+this.growStage*0.15);
      ctx.fillStyle=this.type.color;
      for (let i=0;i<lc;i++) {
        const a=(i/lc)*Math.PI*2+Math.sin(this.wobble+i)*0.15;
        ctx.save(); ctx.translate(x,y); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(ll*0.65,0,ll*0.45,r*0.18,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle=this.type.color; ctx.beginPath(); ctx.arc(x,y,r*0.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=this.type.inner; ctx.beginPath(); ctx.arc(x-r*0.06,y-r*0.06,r*0.38,0,Math.PI*2); ctx.fill();

      // 성장 단계 표시 (크기로 자연스럽게 + 작은 싹 표시)
      if (this.growStage >= 2) {
        ctx.fillStyle = this.type.color;
        ctx.globalAlpha *= 0.5;
        ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = this.opacity;
      }
    }

    // Face
    drawFace(this.isPulled ? 'dead' : this.face, x, y, r);

    // 탭 진행도 바
    if (this.taps > 0 && !this.isPulled && this.maxTaps > 1) {
      const barW = r * 1.6, barH = 4;
      const bx = x - barW/2, by = y + r + 6;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bx, by, barW, barH);
      const prog = this.taps / this.maxTaps;
      ctx.fillStyle = prog > 0.7 ? '#4CAF50' : prog > 0.4 ? '#FFC107' : '#FF9800';
      ctx.fillRect(bx, by, barW * prog, barH);
    }

    ctx.restore();
  }

  contains(px, py) {
    const dx = px - this.x, dy = py - this.y;
    return dx * dx + dy * dy < (this.r * 1.4) ** 2;
  }
}

function easeOutBack(t) { const c=1.7; return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2); }

// ============ SPREAD (번식) ============
function spreadWeed(col, row) {
  const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
  const shuffled = dirs.sort(() => Math.random() - 0.5);
  for (const [dc,dr] of shuffled) {
    const nc = col+dc, nr = row+dr;
    if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !occupied.has(cellKey(nc,nr))) {
      const p = new Plant(nc, nr);
      plants.push(p);
      occupied.add(cellKey(nc,nr));
      sfx('spread');
      // 번식 파티클
      burst(p.x, p.y, '#8BC34A', 4);
      return;
    }
  }
}

// ============ HOLES ============
class Hole {
  constructor(x,y,r) { this.x=x; this.y=y; this.r=r; this.life=1; }
  update(dt) { this.life -= dt * 0.8; }
  draw() {
    if (this.life<=0) return;
    ctx.save(); ctx.globalAlpha=this.life*0.4;
    ctx.fillStyle='#3E2723';
    ctx.beginPath(); ctx.ellipse(this.x,this.y,this.r*0.4,this.r*0.3,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ============ PARTICLES ============
function burst(x, y, color, n=8) {
  for (let i=0;i<n;i++) {
    const a=(i/n)*Math.PI*2, sp=100+Math.random()*200;
    particles.push({ x,y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:1, size:3+Math.random()*5, color });
  }
}
function updateParticles(dt) {
  particles.forEach(p => { p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.95; p.vy*=0.95; p.life-=dt*3; });
  particles = particles.filter(p => p.life > 0);
}
function drawParticles() {
  particles.forEach(p => {
    ctx.save(); ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

// ============ FEEDBACK ============
function showFB(x, y, text, color, size=22) {
  const el = document.createElement('div');
  el.className='feedback-pop';
  el.textContent=text;
  el.style.left=x+'px'; el.style.top=(y-20)+'px';
  el.style.color=color; el.style.fontSize=size+'px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 600);
}
function triggerShake(n) { screenShake=n; }

// ============ SPAWN ============
function spawnPlant() {
  const empty=[];
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (!occupied.has(cellKey(c,r))) empty.push({c,r});
  if (!empty.length) return;
  const cell = empty[Math.floor(Math.random()*empty.length)];

  const rand = Math.random();
  let opts = {};

  if (rand < 0.03) {
    opts = { golden: true }; // 3% 골든
  } else if (rand < 0.03 + Math.min(wave * 0.02, 0.12)) {
    opts = { bomb: true }; // 웨이브 증가에 따라 폭탄 확률 증가 (2~12%)
  } else if (rand < 0.03 + Math.min(wave * 0.02, 0.12) + 0.04) {
    opts = { mole: true }; // 4% 두더지
  } else if (rand < 0.03 + Math.min(wave * 0.02, 0.12) + 0.04 + Math.min(0.15 + elapsed * 0.002, 0.3)) {
    opts = { flower: true }; // 꽃
  }

  const p = new Plant(cell.c, cell.r, opts);
  plants.push(p); occupied.add(cellKey(cell.c, cell.r));
  sfx('pop');
}

// ============ TAP (핵심 메카닉!) ============
function tapPlant(plant) {
  if (plant.isPulled) return;

  plant.taps++;
  plant.shake = 6;
  const progress = plant.taps / plant.maxTaps;

  // 탭 사운드 (피치 올라감)
  sfx('tap', progress);

  if (plant.taps >= plant.maxTaps) {
    // 뽑혔다!
    completePull(plant);
  }
}

function completePull(plant) {
  plant.isPulled = true;
  plant.face = 'dead';
  plant.pullDir = { x: (Math.random()-0.5)*2, y: -1 };
  occupied.delete(cellKey(plant.col, plant.row));
  holes.push(new Hole(plant.x, plant.y, plant.r));

  if (plant.isFlower) {
    score = Math.max(0, score + plant.points);
    combo = 0; flowerMissCount++;
    showFB(plant.x, plant.y, '🌸 앗! -30', '#F04452', 24);
    sfx('miss'); triggerShake(10);
    feverMode = false;
    document.getElementById('fever-overlay').classList.remove('active');
    burst(plant.x, plant.y, '#FFB7C5', 8);
  } else if (plant.isGolden) {
    // 골든: 대박 점수 + 주변 잡초 전부 제거!
    goldenCount++;
    const pts = 100 * Math.max(combo, 1);
    score += pts; pullCount++;
    combo += 3;
    if (combo > maxCombo) maxCombo = combo;
    showFB(plant.x, plant.y, `⭐ +${pts}!`, '#FFD700', 32);
    sfx('golden'); triggerShake(8);
    burst(plant.x, plant.y, '#FFD700', 15);
    burst(plant.x, plant.y, '#FFF9C4', 10);
    // 주변 잡초 제거
    clearAdjacentWeeds(plant.col, plant.row);
  } else {
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    const mult = feverMode ? combo * 2 : Math.min(combo, 10);
    const pts = plant.points * mult;
    score += pts; pullCount++;
    sfx('pull'); triggerShake(4);

    if (combo >= 10 && !feverMode) {
      feverMode = true; feverTimer = 8; invalidateBgCache();
      sfx('fever');
      document.getElementById('fever-overlay').classList.add('active');
      showFB(canvas.width/2-50, canvas.height*0.12, '🔥 FEVER! 🔥', '#FFD700', 30);
    } else if (combo > 1) sfx('combo', combo);

    const ct = combo>1 ? ` x${combo}${feverMode?'🔥':''}` : '';
    showFB(plant.x, plant.y, `+${pts}${ct}`, feverMode?'#FFD700':combo>=5?'#FFC107':'#4CAF50', combo>=5?28:22);
    burst(plant.x, plant.y, '#8D6E63', 8);
    burst(plant.x, plant.y, '#A0522D', 5);
  }
  updateHUD();
}

function clearAdjacentWeeds(col, row) {
  const dirs = [[0,0],[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]];
  dirs.forEach(([dc,dr]) => {
    const nc=col+dc, nr=row+dr;
    const target = plants.find(p => p.col===nc && p.row===nr && !p.isPulled && !p.isFlower);
    if (target && target !== plants.find(p=>p.isGolden && p.col===col && p.row===row)) {
      target.isPulled = true; target.face = 'dead';
      target.pullDir = { x:(Math.random()-0.5)*2, y:-1 };
      occupied.delete(cellKey(nc,nr));
      holes.push(new Hole(target.x, target.y, target.r));
      burst(target.x, target.y, '#FFD700', 5);
      score += 10;
    }
  });
}

// ============ CHECK GAME OVER ============
function checkGameOver() {
  // 모든 칸이 차면 게임 오버
  let filledCount = 0;
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    if (occupied.has(cellKey(c,r))) filledCount++;
  }
  // 90% 이상 차면 경고
  const fillRate = filledCount / (COLS * ROWS);
  if (fillRate > 0.9 && !gameOver) {
    sfx('warning');
  }
  if (filledCount >= COLS * ROWS) {
    endGame();
  }
}

// ============ INPUT ============
canvas.addEventListener('touchstart', onTap, { passive: false });
canvas.addEventListener('mousedown', onTap);

function pos(e) { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }

function onTap(e) {
  if (!gameRunning) return;
  e.preventDefault?.();
  const { x, y } = pos(e);

  // 아이템 터치 체크 (우선)
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i].collected && items[i].contains(x, y)) {
      useItem(items[i]);
      return;
    }
  }

  // 식물 터치
  for (let i = plants.length-1; i >= 0; i--) {
    if (!plants[i].isPulled && plants[i].contains(x, y)) {
      tapPlant(plants[i]);
      break;
    }
  }
}

// ============ BACKGROUND (캐시) ============
let bgDecos=[], bgDecoCache=[], bgCache=null, bgCacheKey='';
function invalidateBgCache() { bgCacheKey=''; }

function initBgDecos() {
  bgDecos=[]; bgDecoCache=[];
  const types=['🐛','🐞','🦋','🐌','🍄','🌻','💧','🪨','🐜','🪱'];
  for (let i=0;i<14;i++) {
    const size=10+Math.random()*8;
    const oc=document.createElement('canvas'); oc.width=size*2; oc.height=size*2;
    const c=oc.getContext('2d'); c.font=`${size}px serif`; c.textAlign='center'; c.textBaseline='middle';
    c.fillText(types[i%types.length],size,size);
    bgDecoCache.push(oc);
    bgDecos.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, size, wobble:Math.random()*Math.PI*2, speed:0.5+Math.random()*1.5 });
  }
}

function drawBG() {
  const key=`${feverMode}_${canvas.width}_${canvas.height}`;
  if (bgCacheKey!==key) {
    if (!bgCache) bgCache=document.createElement('canvas');
    bgCache.width=canvas.width; bgCache.height=canvas.height;
    const bg=bgCache.getContext('2d');
    const W=canvas.width, H=canvas.height;

    // === 하늘 ===
    const skyH = gridY - 10;
    const sky = bg.createLinearGradient(0, 0, 0, skyH);
    if (feverMode) { sky.addColorStop(0,'#FF6F00'); sky.addColorStop(1,'#FFB74D'); }
    else { sky.addColorStop(0,'#87CEEB'); sky.addColorStop(0.6,'#B2EBF2'); sky.addColorStop(1,'#E0F7FA'); }
    bg.fillStyle = sky; bg.fillRect(0, 0, W, skyH);

    // 구름
    if (!feverMode) {
      bg.fillStyle = 'rgba(255,255,255,0.7)';
      [[W*0.15, skyH*0.3, 40],[W*0.55, skyH*0.2, 50],[W*0.85, skyH*0.4, 35]].forEach(([cx,cy,s]) => {
        bg.beginPath();
        bg.arc(cx,cy,s*0.5,0,Math.PI*2);
        bg.arc(cx+s*0.35,cy-s*0.15,s*0.35,0,Math.PI*2);
        bg.arc(cx+s*0.65,cy,s*0.4,0,Math.PI*2);
        bg.arc(cx+s*0.3,cy+s*0.08,s*0.3,0,Math.PI*2);
        bg.fill();
      });
    }

    // 산/언덕 (원경)
    bg.fillStyle = feverMode ? '#E65100' : '#66BB6A';
    bg.beginPath(); bg.moveTo(0, skyH);
    for (let x=0; x<=W; x+=20) {
      bg.lineTo(x, skyH - 15 - Math.sin(x*0.015)*12 - Math.sin(x*0.008)*8);
    }
    bg.lineTo(W, skyH); bg.closePath(); bg.fill();

    // 먼 밭 두렁 (중경)
    bg.fillStyle = feverMode ? '#BF360C' : '#4CAF50';
    bg.beginPath(); bg.moveTo(0, skyH + 5);
    for (let x=0; x<=W; x+=15) {
      bg.lineTo(x, skyH + 5 - Math.sin(x*0.02+1)*6);
    }
    bg.lineTo(W, skyH + 10); bg.lineTo(0, skyH + 10); bg.closePath(); bg.fill();

    // === 잔디밭 (밭 주변) ===
    const grassGrad = bg.createLinearGradient(0, skyH, 0, H);
    if (feverMode) { grassGrad.addColorStop(0,'#E65100'); grassGrad.addColorStop(1,'#BF360C'); }
    else { grassGrad.addColorStop(0,'#558B2F'); grassGrad.addColorStop(0.3,'#33691E'); grassGrad.addColorStop(1,'#1B5E20'); }
    bg.fillStyle = grassGrad; bg.fillRect(0, skyH, W, H - skyH);

    // 잔디 풀 디테일
    const gc = feverMode ? ['#FF8F00','#E65100'] : ['#689F38','#558B2F','#33691E'];
    for (let i=0; i<120; i++) {
      const gx = (i*37+Math.sin(i*3.1)*20) % W;
      const gy = skyH + (i*23+Math.cos(i*1.7)*15) % (H-skyH);
      bg.globalAlpha = 0.25;
      bg.fillStyle = gc[i%gc.length];
      bg.beginPath();
      // 풀잎 모양
      bg.moveTo(gx, gy);
      bg.quadraticCurveTo(gx+2, gy-8-Math.random()*4, gx+Math.sin(i)*3, gy-12-Math.random()*4);
      bg.quadraticCurveTo(gx-2, gy-8, gx, gy);
      bg.fill();
    }
    bg.globalAlpha = 1;

    // 밭 바깥 장식: 돌멩이, 나뭇잎
    bg.fillStyle = '#9E9E9E';
    [[20, H*0.85, 5],[W-25, H*0.78, 4],[W*0.3, H*0.92, 3],[W*0.7, H*0.88, 6]].forEach(([sx,sy,sr]) => {
      bg.globalAlpha = 0.3;
      bg.beginPath(); bg.ellipse(sx,sy,sr,sr*0.7,0.2,0,Math.PI*2); bg.fill();
    });
    bg.globalAlpha = 1;

    // === 화단 (밭 이랑) ===
    const bw=6, px=8, py=4;
    const bx=gridX-px, by=gridY-py;
    const bW=cellW*COLS+px*2, bH=cellH*ROWS+py*2;

    // 밭두렁 (가장자리 흙 더미)
    bg.fillStyle = feverMode ? '#8D6E63' : '#6D4C41';
    bgRR(bg, bx-bw-2, by-bw-2, bW+bw*2+4, bH+bw*2+4, 8);

    // 메인 흙
    const dirt = bg.createLinearGradient(bx, by, bx, by+bH);
    if (feverMode) { dirt.addColorStop(0,'#A1887F'); dirt.addColorStop(1,'#795548'); }
    else { dirt.addColorStop(0,'#8D6E63'); dirt.addColorStop(0.5,'#795548'); dirt.addColorStop(1,'#6D4C41'); }
    bg.fillStyle = dirt;
    bgRR(bg, bx, by, bW, bH, 4);

    // 밭 이랑 (가로줄 — 진짜 밭처럼)
    for (let r=0; r<ROWS; r++) {
      const ry = gridY + r * cellH + cellH * 0.5;
      // 이랑 볼록한 부분 (밝은 흙)
      bg.fillStyle = feverMode ? 'rgba(188,143,107,0.3)' : 'rgba(161,136,127,0.25)';
      bg.beginPath();
      bg.ellipse(bx + bW/2, ry, bW/2 - 4, cellH * 0.3, 0, 0, Math.PI * 2);
      bg.fill();
    }

    // 격자선 없음 — 이랑 볼록함만으로 구분

    // 흙 텍스처 (작은 돌, 흙덩이)
    for (let i=0; i<50; i++) {
      const tx = bx + 8 + ((i*37+i*i*3) % (bW-16));
      const ty = by + 8 + ((i*23+i*i*2) % (bH-16));
      const ts = 1 + (i%4);
      bg.globalAlpha = 0.08 + (i%3)*0.02;
      bg.fillStyle = i%5===0 ? '#9E9E9E' : '#5D4037';
      bg.beginPath(); bg.arc(tx, ty, ts, 0, Math.PI*2); bg.fill();
    }
    bg.globalAlpha = 1;

    // 화단 가장자리 풀 (밭 테두리에 자라는 잡풀)
    bg.fillStyle = feverMode ? '#FF8F00' : '#7CB342';
    for (let i=0; i<30; i++) {
      const edge = i < 15 ? 'top' : 'bottom';
      const ex = bx + (i%15) * (bW/15) + Math.sin(i*2)*5;
      const ey = edge === 'top' ? by - 2 : by + bH + 2;
      const eh = 4 + Math.sin(i*1.5)*3;
      const dir = edge === 'top' ? -1 : 1;
      bg.globalAlpha = 0.5;
      bg.beginPath();
      bg.moveTo(ex, ey);
      bg.quadraticCurveTo(ex + Math.sin(i)*3, ey + dir*eh, ex + 1, ey + dir*(eh+2));
      bg.quadraticCurveTo(ex - Math.sin(i)*2, ey + dir*eh*0.5, ex, ey);
      bg.fill();
    }
    bg.globalAlpha = 1;

    bgCacheKey=key;
  }

  // 캐시된 배경 그리기
  ctx.drawImage(bgCache, 0, 0);

  // 동적 장식 (이모지 — 벌레 등이 밭 주변에)
  if (!bgDecos.length) initBgDecos();
  const t = Date.now() * 0.001;
  bgDecos.forEach((d, i) => {
    ctx.save(); ctx.globalAlpha = 0.35;
    ctx.drawImage(bgDecoCache[i], d.x+Math.sin(t*d.speed+d.wobble)*5-d.size, d.y+Math.cos(t*d.speed*0.7+d.wobble)*3-d.size);
    ctx.restore();
  });
}
function bgRR(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();c.fill();}

// ============ HUD ============
function updateHUD() {
  document.getElementById('hud-score').textContent = score;
  // 타이머 대신 채움률 표시
  const filled = plants.filter(p=>!p.isPulled).length;
  const pct = Math.round(filled / (COLS*ROWS) * 100);
  document.getElementById('hud-timer').textContent = `${pct}%`;
  if (pct >= 80) document.getElementById('hud-timer').style.color = '#F04452';
  else if (pct >= 60) document.getElementById('hud-timer').style.color = '#FF9800';
  else document.getElementById('hud-timer').style.color = '';

  const ce=document.getElementById('hud-combo');
  if (combo>=2) {
    ce.textContent=feverMode?`🔥FEVER x${combo}🔥`:`🔥x${combo} COMBO`;
    ce.classList.remove('hidden','show'); void ce.offsetWidth; ce.classList.add('show');
  } else ce.classList.add('hidden');

  const le=document.getElementById('hud-level');
  const surviveTime = Math.floor(elapsed);
  le.textContent = `WAVE ${wave} · ${surviveTime}초`;
  le.classList.remove('hidden');

  // 최고기록 실시간 표시
  if (score > highScore) {
    document.getElementById('hud-score').style.color = '#FFD700';
  }
}

// ============ GAME LOOP ============
let lastTime = 0;

function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (screenShake > 0) {
    shakeX=(Math.random()-0.5)*screenShake; shakeY=(Math.random()-0.5)*screenShake;
    screenShake*=0.85; if(screenShake<0.3) screenShake=0;
  } else { shakeX=0; shakeY=0; }

  ctx.save(); ctx.translate(shakeX, shakeY);
  ctx.clearRect(-10,-10,canvas.width+20,canvas.height+20);
  drawBG();

  holes.forEach(h=>{h.update(dt);h.draw()});
  holes=holes.filter(h=>h.life>0);

  if (gameRunning) {
    elapsed += dt;

    // 웨이브 시스템
    waveTimer += dt;
    if (waveTimer >= WAVE_DURATION) {
      waveTimer = 0;
      wave++;
      sfx('wave');
      showFB(canvas.width/2 - 40, canvas.height * 0.4, `WAVE ${wave}`, '#FFF', 30);
    }

    // 스폰 속도: 웨이브마다 빨라짐
    spawnTimer += dt;
    const rate = Math.max(0.3, 1.8 - wave * 0.15);
    if (spawnTimer > rate) { spawnTimer = 0; spawnPlant(); }

    // 위기 감지 (심장박동)
    const filled = plants.filter(p => !p.isPulled).length;
    dangerLevel = filled / (COLS * ROWS);

    if (dangerLevel >= 0.75) {
      if (!wasDanger) wasDanger = true;
      heartbeatTimer += dt;
      if (heartbeatTimer > 0.8) {
        heartbeatTimer = 0;
        sfx('heartbeat');
      }
      // 위기 비네팅 효과
      document.getElementById('fever-overlay').style.boxShadow = 'inset 0 0 100px rgba(255,0,0,0.4)';
      document.getElementById('fever-overlay').classList.add('active');
    } else {
      if (wasDanger && dangerLevel < 0.4) {
        // 기사회생!
        wasDanger = false;
        surviveCount++;
        sfx('survive');
        showFB(canvas.width/2 - 50, canvas.height * 0.35, '💪 기사회생!', '#4CAF50', 28);
        score += 50;
        updateHUD();
      }
      if (!feverMode) {
        document.getElementById('fever-overlay').classList.remove('active');
        document.getElementById('fever-overlay').style.boxShadow = '';
      }
      heartbeatTimer = 0;
    }

    if (feverMode) {
      feverTimer -= dt;
      if (feverTimer <= 0) { feverMode = false; invalidateBgCache(); document.getElementById('fever-overlay').classList.remove('active'); }
    }

    // 아이템 드롭 (15초마다 + 랜덤)
    if (Math.floor(elapsed) % 15 === 0 && Math.floor(elapsed) !== Math.floor(elapsed - dt) && elapsed > 5) {
      const types = ['shovel', 'freeze', 'fertilizer'];
      const iType = types[Math.floor(Math.random() * types.length)];
      const ix = gridX + Math.random() * (cellW * COLS);
      const iy = gridY + cellH * ROWS + 30 + Math.random() * 40;
      items.push(new Item(ix, iy, iType));
      showFB(ix, iy - 20, '⬇️ 아이템!', '#FFF', 16);
    }

    // 비 이벤트 (30초마다 5초간)
    if (!rainEvent && Math.floor(elapsed) > 0 && Math.floor(elapsed) % 30 === 0 && Math.floor(elapsed) !== Math.floor(elapsed - dt)) {
      rainEvent = true; rainTimer = 5;
      showFB(canvas.width/2 - 30, canvas.height * 0.35, '🌧️ 비!', '#2196F3', 28);
      sfx('warning');
    }
    if (rainEvent) {
      rainTimer -= dt;
      if (rainTimer <= 0) { rainEvent = false; }
      else {
        // 비 내리는 동안 성장 3배 가속
        plants.forEach(p => { if (!p.isPulled && !p.isFlower && !p.isGolden && !p.isBomb && !p.isMole) p.growTimer += dt * 2; });
      }
    }

    // 아이템 업데이트
    items.forEach(it => it.update(dt));
    items = items.filter(it => it.life > 0 && !it.collected);

    // 업적 체크 (2초마다)
    if (Math.floor(elapsed) % 2 === 0 && Math.floor(elapsed) !== Math.floor(elapsed - dt)) {
      checkBadges();
    }

    // 게임 오버 체크
    checkGameOver();
  }

  // 뱃지 표시
  if (!currentBadge && badgeQueue.length > 0) {
    currentBadge = badgeQueue.shift();
    badgeShowTimer = 3;
  }
  if (currentBadge) {
    badgeShowTimer -= dt;
    const alpha = badgeShowTimer > 2.5 ? (3 - badgeShowTimer) * 2 : badgeShowTimer > 0.5 ? 1 : badgeShowTimer * 2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    const bx = canvas.width / 2, by = canvas.height * 0.25;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    bgRR(ctx, bx - 90, by - 20, 180, 50, 12);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(currentBadge.name, bx, by + 2);
    ctx.fillStyle = '#FFF';
    ctx.font = '11px sans-serif';
    ctx.fillText(currentBadge.desc, bx, by + 18);
    ctx.restore();
    if (badgeShowTimer <= 0) currentBadge = null;
  }

  plants.forEach(p => p.update(dt));
  plants = plants.filter(p => p.opacity > 0);
  plants.forEach(p => p.draw());
  items.forEach(it => it.draw());
  updateParticles(dt); drawParticles();

  // 비 이펙트
  if (rainEvent) {
    ctx.strokeStyle = 'rgba(100,180,255,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const rx = Math.random() * canvas.width;
      const ry = (Date.now() * 0.5 + i * 50) % canvas.height;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 10); ctx.stroke();
    }
  }

  if (gameRunning) updateHUD();

  ctx.restore();
  requestAnimationFrame(loop);
}

// ============ START ============
document.getElementById('btn-start').addEventListener('click', startCountdown);
document.getElementById('btn-retry').addEventListener('click', startCountdown);

function startCountdown() {
  initAudio();
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('result-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  plants=[]; particles=[]; holes=[]; occupied.clear();
  score=0; combo=0; maxCombo=0; elapsed=0;
  pullCount=0; flowerMissCount=0; feverMode=false; gameOver=false;
  wave=1; waveTimer=0; dangerLevel=0; wasDanger=false; heartbeatTimer=0;
  items=[]; rainEvent=false; rainTimer=0; moleTimer=0;
  goldenCount=0; surviveCount=0; isNewRecord=false;
  badgeQueue=[]; currentBadge=null; badgeShowTimer=0;
  document.getElementById('hud-score').style.color='';
  document.getElementById('fever-overlay').classList.remove('active');
  document.getElementById('fever-overlay').style.boxShadow='';
  invalidateBgCache(); updateHUD();

  const cd=document.getElementById('countdown');
  let n=3;
  (function tick(){
    if(n>0){
      cd.classList.remove('hidden'); cd.textContent=n;
      cd.style.animation='none'; void cd.offsetWidth; cd.style.animation='countPop 0.5s ease-out';
      sfx('countdown'); n--; setTimeout(tick,700);
    } else {
      cd.textContent='GO!'; cd.style.color='#4CAF50';
      cd.style.animation='none'; void cd.offsetWidth; cd.style.animation='countPop 0.5s ease-out';
      sfx('go');
      setTimeout(()=>{cd.classList.add('hidden');cd.style.color='white';startGame();},500);
    }
  })();
}

function startGame() {
  gameRunning = true; resize(); startBGM();
  for (let i=0;i<3;i++) setTimeout(spawnPlant, i*300);
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  gameRunning = false; stopBGM(); sfx('end');
  document.getElementById('hud-timer').style.color = '';
  document.getElementById('hud-score').style.color = '';
  document.getElementById('fever-overlay').classList.remove('active');
  document.getElementById('fever-overlay').style.boxShadow = '';

  const surviveTime = Math.floor(elapsed);

  // 최고기록 체크
  isNewRecord = score > highScore;
  if (isNewRecord) {
    highScore = score;
    localStorage.setItem('weedpuller_highscore', highScore);
  }
  if (surviveTime > highSurvive) {
    highSurvive = surviveTime;
    localStorage.setItem('weedpuller_highsurvive', highSurvive);
  }

  // 마지막 업적 체크
  checkBadges();

  let emoji, title;
  if (isNewRecord) { emoji='🎉'; title='신기록!'; sfx('newrecord'); }
  else if (surviveTime >= 120) { emoji='🏆'; title='잡초 마스터!'; }
  else if (surviveTime >= 60) { emoji='🌟'; title='잡초 전문가!'; }
  else if (surviveTime >= 30) { emoji='💪'; title='열심히 뽑았어요!'; }
  else { emoji='😅'; title='다시 도전!'; }

  document.getElementById('hud').classList.add('hidden');
  document.getElementById('hud-combo').classList.add('hidden');
  document.getElementById('hud-level').classList.add('hidden');

  setTimeout(()=>{
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('result-emoji').textContent=emoji;
    document.getElementById('result-title').textContent=title;
    document.getElementById('result-score-value').textContent=score;
    document.getElementById('stat-weeds').textContent=pullCount;
    document.getElementById('stat-combo').textContent=`x${maxCombo}`;
    document.getElementById('stat-miss').textContent=flowerMissCount;

    const recordText = isNewRecord ? '🎉 신기록!' : `🏅 최고: ${highScore}점`;
    document.querySelector('.result-label').textContent=`점 · WAVE ${wave} · ${surviveTime}초 생존`;

    // 최고기록/공유 영역 업데이트
    const extraEl = document.getElementById('result-extra');
    if (extraEl) {
      extraEl.innerHTML = `<div style="margin-bottom:12px;font-size:13px;color:#8B95A1">${recordText} · 최장 ${highSurvive}초</div>` +
        `<div style="margin-bottom:12px;font-size:13px;color:#8B95A1">🏅 업적 ${unlockedBadges.length}/${BADGES.length}</div>` +
        `<button id="btn-share" style="background:none;border:1px solid #E5E8EB;border-radius:12px;padding:10px 0;width:100%;font-size:14px;font-weight:600;color:#4E5968;cursor:pointer;margin-bottom:8px">📤 점수 공유하기</button>`;
      document.getElementById('btn-share')?.addEventListener('click', shareScore);
    }
  }, 500);
}

function shareScore() {
  const surviveTime = Math.floor(elapsed);
  const text = `🌿 잡초 뽑기\n⭐ ${score}점 · WAVE ${wave} · ${surviveTime}초 생존\n🔥 최대 콤보 x${maxCombo}\n\n도전해보세요! 👇\nhttps://ssuksak.github.io/weed_puller/`;
  if (navigator.share) {
    navigator.share({ text });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showFB(canvas.width/2 - 40, canvas.height*0.5, '📋 복사됨!', '#4CAF50', 20);
    });
  }
}

requestAnimationFrame(loop);
