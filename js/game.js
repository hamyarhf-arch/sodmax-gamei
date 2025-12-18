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
    boostEndTime: 0
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

// راه‌اندازی
function init() {
    loadGame();
    renderPlans();
    updateUI();
    setupEventListeners();
    startAutoMining();
    simulateLiveData();
    updateNetworkStats();
    
    showNotification("🌟 به SODmAX Pro خوش آمدید!", "سیستم استخراج هوشمند شما آماده بهره‌برداری است.");
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
function selectPlan(planId) {
    const plan = plans.find(p => p.id === planId);
    
    if (plan.price > 0) {
        showConfirmationModal(
            `ارتقاء به پلن ${plan.name}`,
            `آیا مایل به خرید پلن ${plan.name} به مبلغ $${plan.price} هستید؟`,
            () => {
                activatePlan(plan);
                showNotification("🎉 پلن فعال شد!", `پلن ${plan.name} با موفقیت فعال گردید. قدرت استخراج شما افزایش یافت.`);
            }
        );
    } else {
        activatePlan(plan);
        showNotification("✅ پلن رایگان", "پلن استارتر با موفقیت فعال شد.");
    }
}

function activatePlan(plan) {
    gameData.activePlan = plan;
    gameData.miningPower = plan.multiplier * 10 * gameData.userLevel;
    
    if (plan.id > 1) {
        addTransaction(`فعال‌سازی پلن ${plan.name}`, -plan.price, 'usdt');
    }
    
    updateUI();
    renderPlans();
    saveGame();
}

// کلیک برای استخراج
document.getElementById('minerCore').addEventListener('click', () => {
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
    checkUSDT();
    
    // آپدیت
    updateUI();
    saveGame();
    addTransaction('استخراج دستی', earned, 'sod');
});

// استخراج خودکار
function startAutoMining() {
    setInterval(() => {
        if (gameData.activePlan && gameData.activePlan.autoSpeed > 0 && gameData.autoMining) {
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
            
            checkUSDT();
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
function boostMining() {
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
function checkUSDT() {
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
        
        // شانس ارتقاء سطح
        if (Math.random() > 0.85) {
            gameData.userLevel++;
            gameData.miningPower = (gameData.activePlan?.multiplier || 1) * 10 * gameData.userLevel;
            showNotification("⭐ ارتقاء سطح!", `سطح شما به ${gameData.userLevel} ارتقاء یافت. درآمد +۱۰٪`);
        }
    }
}

// دریافت USDT
document.getElementById('claimUSDTBtn').addEventListener('click', () => {
    if (gameData.usdtBalance >= 0.1) {
        showConfirmationModal(
            "دریافت پاداش USDT",
            `آیا مایل به دریافت ${gameData.usdtBalance.toFixed(2)} USDT هستید؟`,
            () => {
                showNotification("✅ واریز موفق", `${gameData.usdtBalance.toFixed(2)} USDT به کیف پول شما واریز شد.`);
                addTransaction('واریز USDT', -gameData.usdtBalance, 'usdt');
                gameData.usdtBalance = 0;
                updateUI();
                saveGame();
            }
        );
    } else {
        showNotification("💰 ادامه استخراج", "برای دریافت پاداش حداقل به ۰.۱ USDT نیاز دارید.");
    }
});

// اتصال کیف پول
document.getElementById('connectWalletBtn').addEventListener('click', () => {
    const wallets = ['MetaMask', 'Trust Wallet', 'Phantom', 'Coinbase Wallet'];
    const selected = wallets[Math.floor(Math.random() * wallets.length)];
    const address = `0x${Array.from({length: 40}, () => 
        Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    showNotification("🔗 کیف پول متصل شد", `${selected} - ${address.substring(0, 8)}...${address.substring(38)}`);
    addTransaction('اتصال کیف پول', 0, 'system');
});

// استخراج خودکار
document.getElementById('autoMineBtn').addEventListener('click', () => {
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
    
    if (gameData.autoMining) {
        text.textContent = recentMined > 0 ? 
            `استخراج خودکار: +${formatNumber(recentMined)} SOD` : 
            "استخراج
