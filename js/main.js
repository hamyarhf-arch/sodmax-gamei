// اضافه کردن انیمیشن‌های CSS
if (!document.getElementById('mobileAnimations')) {
    const style = document.createElement('style');
    style.id = 'mobileAnimations';
    style.textContent = `
        @keyframes miningEffect {
            0% {
                opacity: 1;
                transform: translate(0, 0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(0, -80px) scale(1.2);
            }
        }
        @keyframes usdtEffect {
            0% {
                opacity: 1;
                transform: translate(0, 0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(0, -150px) scale(1.5);
            }
        }
    `;
    document.head.appendChild(style);
}

// فرمت عدد
function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return Math.floor(num).toLocaleString('fa-IR');
}

// ایجاد افکت استخراج
function createMiningEffect(amount) {
    const effect = document.createElement('div');
    effect.style.cssText = `
        position: fixed;
        color: var(--primary-light);
        font-weight: 900;
        font-size: 16px;
        pointer-events: none;
        z-index: 10000;
        text-shadow: 0 0 10px var(--primary);
        animation: miningEffect 1s ease-out forwards;
    `;
    
    const core = document.getElementById('minerCore');
    const rect = core.getBoundingClientRect();
    effect.style.left = `${rect.left + rect.width / 2}px`;
    effect.style.top = `${rect.top + rect.height / 2}px`;
    effect.textContent = `+${formatNumber(amount)}`;
    
    document.body.appendChild(effect);
    
    setTimeout(() => effect.remove(), 1000);
}

// ایجاد افکت USDT
function createUSDTEffect(amount) {
    for (let i = 0; i < 4; i++) {
        const effect = document.createElement('div');
        effect.style.cssText = `
            position: fixed;
            color: var(--usdt);
            font-size: 20px;
            pointer-events: none;
            z-index: 10000;
            opacity: 0;
            animation: usdtEffect 1.2s ease-out ${i * 0.2}s forwards;
        `;
        
        const angle = (i / 4) * Math.PI * 2;
        const distance = 100;
        const core = document.getElementById('minerCore');
        const rect = core.getBoundingClientRect();
        
        effect.style.left = `${rect.left + rect.width / 2 + Math.cos(angle) * distance}px`;
        effect.style.top = `${rect.top + rect.height / 2 + Math.sin(angle) * distance}px`;
        effect.textContent = '💰';
        
        document.body.appendChild(effect);
        
        setTimeout(() => effect.remove(), 1500);
    }
}

// نوتیفیکیشن
function showNotification(title, message) {
    const notification = document.getElementById('notification');
    document.getElementById('notificationTitle').textContent = title;
    document.getElementById('notificationMessage').textContent = message;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        hideNotification();
    }, 4000);
}

function hideNotification() {
    document.getElementById('notification').classList.remove('show');
}

// مودال تایید موبایل
function showConfirmationModal(title, message, onConfirm) {
    if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
    }
}

// ذخیره بازی
function saveGame() {
    try {
        localStorage.setItem('sodmaxProData', JSON.stringify(gameData));
        localStorage.setItem('sodmaxLastSave', Date.now());
    } catch (e) {
        console.warn('ذخیره بازی با خطا مواجه شد:', e);
    }
}

// بارگذاری بازی
function loadGame() {
    try {
        const saved = localStorage.getItem('sodmaxProData');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(gameData, data);
            
            // بازنشانی روزانه
            const today = new Date().toDateString();
            const lastPlayed = localStorage.getItem('sodmaxLastPlayed');
            
            if (lastPlayed !== today) {
                gameData.todayEarnings = 0;
                localStorage.setItem('sodmaxLastPlayed', today);
            }
        }
    } catch (e) {
        console.warn('بارگذاری بازی با خطا مواجه شد:', e);
    }
}

// رویدادها
function setupEventListeners() {
    window.addEventListener('beforeunload', saveGame);
    
    // ذخیره خودکار هر ۳۰ ثانیه
    setInterval(saveGame, 30000);
    
    // کلیک خارج از نوتیفیکیشن
    document.addEventListener('touchstart', (e) => {
        if (!e.target.closest('.notification')) {
            hideNotification();
        }
    });
    
    // جلوگیری از زوم در دبل‌تپ
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

// نمایش پلن‌ها
function showPlans() {
    document.getElementById('plansSection').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// نمایش نسخه
console.log('📱 SODmAX Pro v2.0 Mobile | بهینه‌شده برای موبایل');
console.log('👨‍💻 توسعه‌یافته توسط تیم SODmAX');
