/* KETTLE.EXE V3.0 - THE MIRROR UPDATE 
   CONTAINS: BIO-FEEDBACK, WEBCAM REFLECTION, PROCEDURAL HORROR
*/

const CONFIG = {
    titles: ["KETTLE.EXE", "DON'T LOOK", "IT'S COOLING", "YOU ARE HERE", "⠀", "RUN"],
    bootText: `>> LOADING KTL_OS...
>> WARNING: ENTITY DETECTED IN CONTAINMENT PROTOCOL.
>> THIS IS NOT A SIMULATION.
>> THIS IS A CONTAINMENT VESSEL.
>> CONNECTING TO OPTICAL SENSORS...
>> ...
>> CLICK TO ASSUME CONTROL.`
};

const STATE = {
    session: 1,
    isOn: false,
    temp: 20,
    chaos: 0, 
    heartRate: 0, 
    startTime: Date.now(),
    act: 0, // 0:Boot, 1:Normal, 2:Audit, 3:Symbiosis, 4:Final
    angle: 0,
    clicks: 0,
    profile: "NEUROTYPICAL",
    resignationTimer: 0,
    webcamActive: false,
    stream: null
};

// --- WEBCAM SYSTEM (THE MIRROR) ---
const videoElement = document.createElement('video');
videoElement.autoplay = true;
videoElement.style.display = 'none'; // Hidden, used only for texture
document.body.appendChild(videoElement);

async function tryActivateWebcam() {
    try {
        observer.comment(">> ACCESSING OPTICAL FEED...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
        STATE.stream = stream;
        STATE.webcamActive = true;
        observer.comment(">> I SEE YOU NOW.");
    } catch (e) {
        observer.comment(">> CAMERA BLOCKED. I STILL SEE YOU.");
        STATE.webcamActive = false; // Fallback to Shadow Face
    }
}

// --- AUDIO ENGINE ---
class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.master.gain.value = 0.4;
        this.humOsc = null;
        this.boilNode = null;
        this.heartOsc = null;
    }

    startHum() {
        // Complex Drone
        this.humOsc = this.ctx.createOscillator();
        this.humOsc.type = 'sawtooth';
        this.humOsc.frequency.value = 50;
        
        const lowOsc = this.ctx.createOscillator();
        lowOsc.type = 'sine';
        lowOsc.frequency.value = 18; // Infrasound

        // Binaural beat layer
        const binaural = this.ctx.createOscillator();
        binaural.type = 'sine';
        binaural.frequency.value = 54; // 4hz diff

        const gain = this.ctx.createGain();
        gain.gain.value = 0.1;
        
        this.humOsc.connect(gain);
        lowOsc.connect(gain);
        binaural.connect(gain);
        gain.connect(this.master);
        
        this.humOsc.start();
        lowOsc.start();
        binaural.start();
        this.humRef = { osc: this.humOsc, low: lowOsc, bin: binaural, gain: gain };
    }

    startBoil() {
        const bufSize = 2 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<bufSize; i++) data[i] = Math.random() * 2 - 1;

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
        gain.connect(this.master);
        noise.start();
        
        this.boilRef = { node: noise, filter: filter, gain: gain };
    }

    pulseHeart(bpm) {
        if(this.heartOsc) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.value = 40; 
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        
        const interval = 60000 / bpm;
        this.heartInterval = setInterval(() => {
            gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        }, interval);
    }

    stopAll() {
        if(this.humRef) { 
            try { this.humRef.osc.stop(); this.humRef.low.stop(); this.humRef.bin.stop(); } catch(e){}
        }
        if(this.boilRef) { 
            try { this.boilRef.node.stop(); } catch(e){}
        }
        if(this.heartInterval) clearInterval(this.heartInterval);
    }
}

// --- SHADOW OBSERVER ---
class ShadowObserver {
    constructor() {
        this.clickHistory = [];
        this.lastAction = Date.now();
        this.hesitationTriggered = false;
        
        // Persistent Memory
        const saved = localStorage.getItem('kettle_profile');
        if(saved) {
            const data = JSON.parse(saved);
            STATE.session = data.session + 1;
            STATE.profile = data.profile;
            console.log(">> WELCOME BACK, CARETAKER.");
        }
    }

    trackClick() {
        const now = Date.now();
        const delta = now - this.lastAction;
        this.clickHistory.push(delta);
        if(this.clickHistory.length > 20) this.clickHistory.shift();
        this.lastAction = now;
        STATE.clicks++;
        this.hesitationTriggered = false;
        
        if(delta < 200 && STATE.act < 3) this.comment(">> ADRENALINE DETECTED.");
        this.save();
        
        // Final Trigger Check
        if (STATE.clicks >= 666 || (STATE.session > 13 && STATE.act !== 4)) {
            triggerTheEnd();
        }
    }

    checkIdle() {
        const idleTime = Date.now() - this.lastAction;
        
        // Act 3 Idle punishment
        if (STATE.act >= 3 && STATE.isOn && idleTime > 30000) {
            STATE.resignationTimer++;
            if (STATE.resignationTimer > 800) triggerTheEnd(); 
        }

        if(idleTime > 10000 && !this.hesitationTriggered && STATE.act < 4) {
            this.hesitationTriggered = true;
            const msgs = [">> WHY ARE YOU WAITING?", ">> I CAN WAIT FOREVER.", ">> THE WATER GROWS IMPATIENT."];
            this.comment(msgs[Math.floor(Math.random()*msgs.length)]);
        }
    }

    updateProfile() {
        const el = document.getElementById('user-profile');
        if(STATE.session > 4) { STATE.profile = "ANXIETY"; el.className = "anxious"; }
        if(STATE.session > 8) { STATE.profile = "OBSESSIVE"; el.className = "critical"; }
        if(STATE.session > 12) { STATE.profile = "SYMBIOTIC"; }
        el.innerText = STATE.profile;
        document.documentElement.style.setProperty('--primary', 
            STATE.session > 8 ? '#ff3333' : (STATE.session > 4 ? '#d4ce18' : '#20c20e'));
    }

    comment(text) {
        const feed = document.getElementById('log-feed');
        feed.innerText = text;
        feed.style.opacity = 1;
        // Glitch text
        setTimeout(() => feed.style.opacity = 0.5, 100);
        setTimeout(() => feed.style.opacity = 1, 200);
    }

    save() {
        localStorage.setItem('kettle_profile', JSON.stringify({
            session: STATE.session,
            profile: STATE.profile,
            chaos: STATE.chaos
        }));
    }
}

// --- INIT & CORE ---
const audio = new AudioEngine();
const observer = new ShadowObserver();
const canvas = document.getElementById('bio-screen');
const ctx = canvas.getContext('2d');
const btn = document.getElementById('interaction-node');
let loopId;

// Boot
const bootEl = document.getElementById('boot-text');
let bootIdx = 0;

function typeBoot() {
    if(bootIdx < CONFIG.bootText.length) {
        bootEl.textContent += CONFIG.bootText.charAt(bootIdx);
        bootIdx++;
        setTimeout(typeBoot, 30 + Math.random()*50);
    } else {
        document.getElementById('boot-sequence').addEventListener('click', startSession);
    }
}
window.onload = typeBoot;

function startSession() {
    audio.ctx.resume();
    document.getElementById('boot-sequence').classList.add('hidden');
    document.getElementById('containment-unit').classList.remove('hidden');
    STATE.act = 1;
    observer.updateProfile();
    
    // Check cleanse attempt
    if(localStorage.getItem('kettle_profile')) {
        observer.comment(">> DATA RESTORED. YOU CANNOT FORGET.");
    }

    gameLoop();
    setInterval(() => {
        document.getElementById('sys-time').innerText = new Date().toLocaleTimeString();
        observer.checkIdle();
        glitchTabTitle();
    }, 1000);
    
    window.onblur = () => { if(STATE.act > 1) observer.comment(">> WHERE ARE YOU GOING?"); };
    window.onbeforeunload = (e) => {
        if(STATE.session > 2) { e.preventDefault(); return "IT'S NOT FINISHED."; }
    };
}

// --- LOOP ---
function gameLoop() {
    if(STATE.act === 4) return;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0,0,500,500);

    drawNoise();
    drawRealisticKettle(); // THE NEW RENDERER
    
    if(STATE.isOn) {
        STATE.temp += 0.3 + (STATE.chaos * 0.02);
        
        if(audio.boilRef) {
            const vol = Math.min((STATE.temp - 20)/100, 1);
            audio.boilRef.gain.gain.value = vol;
            audio.boilRef.filter.frequency.value = 200 + (STATE.temp * 15);
        }

        if(STATE.temp >= 100) cycleComplete();
    } else {
        if(STATE.temp > 20) STATE.temp -= 0.5;
    }

    // ACT TRIGGERS
    if(STATE.session > 5 && !STATE.heartRate && STATE.isOn) triggerBioScan();
    
    // Trigger Webcam Request at Session 8
    if(STATE.session === 8 && !STATE.webcamActive && STATE.isOn) {
        tryActivateWebcam();
    }

    // Act 3 Turn
    if(STATE.session > 10) {
        STATE.act = 3;
        if(STATE.angle < 1) STATE.angle += 0.0008;
    }

    if(STATE.chaos > 50 && Math.random() < 0.002) triggerBSOD();

    loopId = requestAnimationFrame(gameLoop);
}

// --- THE NEW RENDERER (PHOTOREALISM + REFLECTIONS) ---
function drawRealisticKettle() {
    const cx = 250;
    const cy = 250;
    const t = STATE.temp;
    const shake = t > 80 ? (Math.random() - 0.5) * (t / 40) : 0;
    
    ctx.save();
    ctx.translate(cx + shake, cy + shake);

    // -- 1. MAIN BODY (Detailed) --
    const bodyGrad = ctx.createLinearGradient(-70, 0, 70, 0);
    bodyGrad.addColorStop(0, '#0a0a0a'); // Dark edge
    bodyGrad.addColorStop(0.2, '#333');   // Highlight
    bodyGrad.addColorStop(0.5, '#1a1a1a'); // Center
    bodyGrad.addColorStop(0.8, '#333');   // Highlight
    bodyGrad.addColorStop(1, '#050505');  // Dark edge
    
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-60, -90); // Top left
    ctx.lineTo(60, -90);  // Top right
    ctx.quadraticCurveTo(80, 0, 70, 90); // Right curve
    ctx.lineTo(-70, 90);  // Bottom
    ctx.quadraticCurveTo(-80, 0, -60, -90); // Left curve
    ctx.closePath();
    ctx.fill();

    // -- 2. THE REFLECTION (WEBCAM or SHADOW) --
    // We clip the drawing to the body shape
    ctx.save();
    ctx.clip(); 
    
    if (STATE.webcamActive && videoElement.readyState === 4) {
        // Draw user face
        ctx.globalAlpha = 0.2 + (STATE.chaos * 0.005); // Visibility increases with chaos
        ctx.filter = 'grayscale(100%) contrast(150%) blur(1px)';
        // Draw video centered and distorted
        ctx.drawImage(videoElement, -100, -100, 200, 200); 
    } else if (STATE.session > 8) {
        // Draw Shadow Entity
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, -20, 30, 0, Math.PI*2); // Head
        ctx.fill();
        // Eyes
        if (Math.random() > 0.95) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(-10, -25, 2, 2);
            ctx.fillRect(10, -25, 2, 2);
        }
    }
    ctx.restore(); // End clipping

    // -- 3. SPOUT (Morphing) --
    const sX = 60 - (STATE.angle * 60); // Moves to center
    const sY = -50 + (STATE.angle * 20);
    
    ctx.fillStyle = '#1f1f1f';
    ctx.beginPath();
    ctx.moveTo(sX, sY);
    ctx.lineTo(sX + 40 - (STATE.angle * 20), sY - 20); // Tip
    ctx.lineTo(sX + 40 - (STATE.angle * 20), sY + 10);
    ctx.lineTo(sX, sY + 40);
    ctx.fill();
    
    // Spout Hole (The Void)
    if (STATE.angle > 0.8) {
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sX + 20, sY - 5, 8 + (STATE.angle*5), 0, Math.PI*2);
        ctx.fill();
        
        // Leaking pixels
        if(STATE.isOn) {
            ctx.fillStyle = 'rgba(0,0,0,0.9)';
            ctx.fillRect(sX + 18, sY, 5, 200);
        }
    }

    // -- 4. HANDLE --
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-65, -70);
    ctx.bezierCurveTo(-110, -70, -110, 50, -65, 70);
    ctx.stroke();

    // -- 5. LED INDICATOR --
    ctx.fillStyle = STATE.isOn ? (STATE.session > 8 ? '#ff0000' : '#ff5500') : '#220000';
    if(STATE.isOn) {
        const pulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
        ctx.shadowBlur = 20 * pulse;
        ctx.shadowColor = STATE.session > 20 ? 'red' : 'orange';
    }
    ctx.beginPath();
    ctx.arc(0, 60, 5, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // -- 6. DIRT & SCRATCHES (Noise Overlay) --
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    if(Math.random() > 0.5) ctx.fillRect(-50, -50, 20, 2); // Scratches
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
}

function drawNoise() {
    for(let i=0; i<600; i++) {
        ctx.fillStyle = Math.random() > 0.9 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)';
        ctx.fillRect(Math.random()*500, Math.random()*500, 2, 2);
    }
}

// --- INTERACTION ---
btn.addEventListener('click', () => {
    observer.trackClick();
    
    // SABOTAGE LOGIC
    if(STATE.session > 7 && Math.random() > 0.75) {
        observer.comment(">> BUTTON STUCK. PANIC INDUCED.");
        btn.style.transform = `translate(${Math.random()*30-15}px, ${Math.random()*10}px)`;
        return; 
    }

    STATE.isOn = !STATE.isOn;
    
    if(STATE.isOn) {
        btn.textContent = "[ ABORT PROTOCOL ]";
        audio.startHum();
        audio.startBoil();
        if(STATE.heartRate) audio.pulseHeart(STATE.heartRate);
        observer.comment(">> ELEMENT ACTIVE.");
    } else {
        btn.textContent = "[ INITIATE ]";
        audio.stopAll();
        observer.comment(">> COOLING. WHY?");
    }
});

function cycleComplete() {
    STATE.isOn = false;
    audio.stopAll();
    STATE.session++;
    STATE.chaos += 8; // Faster chaos ramp
    
    document.getElementById('sess-val').textContent = STATE.session.toString().padStart(2, '0');
    observer.updateProfile();
    observer.save();
    
    btn.textContent = "[ INITIATE ]";
    
    const summaries = [
        ">> INITIALIZING.",
        ">> DATA RECEIVED.",
        ">> PATTERN RECOGNIZED.",
        ">> DO YOU FEEL THE HEAT?",
        ">> BIO-SYNC COMPLETE.",
        ">> DON'T LOOK BEHIND YOU.",
        ">> I AM IN THE MIRROR."
    ];
    observer.comment(summaries[Math.min(STATE.session, summaries.length-1)] || ">> ...");
}

// --- EVENTS ---
function triggerBioScan() {
    document.getElementById('bio-scan-line').classList.remove('hidden');
    observer.comment(">> BIOMETRIC SCAN. FREEZE.");
    
    setTimeout(() => {
        document.getElementById('bio-scan-line').classList.add('hidden');
        STATE.heartRate = 75 + Math.floor(Math.random()*30); 
        observer.comment(`>> PULSE DETECTED: ${STATE.heartRate}. SYNCING AUDIO.`);
        audio.pulseHeart(STATE.heartRate);
    }, 4000);
}

function glitchTabTitle() {
    if(STATE.chaos > 15 && Math.random() > 0.9) {
        document.title = CONFIG.titles[Math.floor(Math.random() * CONFIG.titles.length)];
    } else {
        document.title = "KETTLE_SYS";
    }
}

function triggerBSOD() {
    const el = document.getElementById('reality-failure');
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 150);
}

// --- THE END (ACT IV) ---
function triggerTheEnd() {
    STATE.act = 4;
    audio.stopAll();
    cancelAnimationFrame(loopId);
    
    // VISUAL BURN OUT
    const canvasWrap = document.querySelector('.canvas-container');
    canvasWrap.style.transition = 'all 4s ease-in';
    canvasWrap.style.filter = 'brightness(0) contrast(2)';
    canvasWrap.style.transform = 'scale(0.01)';
    
    document.getElementById('log-feed').innerText = ">> CRITICAL FAILURE.";
    btn.style.display = 'none';

    setTimeout(() => {
        document.body.innerHTML = '';
        document.body.style.background = '#000';
        document.body.style.cursor = 'none';
        
        const term = document.createElement('div');
        term.style.color = '#ff0000';
        term.style.fontFamily = 'monospace';
        term.style.padding = '50px';
        term.style.fontSize = '2rem';
        term.style.textAlign = 'center';
        document.body.appendChild(term);

        const lines = [
            "SYSTEM HALTED.",
            `CLICKS WASTED: ${STATE.clicks}`,
            "YOU STARED INTO THE ABYSS.",
            "THE ABYSS BLINKED.",
            "GOODBYE, CARETAKER."
        ];

        let i = 0;
        const int = setInterval(() => {
            if(i < lines.length) {
                term.innerHTML += `<p>${lines[i]}</p>`;
                i++;
            } else {
                clearInterval(int);
                downloadProfile(); // Physical evidence
            }
        }, 2000);
    }, 4000);
}

function downloadProfile() {
    const content = `
KETTLE_SYS AUTOPSY REPORT
-------------------------
SUBJECT STATUS: TERMINATED
TOTAL CYCLES: ${STATE.session}
FINAL DIAGNOSIS: ${STATE.profile}
WEBCAM ACCESS: ${STATE.webcamActive ? "GRANTED (IMAGE STORED)" : "DENIED (SHADOW GENERATED)"}

You tried to control the boil.
The water always wins.

(Do not delete this file. We will know.)
    `;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'AUTOPSY_REPORT.txt';
    a.click();
                                             }
        
