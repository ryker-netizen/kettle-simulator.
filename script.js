// --- AUDIO SYSTEM (PROCEDURAL) ---
class AudioSynth {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5;
        this.oscillators = [];
    }

    // Звук трансформатора (гул)
    playHum() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 50; // 50Hz mains hum
        
        // Модуляция для нестабильности
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.5;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 5;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.1);

        return { osc, gain, lfo };
    }

    // Звук кипения (White Noise Filtered)
    playBoil() {
        const bufferSize = 2 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        const gain = this.ctx.createGain();
        gain.gain.value = 0;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();

        return { node: noise, gain: gain, filter: filter };
    }

    playClick() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.value = 1000;
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
        osc.stop(this.ctx.currentTime + 0.05);
    }

    // Звук ужаса (Shepard Tone approximation / Heartbeat)
    playHeartbeat() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.value = 40;
        osc.type = 'sine';
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        
        // Импульс
        setInterval(() => {
            gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        }, 1200);
    }
}

// --- GAME LOGIC ---
const STATE = {
    isOn: false,
    cycle: 0,
    temp: 20,
    chaos: 0, // 0 to 100
    act: 1, // 1: Normal, 2: Glitch, 3: Horror
    angle: 0, // Угол поворота чайника (для Акта 3)
};

const TEXTS = [
    ">> HEATING...",
    ">> DO NOT TOUCH",
    ">> WATCHING",
    ">> IT BOILS",
    ">> I SEE YOU",
    ">> SYSTEM FAIL",
    ">> NULL POINTER"
];

// Setup
const canvas = document.getElementById('kettle-screen');
const ctx = canvas.getContext('2d');
const btn = document.getElementById('pwr-btn');
const statusEl = document.getElementById('status-line');
const cycleEl = document.getElementById('cycle-val');
const timeEl = document.getElementById('sys-time');

let synth;
let boilSoundObj = null;
let humSoundObj = null;
let animationId;

// Init
document.getElementById('boot-screen').addEventListener('click', () => {
    synth = new AudioSynth();
    synth.ctx.resume();
    document.getElementById('boot-screen').style.display = 'none';
    startGame();
});

function startGame() {
    requestAnimationFrame(gameLoop);
    setInterval(updateTime, 1000);
    
    // Перехват закрытия вкладки
    window.onbeforeunload = function(e) {
        if (STATE.act > 1) {
            document.getElementById('modal-overlay').classList.remove('hidden');
            return "LEAVING?";
        }
    };
}

// Button Logic
btn.addEventListener('click', () => {
    if(!synth) return;
    
    synth.playClick();
    
    // Акт 3: Кнопка убегает или не работает
    if (STATE.act === 3 && Math.random() > 0.7) {
        btn.style.transform = `translate(${Math.random()*20-10}px, ${Math.random()*20-10}px)`;
        return;
    }

    toggleKettle();
});

document.getElementById('stay-btn').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('hidden');
    statusEl.innerText = ">> GOOD CHOICE";
    STATE.chaos += 10;
});

function toggleKettle() {
    STATE.isOn = !STATE.isOn;
    
    if (STATE.isOn) {
        btn.innerText = "[ ABORT ]";
        statusEl.innerText = ">> ELEMENT ACTIVE";
        statusEl.classList.remove('text-glitch');
        
        // Start Sounds
        humSoundObj = synth.playHum();
        boilSoundObj = synth.playBoil();
        
    } else {
        btn.innerText = "[ I/O ]";
        statusEl.innerText = ">> COOLING DOWN";
        
        // Stop Sounds
        if(humSoundObj) {
            humSoundObj.osc.stop();
            humSoundObj = null;
        }
        if(boilSoundObj) {
            boilSoundObj.node.stop();
            boilSoundObj = null;
        }
    }
}

// Game Loop
function gameLoop() {
    updatePhysics();
    draw();
    
    // Glitch trigger
    if (STATE.chaos > 20 && Math.random() < 0.05) {
        ctx.fillStyle = `rgba(${Math.random()*255}, 0, 0, 0.2)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    requestAnimationFrame(gameLoop);
}

function updatePhysics() {
    if (STATE.isOn) {
        STATE.temp += 0.5 + (STATE.chaos * 0.01);
        
        // Modulate boil sound based on temp
        if (boilSoundObj) {
            const vol = Math.min((STATE.temp - 20) / 100, 1);
            boilSoundObj.gain.gain.value = vol * 0.5;
            boilSoundObj.filter.frequency.value = 200 + (STATE.temp * 10);
        }

        if (STATE.temp >= 100) {
            // Boiled
            completeCycle();
        }
    } else {
        if (STATE.temp > 20) STATE.temp -= 0.2;
    }

    // Act Progression
    if (STATE.cycle > 4) STATE.act = 2;
    if (STATE.cycle > 8) STATE.act = 3;

    // Act 3: Turning
    if (STATE.act === 3) {
        if (STATE.angle < 1) STATE.angle += 0.0005; // Медленный поворот
        if (!window.heartbeatStarted) {
            synth.playHeartbeat();
            window.heartbeatStarted = true;
            document.body.classList.add('shake-screen');
        }
    }
}

function completeCycle() {
    toggleKettle(); // Auto off
    STATE.cycle++;
    cycleEl.innerText = "0x" + STATE.cycle.toString(16).toUpperCase().padStart(2,'0');
    synth.playClick();
    
    // Events
    if (STATE.act === 2) {
        statusEl.innerText = TEXTS[Math.floor(Math.random() * TEXTS.length)];
        statusEl.classList.add('text-glitch');
        STATE.chaos += 5;
    }
    
    if (STATE.act === 3) {
        statusEl.innerText = ">> RUNNING_";
    }
}

function updateTime() {
    const d = new Date();
    timeEl.innerText = d.toTimeString().split(' ')[0];
}

// --- RENDERER (PIXEL ART SIMULATION) ---
function draw() {
    // Clear
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Noise Background
    for (let i = 0; i < 1000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#1a1a1a' : '#0d0d0d';
        ctx.fillRect(Math.random()*w, Math.random()*h, 2, 2);
    }

    // KETTLE DRAWING LOGIC (Procedural Pixel Art)
    // Shift perspective based on Act 3 angle
    const shiftX = STATE.angle * 20; 
    
    // Body
    ctx.fillStyle = '#444'; // Plastic
    ctx.fillRect(cx - 60, cy - 50, 120, 140);
    
    // Shading (Dithering fake)
    ctx.fillStyle = '#333';
    ctx.fillRect(cx + 20, cy - 50, 40, 140);

    // Metallic Band
    ctx.fillStyle = '#888';
    ctx.fillRect(cx - 55, cy - 40, 110, 80);

    // Spout (The scary part - it moves in Act 3)
    // Normal spout is to the right. As angle increases, it moves center and down.
    const spoutX = (cx + 60) - (STATE.angle * 60);
    const spoutW = 40 - (STATE.angle * 10); // Gets narrower as it points at you
    const spoutH = 10 + (STATE.angle * 20); // Gets "taller" (depth)
    
    ctx.fillStyle = '#666';
    ctx.fillRect(spoutX, cy - 20 + (STATE.angle * 10), spoutW, spoutH);
    
    // If facing player (Act 3), draw the hole
    if (STATE.angle > 0.5) {
        ctx.fillStyle = '#000';
        const holeSize = STATE.angle * 15;
        ctx.fillRect(spoutX + spoutW/2 - holeSize/2, cy - 15 + (STATE.angle * 15), holeSize, holeSize);
        
        // The Void Substance
        if (STATE.act === 3 && STATE.isOn) {
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.moveTo(spoutX + spoutW/2, cy);
            ctx.lineTo(w/2 - 50 + Math.random()*100, h);
            ctx.lineTo(w/2 + 50 + Math.random()*100, h);
            ctx.fill();
        }
    }

    // Handle
    ctx.fillStyle = '#222';
    ctx.fillRect(cx - 80, cy - 40, 20, 100);

    // LED Indicator
    ctx.fillStyle = STATE.isOn ? '#ff0000' : '#330000';
    if (STATE.isOn) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'red';
    }
    ctx.fillRect(cx, cy + 60, 10, 10);
    ctx.shadowBlur = 0;

    // Steam/Bubbles (Visual)
    if (STATE.isOn && STATE.temp > 80) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for(let i=0; i<5; i++) {
            const rx = cx - 40 + Math.random() * 80;
            const ry = cy - 70 - Math.random() * 20;
            ctx.fillRect(rx, ry, 4, 4);
        }
    }
    
    // RED EYES (Subliminal)
    if (STATE.act === 3 && Math.random() > 0.95) {
        ctx.fillStyle = 'red';
        ctx.fillRect(cx - 20, cy - 60, 4, 4);
        ctx.fillRect(cx + 20, cy - 60, 4, 4);
    }
}
