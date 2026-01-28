const STATE = {
    session: 1, isOn: false, temp: 20, clicks: 0,
    angle: 0, act: 1, webcamActive: false, lastAction: Date.now()
};

const canvas = document.getElementById('main-frame');
const ctx = canvas.getContext('2d');
const video = document.createElement('video');
video.autoplay = true;

// --- ЦВЕТОВАЯ ДЕГРАДАЦИЯ ---
function updateTheme() {
    let color = '#20c20e'; // Зеленый
    let status = "STABLE";
    
    if (STATE.session > 4) { color = '#d4ce18'; status = "ANXIOUS"; } // Желтый
    if (STATE.session > 9) { color = '#ff3333'; status = "CRITICAL"; } // Красный
    
    document.documentElement.style.setProperty('--primary', color);
    document.getElementById('user-profile').innerText = status;
    document.getElementById('user-profile').style.color = color;
}

// --- СООБЩЕНИЯ (ТОТ САМЫЙ ГОЛОС) ---
const MESSAGES = [
    "I CAN WAIT FOREVER.",
    "WHY ARE YOU WAITING?",
    "THE WATER GROWS IMPATIENT.",
    "DO NOT LOOK BEHIND YOU.",
    "I SEE YOU IN THE REFLECTION.",
    "IT'S GETTING HOT, ISN'T IT?",
    "SOMETHING IS WRONG WITH THE REALITY."
];

function log(txt) {
    const el = document.getElementById('message-log');
    el.innerText = ">> " + txt;
}

// --- ВЕБ-КАМЕРА ---
async function initWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        STATE.webcamActive = true;
        log("VISUAL LINK ESTABLISHED.");
    } catch(e) {
        log("CAMERA ACCESS DENIED. I WILL USE THE SHADOW.");
    }
}

// --- РЕНДЕР ЧАЙНИКА ---
function drawKettle() {
    ctx.fillStyle = '#050505'; ctx.fillRect(0,0,500,500);
    
    const cx = 250, cy = 250;
    const shake = STATE.isOn ? (Math.random()-0.5)*(STATE.temp/25) : 0;
    
    ctx.save();
    ctx.translate(cx + shake, cy + shake);

    // 1. КОРПУС (Градиент)
    const bodyGrad = ctx.createLinearGradient(-80, 0, 80, 0);
    bodyGrad.addColorStop(0, '#0a0a0a');
    bodyGrad.addColorStop(0.5, '#252525');
    bodyGrad.addColorStop(1, '#000');
    
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-65, -100); ctx.lineTo(65, -100);
    ctx.quadraticCurveTo(90, 0, 75, 110);
    ctx.lineTo(-75, 110);
    ctx.quadraticCurveTo(-90, 0, -65, -100);
    ctx.fill();

    // 2. ОТРАЖЕНИЕ В КОРПУСЕ (Твоя камера)
    ctx.save();
    ctx.clip(); // Чтобы камера не вылезала за края чайника
    if (STATE.webcamActive) {
        ctx.globalAlpha = 0.15 + (STATE.session * 0.02);
        ctx.filter = 'grayscale(1) contrast(1.8) blur(1px)';
        ctx.drawImage(video, -150, -150, 300, 300);
    } else if (STATE.session > 5) {
        // Если камеры нет - рисуем силуэт
        ctx.fillStyle = '#000'; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(0, -20, 40, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // 3. НОСИК (Поворачивается в сессии 10+)
    const sx = 70 - (STATE.angle * 70);
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(sx, -60);
    ctx.lineTo(sx + 50 - (STATE.angle * 30), -80);
    ctx.lineTo(sx + 50 - (STATE.angle * 30), -40);
    ctx.lineTo(sx, 10);
    ctx.fill();

    if (STATE.angle > 0.8) { // ГЛАЗ В НОСИКЕ
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(sx+25, -60, 12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary');
        ctx.fillRect(sx+23, -62, 4, 4); // Зрачок цвета интерфейса
    }

    // 4. ИНДИКАТОР
    ctx.fillStyle = STATE.isOn ? (STATE.session > 9 ? '#ff0000' : '#ff5500') : '#200';
    ctx.beginPath(); ctx.arc(0, 80, 6, 0, Math.PI*2); ctx.fill();

    ctx.restore();
}

// --- ЛОГИКА ---
function loop() {
    if (STATE.act === 4) return;
    drawKettle();

    if (STATE.isOn) {
        STATE.temp += 0.25;
        if (STATE.temp >= 100) {
            STATE.isOn = false; STATE.session++; STATE.temp = 20;
            updateTheme();
            log(`SESSION ${STATE.session} RECORDED.`);
            document.getElementById('sess-val').innerText = STATE.session.toString().padStart(2, '0');
            document.getElementById('power-node').innerText = "[ INITIATE ]";
            if (STATE.session === 8) initWebcam();
        }
    }

    // Рандомные фразы при бездействии
    if (Date.now() - STATE.lastAction > 10000 && Math.random() > 0.99) {
        log(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
        STATE.lastAction = Date.now();
    }

    if (STATE.session > 10) STATE.angle = Math.min(STATE.angle + 0.0004, 1);

    requestAnimationFrame(loop);
}

document.getElementById('power-node').onclick = () => {
    STATE.clicks++;
    STATE.lastAction = Date.now();
    
    // ПРОВЕРКА ФИНАЛА (150 КЛИКОВ)
    if (STATE.clicks >= 150) return triggerFinal();

    STATE.isOn = !STATE.isOn;
    document.getElementById('power-node').innerText = STATE.isOn ? "[ ABORT ]" : "[ INITIATE ]";
    if (STATE.isOn) log("ELEMENT ACTIVE. DO NOT LEAVE.");
};

function triggerFinal() {
    STATE.act = 4;
    document.body.innerHTML = `
        <div style="color:red; font-family:monospace; text-align:center; padding:50px; background:#000; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            <h1 style="font-size:5rem; margin:0;">BREACH</h1>
            <p style="font-size:1.5rem;">THE VESSEL IS FULL. YOU ARE THE WATER NOW.</p>
            <p>TOTAL CLICKS: ${STATE.clicks}</p>
            <p>RESTARTING REALITY...</p>
        </div>
    `;
    setTimeout(() => location.reload(), 10000);
}

// Boot sequence
let bIdx = 0;
const bt = ">> INITIALIZING CORE...\n>> CONNECTING SENSORS...\n>> SUBJECT READY.";
function boot() {
    if (bIdx < bt.length) {
        document.getElementById('boot-text').textContent += bt[bIdx++];
        setTimeout(boot, 40);
    } else {
        document.getElementById('boot-sequence').onclick = () => {
            document.getElementById('boot-sequence').classList.add('hidden');
            document.getElementById('containment-unit').classList.remove('hidden');
            loop();
        };
    }
}
boot();
