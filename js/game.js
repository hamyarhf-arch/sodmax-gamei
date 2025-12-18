// داده‌های بازی
const gameData = {
    sodBalance: 0,
    usdtBalance: 0,
    todayEarnings: 0,
    totalMined: 0,
    miningPower: 10,
    userLevel: 1,
    activePlan: null,
    usdtProgress: 0,
    autoMining: false,
    transactions: [],
    boostActive: false,
    boostEndTime: 0,
    lastClaimTime: null
};

// پلن‌ها
const plans = [
    {
        id: 1,
        name: "استارتر",
        price: 0,
        multiplier: 1,
        autoSpeed: 0,
        usdtBonus: 0,
        features: [
            "قدرت استخراج ۱x",
            "بدون استخراج خودکار",
            "پاداش استاندارد USDT",
            "پشتیبانی معمولی",
            "حداکثر ۱۰۰ کلیک/ساعت"
        ],
        popular: false
    },
    {
        id: 2,
        name: "پرو",
        price: 49,
        multiplier: 3,
        autoSpeed: 50,
        usdtBonus: 25,
        features: [
            "قدرت استخراج ۳x",
            "استخراج خودکار ۵۰ SOD/ث",
            "پاداش +۲۵٪ USDT",
            "پشتیبانی ویژه",
            "حداکثر ۵۰۰ کلیک/ساعت",
            "هدیه هفتگی SOD"
        ],
        popular: true
    },
    {
        id: 3,
        name: "پلاتینیوم",
        price: 199,
        multiplier: 8,
        autoSpeed: 200,
        usdtBonus: 75,
        features: [
            "قدرت استخراج ۸x",
            "استخراج خودکار ۲۰۰ SOD/ث",
            "پاداش +۷۵٪ USDT",
            "پشتیبانی VIP",
            "کلیک نامحدود",
            "هدیه روزانه SOD",
            "دسترسی زودهنگام به ویژگی‌ها"
        ],
        popular: false
    },
    {
        id: 4,
        name: "الماس",
        price: 499,
        multiplier: 15,
        autoSpeed: 500,
        usdtBonus: 150,
        features: [
            "قدرت استخراج ۱۵x",
            "استخراج خودکار ۵۰۰ SOD/ث",
            "پاداش +۱۵۰٪ USDT",
            "مدیر اختصاصی",
            "دریافت روزانه USDT",
            "مشارکت در سود شبکه",
            "دسترسی به API پیشرفته"
        ],
        popular: false
    }
];

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

// ذخیره بازی محلی
function saveGame() {
    try {
        localStorage.setItem('sodmaxProData', JSON.stringify(gameData));
        localStorage.setItem('sodmaxLastSave', Date.now());
    } catch (e) {
        console.warn('ذخیره محلی با خطا مواجه شد:', e);
    }
    
    // ذخیره در دیتابیس
    if (window.currentUser) {
        saveGameToDatabase();
    }
}

// بارگذاری بازی محلی
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

// نمایش پلن‌ها
function showPlans() {
    document.getElementById('plansSection').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
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

// راه‌اندازی
async function init() {
    // اول احراز هویت
    const isAuthenticated = await handleAuth();
    
    if (isAuthenticated) {
        loadGame();
        renderPlans();
        updateUI();
        setupEventListeners();
        startAutoMining();
        simulateLiveData();
        updateNetworkStats();
        
        showNotification("🌟 به SODmAX Pro خوش آمدید!", "سیستم استخراج هوشمند شما آماده است.");
    }
}

// رندر پلن‌ها
function renderPlans() {
    const grid = document.getElementById('plansGrid');
    grid.innerHTML = '';
    
    plans.forEach(plan => {
        const isActive = gameData.activePlan && gameData.activePlan.id === plan.id;
        const card = document.createElement('div');
        card.className = `plan-card ${plan.popular ? 'featured' : ''}`;
        card.innerHTML = `
            ${plan.popular ? `<div class="plan-badge">پیشنهاد ویژه</div>` : ''}
            <div class="plan-header">
                <h3 class="plan-name">${plan.name}</h3>
                <div class="plan-price">
                    ${plan.price === 0 ? 'رایگان' : `$${plan.price}`}
                    ${plan.price > 0 ? '<span>/ ماه</span>' : ''}
                </div>
            </div>
            <ul class="plan-features">
                ${plan.features.map(feature => `<li><i class="fas fa-check"></i> ${feature}</li>`).join('')}
            </ul>
            <button class="btn ${isActive ? 'btn-outline' : 'btn-primary'}" 
                    onclick="selectPlan(${plan.id})"
                    ${isActive ? 'disabled' : ''}>
                ${isActive ? '✅ پلن فعال' : (plan.price === 0 ? 'انتخاب رایگان' : `ارتقاء به ${plan.name}`)}
            </button>
        `;
        grid.appendChild(card);
    });
}

// انتخاب پلن
async function selectPlan(planId) {
    const plan = plans.find(p => p.id === planId);
    
    if (plan.price > 0) {
        showConfirmationModal(
            `ارتقاء به پلن ${plan.name}`,
            `آیا مایل به خرید پلن ${plan.name} به مبلغ $${plan.price} هستید؟`,
            async () => {
                if (window.currentUser) {
                    await activatePlan(plan);
                    showNotification("🎉 پلن فعال شد!", `پلن ${plan.name} با موفقیت فعال گردید. قدرت استخراج شما افزایش یافت.`);
                } else {
                    showNotification("⚠️ ابتدا وارد شوید", "برای خرید پلن باید وارد حساب کاربری خود شوید.");
                    showLoginModal();
                }
            }
        );
    } else {
        await activatePlan(plan);
        showNotification("✅ پلن رایگان", "پلن استارتر با موفقیت فعال شد.");
    }
}

async function activatePlan(plan) {
    gameData.activePlan = plan;
    gameData.miningPower = plan.multiplier * 10 * gameData.userLevel;
    
    if (plan.id > 1 && window.currentUser) {
        addTransaction(`فعال‌سازی پلن ${plan.name}`, -plan.price, 'usdt');
        
        // ذخیره در دیتابیس
        if (window.savePlanPurchase) {
            await savePlanPurchase(plan);
        }
    }
    
    updateUI();
    renderPlans();
    saveGame();
}

// کلیک برای استخراج
document.getElementById('minerCore').addEventListener('click', async () => {
    if (!window.currentUser) {
        showNotification("⚠️ ابتدا وارد شوید", "برای استخراج باید وارد حساب کاربری خود شوید.");
        showLoginModal();
        return;
    }
    
    let earned = gameData.miningPower;
    
    // اعمال بوست
    if (gameData.boostActive) {
        earned *= 3;
    }
    
    gameData.sodBalance += earned;
    gameData.todayEarnings += earned;
    gameData.totalMined += earned;
    gameData.usdtProgress += earned;
    
    // انیمیشن لمسی
    const core = document.getElementById('minerCore');
    core.style.transform = 'scale(0.95)';
    setTimeout(() => {
        core.style.transform = 'scale(1)';
    }, 150);
    
    // افکت ساده
    createMiningEffect(earned);
    
    // بررسی پاداش USDT
    await checkUSDT();
    
    // آپدیت
    updateUI();
    saveGame();
    addTransaction('استخراج دستی', earned, 'sod');
    
    // ثبت فعالیت در دیتابیس
    if (window.currentUser && window.supabaseClient) {
        try {
            await supabaseClient
                .from('user_activity')
                .insert([
                    {
                        user_id: window.currentUser.id,
                        activity_type: 'click',
                        details: { 
                            earned: earned,
                            mining_power: gameData.miningPower,
                            time: new Date().toISOString() 
                        }
                    }
                ]);
        } catch (error) {
            console.error('خطا در ثبت فعالیت:', error);
        }
    }
});

// استخراج خودکار
function startAutoMining() {
    setInterval(async () => {
        if (gameData.activePlan && gameData.activePlan.autoSpeed > 0 && gameData.autoMining && window.currentUser) {
            let mined = gameData.activePlan.autoSpeed * gameData.miningPower;
            
            // اعمال بوست
            if (gameData.boostActive) {
                mined *= 3;
            }
            
            gameData.sodBalance += mined;
            gameData.todayEarnings += mined;
            gameData.totalMined += mined;
            gameData.usdtProgress += mined;
            
            // آپدیت ویجت
            updateFloatingWidget(mined);
            
            await checkUSDT();
            updateUI();
            saveGame();
        }
        
        // بررسی پایان بوست
        if (gameData.boostActive && Date.now() > gameData.boostEndTime) {
            gameData.boostActive = false;
            showNotification("⚡ پایان بوست", "زمان افزایش قدرت استخراج به پایان رسید.");
            document.getElementById('autoMineBtn').innerHTML = '<i class="fas fa-robot"></i> استخراج خودکار';
            document.getElementById('autoMineBtn').style.background = '';
        }
    }, 1000);
}

// افزایش قدرت
async function boostMining() {
    if (!window.currentUser) {
        showNotification("⚠️ ابتدا وارد شوید", "برای استفاده از افزایش قدرت باید وارد حساب کاربری خود شوید.");
        showLoginModal();
        return;
    }
    
    if (gameData.sodBalance >= 5000) {
        gameData.sodBalance -= 5000;
        gameData.boostActive = true;
        gameData.boostEndTime = Date.now() + (30 * 60 * 1000); // 30 دقیقه
        
        showNotification("⚡ افزایش قدرت!", "قدرت استخراج شما برای ۳۰ دقیقه ۳ برابر شد!");
        addTransaction('خرید افزایش قدرت', -5000, 'sod');
        updateUI();
        saveGame();
    } else {
        showNotification("⚠️ موجودی کافی نیست", "برای افزایش قدرت به ۵۰۰۰ SOD نیاز دارید.");
    }
}

// بررسی پاداش USDT
async function checkUSDT() {
    const threshold = 10000000; // 10 میلیون
    if (gameData.usdtProgress >= threshold) {
        let usdtEarned = 1;
        
        // اعمال بونوس پلن
        if (gameData.activePlan) {
            usdtEarned *= (1 + gameData.activePlan.usdtBonus / 100);
        }
        
        // اعمال بونوس سطح
        usdtEarned *= (1 + (gameData.userLevel - 1) * 0.1);
        
        gameData.usdtBalance += usdtEarned;
        gameData.usdtProgress -= threshold;
        
        // انیمیشن ویژه
        createUSDTEffect(usdtEarned);
        
        showNotification("🎉 پاداش USDT!", `تبریک! ${usdtEarned.toFixed(2)} USDT دریافت کردید.`);
        addTransaction('دریافت پاداش USDT', usdtEarned, 'usdt');
        
        // ذخیره زمان آخرین دریافت
        gameData.lastClaimTime = new Date().toISOString();
        document.getElementById('lastClaim').textContent = new Date().toLocaleTimeString('fa-IR');
        
        // شانس ارتقاء سطح
        if (Math.random() > 0.85) {
            gameData.userLevel++;
            gameData.miningPower = (gameData.activePlan?.multiplier || 1) * 10 * gameData.userLevel;
            showNotification("⭐ ارتقاء سطح!", `سطح شما به ${gameData.userLevel} ارتقاء یافت. درآمد +۱۰٪`);
        }
    }
}

// دریافت USDT
document.getElementById('claimUSDTBtn').addEventListener('click', async () => {
    if (!window.currentUser) {
        showNotification("⚠️ ابتدا وارد شوید", "برای دریافت پاداش باید وارد حساب کاربری خود شوید.");
        showLoginModal();
        return;
    }
    
    if (gameData.usdtBalance >= 0.1) {
        showConfirmationModal(
            "دریافت پاداش USDT",
            `آیا مایل به دریافت ${gameData.usdtBalance.toFixed(2)} USDT هستید؟`,
            async () => {
                if (window.walletManager) {
                    const success = await window.walletManager.withdraw(gameData.usdtBalance, 'usdt');
                    if (success) {
                        showNotification("✅ واریز موفق", `${gameData.usdtBalance.toFixed(2)} USDT به کیف پول شما واریز شد.`);
                        addTransaction('واریز USDT', -gameData.usdtBalance, 'usdt');
                        gameData.usdtBalance = 0;
                        updateUI();
                        saveGame();
                    }
                } else {
                    showNotification("✅ واریز موفق", `${gameData.usdtBalance.toFixed(2)} USDT به کیف پول شما واریز شد.`);
                    addTransaction('واریز USDT', -gameData.usdtBalance, 'usdt');
                    gameData.usdtBalance = 0;
                    updateUI();
                    saveGame();
                }
            }
        );
    } else {
        showNotification("💰 ادامه استخراج", "برای دریافت پاداش حداقل به ۰.۱ USDT نیاز دارید.");
    }
});

// اتصال کیف پول
document.getElementById('connectWalletBtn').addEventListener('click', async () => {
    if (!window.currentUser) {
        showLoginModal();
        return;
    }
    
    if (window.connectWallet) {
        await connectWallet();
    } else {
        showUserPanel();
    }
});

// استخراج خودکار
document.getElementById('autoMineBtn').addEventListener('click', () => {
    if (!window.currentUser) {
        showNotification("⚠️ ابتدا وارد شوید", "برای استفاده از استخراج خودکار باید وارد حساب کاربری خود شوید.");
        showLoginModal();
        return;
    }
    
    if (!gameData.activePlan || gameData.activePlan.autoSpeed === 0) {
        showNotification("⚠️ پلن مورد نیاز", "برای استفاده از استخراج خودکار، پلن PRO یا بالاتر تهیه کنید.");
        showPlans();
        return;
    }
    
    gameData.autoMining = !gameData.autoMining;
    const btn = document.getElementById('autoMineBtn');
    const widget = document.getElementById('floatingWidget');
    
    if (gameData.autoMining) {
        btn.innerHTML = '<i class="fas fa-pause"></i> توقف خودکار';
        btn.style.background = 'var(--error)';
        widget.style.transform = 'translateY(-5px)';
        showNotification("🤖 استخراج خودکار", "سیستم استخراج خودکار فعال شد.");
        addTransaction('فعال‌سازی استخراج خودکار', 0, 'system');
    } else {
        btn.innerHTML = '<i class="fas fa-robot"></i> استخراج خودکار';
        btn.style.background = '';
        widget.style.transform = 'translateY(0)';
        showNotification("⏸️ توقف خودکار", "استخراج خودکار متوقف شد.");
        addTransaction('توقف استخراج خودکار', 0, 'system');
    }
});

// افزایش قدرت
document.getElementById('boostMiningBtn').addEventListener('click', boostMining);

// نمایش پلن‌ها
document.getElementById('showPlansBtn').addEventListener('click', showPlans);

// بستن نوتیفیکیشن
document.getElementById('closeNotificationBtn').addEventListener('click', hideNotification);

// آپدیت UI
function updateUI() {
    // موجودی‌ها
    document.getElementById('sodBalance').innerHTML = `${formatNumber(gameData.sodBalance)} <span>SOD</span>`;
    document.getElementById('usdtBalance').innerHTML = `${gameData.usdtBalance.toFixed(2)} <span>USDT</span>`;
    
    // آمار
    document.getElementById('todayEarnings').textContent = `${formatNumber(gameData.todayEarnings)} SOD`;
    document.getElementById('miningPower').textContent = `${gameData.miningPower}x`;
    document.getElementById('userLevel').textContent = gameData.userLevel;
    document.getElementById('clickReward').textContent = `+${gameData.miningPower} SOD`;
    
    // نمایش آخرین دریافت
    if (gameData.lastClaimTime) {
        document.getElementById('lastClaim').textContent = new Date(gameData.lastClaimTime).toLocaleTimeString('fa-IR');
    }
    
    // پاداش USDT
    document.getElementById('availableUSDT').textContent = `${gameData.usdtBalance.toFixed(2)} USDT`;
    const progressPercent = Math.min((gameData.usdtProgress / 10000000) * 100, 100);
    document.getElementById('progressFill').style.width = `${progressPercent}%`;
    document.getElementById('progressText').textContent = 
        `${formatNumber(gameData.usdtProgress)} / ۱۰,۰۰۰,۰۰۰ SOD`;
    
    // رندر تراکنش‌ها
    renderTransactions();
    
    // آپدیت ویجت
    updateFloatingWidget();
}

// آپدیت ویجت
function updateFloatingWidget(recentMined = 0) {
    const widget = document.getElementById('floatingWidget');
    const pulse = widget.querySelector('.pulse');
    const text = document.getElementById('widgetText');
    
    if (!widget || !pulse || !text) return;
    
    if (gameData.autoMining) {
        text.textContent = recentMined > 0 ? 
            `استخراج خودکار: +${formatNumber(recentMined)} SOD` : 
            "استخراج خودکار فعال";
        pulse.style.background = 'var(--success)';
    } else if (gameData.boostActive) {
        const timeLeft = Math.max(0, Math.ceil((gameData.boostEndTime - Date.now()) / 1000 / 60));
        text.textContent = `افزایش قدرت فعال (${timeLeft}دقیقه باقی‌مانده)`;
        pulse.style.background = 'var(--warning)';
    } else {
        text.textContent = window.currentUser ? "سیستم استخراج آماده" : "برای شروع وارد شوید";
        pulse.style.background = window.currentUser ? 'var(--primary)' : 'var(--text-secondary)';
    }
}

// رندر تراکنش‌ها
function renderTransactions() {
    const list = document.getElementById('transactionsList');
    if (!list) return;
    
    list.innerHTML = '';
    
    gameData.transactions.slice(0, 6).forEach(tx => {
        const row = document.createElement('div');
        row.className = 'transaction-row';
        
        let icon = '⛏️';
        let type = 'استخراج';
        let amountClass = 'sod';
        let amount = `+${formatNumber(tx.amount)} SOD`;
        let typeClass = 'استخراج';
        
        if (tx.type === 'usdt') {
            icon = tx.amount > 0 ? '💰' : '💳';
            type = tx.amount > 0 ? 'پاداش USDT' : 'خرید پلن';
            amountClass = 'usdt';
            amount = `${tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)} USDT`;
            typeClass = tx.amount > 0 ? 'پاداش' : 'خرید';
        } else if (tx.type === 'system') {
            icon = '⚙️';
            type = tx.description;
            amountClass = '';
            amount = '—';
            typeClass = 'سیستم';
        }
        
        row.innerHTML = `
            <div class="transaction-type">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-details">
                    <div>${tx.description}</div>
                    <div>${tx.time}</div>
                </div>
            </div>
            <div class="transaction-amount ${amountClass}">${amount}</div>
            <div>${typeClass}</div>
            <div>${tx.time}</div>
        `;
        list.appendChild(row);
    });
}

// افزودن تراکنش
function addTransaction(description, amount, type = 'sod') {
    const now = new Date();
    const time = now.toLocaleTimeString('fa-IR');
    const date = now.toLocaleDateString('fa-IR');
    
    const transaction = {
        description,
        amount,
        type,
        time: `${date} ${time}`
    };
    
    gameData.transactions.unshift(transaction);
    
    if (gameData.transactions.length > 50) {
        gameData.transactions.pop();
    }
    
    // ذخیره در دیتابیس
    if (window.currentUser && window.saveTransactionToDB) {
        saveTransactionToDB(description, amount, type);
    }
    
    // رندر مجدد
    renderTransactions();
}

// شبیه‌سازی داده زنده شبکه
function updateNetworkStats() {
    setInterval(() => {
        const networkMined = document.getElementById('totalNetworkMined');
        if (networkMined) {
            const base = 24500000;
            const change = Math.floor(Math.random() * 100000) + 50000;
            const newValue = base + change;
            networkMined.textContent = formatNumber(newValue) + ' SOD';
        }
    }, 10000);
}

// شبیه‌سازی داده زنده
function simulateLiveData() {
    setInterval(() => {
        // آپدیت درصدها
        const changes = document.querySelectorAll('.stat-change');
        if (changes.length >= 2) {
            changes[0].innerHTML = `<i class="fas fa-arrow-up"></i> +${(Math.random() * 5 + 15).toFixed(1)}٪ از دیروز`;
            changes[3].innerHTML = `<i class="fas fa-arrow-up"></i> +${(Math.random() * 0.8 + 0.4).toFixed(1)}٪ از ساعت قبل`;
        }
    }, 8000);
}

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

// راه‌اندازی
window.addEventListener('DOMContentLoaded', init);

// نمایش نسخه
console.log('📱 SODmAX Pro v3.0 | سیستم کامل با احراز هویت');
console.log('👨‍💻 توسعه‌یافته توسط تیم SODmAX');
console.log('🔗 متصل به Supabase: مدیریت کاربران و دیتابیس');
