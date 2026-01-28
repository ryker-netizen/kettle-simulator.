/* KETTLE.EXE V4.0 - FINAL MASTER CORE */

const CONFIG = {
    bootText: `>> LOADING KTL_OS...
>> WARNING: ENTITY DETECTED IN CONTAINMENT PROTOCOL.
>> THIS IS NOT A SIMULATION.
>> CONNECTING TO OPTICAL SENSORS...
>> ...
>> CLICK TO ASSUME CONTROL.`
};

const STATE = {
    session: 1, isOn: false, temp: 20, chaos: 0, heartRate: 0,
    act: 0, angle: 0, clicks: 0, profile: "NEUROTYPICAL",
    webcamActive: false, resignationTimer: 0
};

// --- ЗВУКОВОЙ ДВИЖОК ---
class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.master.gain.value = 0.3;
    }

    startWork() {
        // Гул
        this.hum = this.ctx.createOscillator();
        this.hum.type = 'sawtooth';
        this.hum.frequency.value = 50;
        const hG = this.ctx.createGain(); hG.gain.value = 0.05;
        this.hum.connect(hG); hG.connect(this.master);
        this.hum.start();

        // Шум кипения
        const bufferSize = 2 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        this.noise = this.ctx.createBufferSource();
        this.noise.buffer = buffer; this.noise.loop = true;
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass'; this.filter.frequency.value = 200;
        this.noiseGain = this.ctx.createGain(); this.noiseGain.gain.value = 0;
        
        this.noise.connect(this.filter);
        this.filter.connect(this.noiseGain);
        this.noiseGain.connect(this.master);
        this.noise.start();
    }

    updateBoil(temp) {
        if (this.noiseGain) {
            this.noiseGain.gain.value = Math.min((temp - 20) / 100, 1);
            this.filter.frequency.value = 200 + (temp * 10);
        }
    }

    pulse(bpm) {
        if (this.pInt) clearInterval(this.pInt);
        this.pInt = setInterval(() => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.frequency.value = 40; o.connect(g); g.connect(this.master);
            o.start(); g.gain.setValueAtTime(0.4, this.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
            o.stop(this.ctx.currentTime + 0.1);
        }, 60000 / bpm);
    }

    stop() {
        if (this.hum) this.hum.stop();
        if (this.noise) this.noise.stop();
        if (this.pInt) clearInterval(this.pInt);
    }
}

// --- НАБЛЮДАТЕЛЬ ---
const audio = new AudioEngine();
const canvas = document.getElementById('bio-screen');
const ctx = canvas.getContext('2d');
const video = document.createElement('video');
video.autoplay = true;

function updateProfile() {
    const el = document.getElementById('user-profile');
    if (STATE.session > 4) { STATE.profile = "ANXIETY"; el.className = "anxious"; }
    if (STATE.session > 8) { STATE.profile = "OBSESSIVE"; el.className = "critical"; }
    if (STATE.session > 12) { STATE.profile = "SYMBIOTIC"; }
    el.innerText = STATE.profile;
}

async function startCamera() {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = s; STATE.webcamActive = true;
        log(">> OPTICAL FEED ESTABLISHED.");
    } catch (e) { log(">> SUBJECT HIDDEN. USING SHADOW."); }
}

function log(txt) { document.getElementById('log-feed').innerText = txt; }

// --- РЕНДЕР ЧАЙНИКА ---
function draw() {
    if (STATE.act === 4) return;
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 500, 500);

    const shake = STATE.isOn ? (Math.random() - 0.5) * (STATE.temp / 20) : 0;
    ctx.save();
    ctx.translate(250 + shake, 250 + shake);

    // Корпус
    const g = ctx.createLinearGradient(-70, 0, 70, 0);
    g.addColorStop(0, '#0a0a0a'); g.addColorStop(0.5, '#222'); g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-60, -90); ctx.lineTo(60, -90);
    ctx.quadraticCurveTo(80, 0, 70, 100); ctx.lineTo(-70, 100);
    ctx.quadraticCurveTo(-80, 0, -60, -90);
    ctx.fill();

    // Отражение
    ctx.save(); ctx.clip();
    if (STATE.webcamActive) {
        ctx.globalAlpha = 0.1 + (STATE.chaos / 200);
        ctx.filter = 'grayscale(1) contrast(1.5)';
        ctx.drawImage(video, -150, -150, 300, 300);
    } else if (STATE.session > 6) {
        ctx.fillStyle = '#000'; ctx.globalAlpha = 0.2;
        ctx.beginPath(); ctx.arc(0, -20, 40, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Носик
    const sx = 65 - (STATE.angle * 65);
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(sx, -40); ctx.lineTo(sx + 40 - (STATE.angle * 20), -60);
    ctx.lineTo(sx + 40 - (STATE.angle * 20), -30); ctx.lineTo(sx, 10);
    ctx.fill();
    
    if (STATE.angle > 0.8) { // Дыра
        ctx.fillStyle = '#000'; ctx.beginPath();
        ctx.arc(sx + 20, -45, 10, 0, Math.PI*2); ctx.fill();
    }

    // Лампочка
    ctx.fillStyle = STATE.isOn ? (STATE.session > 10 ? 'red' : '#ff5500') : '#220000';
    ctx.beginPath(); ctx.arc(0, 60, 5, 0, Math.PI*2); ctx.fill();

    ctx.restore();
    
    // Логика
    if (STATE.isOn) {
        STATE.temp += 0.2;
        audio.updateBoil(STATE.temp);
        if (STATE.temp >= 100) finishCycle();
    } else if (STATE.temp > 20) STATE.temp -= 0.1;

    if (STATE.session > 10) STATE.angle = Math.min(STATE.angle + 0.0005, 1);
    
    requestAnimationFrame(draw);
}

// --- УПРАВЛЕНИЕ ---
function finishCycle() {
    STATE.isOn = false; STATE.session++; STATE.chaos += 5;
    audio.stop();
    document.getElementById('sess-val').innerText = STATE.session.toString().padStart(2, '0');
    document.getElementById('interaction-node').innerText = "[ INITIATE ]";
    updateProfile();
    log(">> CYCLE COMPLETE. DATA SAVED.");
    if (STATE.session === 8) startCamera();
}

document.getElementById('interaction-node').onclick = () => {
    STATE.clicks++;
    if (STATE.clicks >= 150) triggerFinal();
    
    STATE.isOn = !STATE.isOn;
    if (STATE.isOn) {
        audio.ctx.resume(); audio.startWork();
        if (STATE.session > 5 && !STATE.heartRate) {
            STATE.heartRate = 80 + Math.floor(Math.random()*30);
            audio.pulse(STATE.heartRate);
            document.getElementById('bio-scan-line').classList.remove('hidden');
            setTimeout(() => document.getElementById('bio-scan-line').classList.add('hidden'), 3000);
        }
        document.getElementById('interaction-node').innerText = "[ ABORT ]";
    } else {
        audio.stop();
        document.getElementById('interaction-node').innerText = "[ INITIATE ]";
    }
};

// --- ФИНАЛ ---
function triggerFinal() {
    STATE.act = 4; audio.stop();
    document.getElementById('containment-unit').classList.add('burn-out');
    setTimeout(() => {
        document.body.innerHTML = `
            <div style="color:red; font-family:monospace; padding:50px; text-align:center; background:#000; height:100vh;">
                <h1 style="font-size:4rem;">BREACH</h1>
                <p>YOU ARE THE NEW VESSEL.</p>
                <p>CLICKS: ${STATE.clicks}</p>
            </div>
        `;
        const blob = new Blob([`KETTLE_SYS AUTOPSY\nClicks: ${STATE.clicks}\nProfile: ${STATE.profile}`], {type:'text/plain'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'AUTOPSY.txt'; a.click();
    }, 3000);
}

// Boot
let bIdx = 0;
function boot() {
    if (bIdx < CONFIG.bootText.length) {
        document.getElementById('boot-text').textContent += CONFIG.bootText[bIdx++];
        setTimeout(boot, 30);
    } else {
        document.getElementById('boot-sequence').onclick = () => {
            document.getElementById('boot-sequence').classList.add('hidden');
            document.getElementById('containment-unit').classList.remove('hidden');
            setInterval(() => {
                document.getElementById('sys-time').innerText = new Date().toLocaleTimeString();
            }, 1000);
            draw();
        };
    }
}
boot();
