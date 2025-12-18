// ==================== بخش ۱: داده‌های بازی ====================
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

// ==================== بخش ۲: توابع عمومی ====================
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

function showNotification(title, message) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    document.getElementById('notificationTitle').textContent = title;
    document.getElementById('notificationMessage').textContent = message;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) notification.classList.remove('show');
}

function showConfirmationModal(title, message, onConfirm) {
    if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
    }
}

// ==================== بخش ۳: توابع احراز هویت ====================
async function handleAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
            window.currentUser = session.user;
            await loadUserData(session.user.id);
            updateNavForLoggedInUser();
            return true;
        } else {
            // نمایش صفحه ورود به صورت اتوماتیک
            setTimeout(() => {
                showLoginModal();
            }, 500);
            return false;
        }
    } catch (error) {
        console.error('خطا در احراز هویت:', error);
        showNotification('⚠️ خطا در اتصال', 'لطفا دوباره تلاش کنید');
        return false;
    }
}

async function signUp(email, password, username) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username
                }
            }
        });

        if (error) throw error;

        if (data.user) {
            // ایجاد رکورد کاربر در جدول users
            const { error: dbError } = await supabase
                .from('users')
                .insert([
                    {
                        id: data.user.id,
                        email: email,
                        username: username,
                        created_at: new Date().toISOString()
                    }
                ]);

            if (dbError) throw dbError;

            // ایجاد رکورد داده بازی
            const { error: gameError } = await supabase
                .from('user_game_data')
                .insert([
                    {
                        user_id: data.user.id,
                        sod_balance: 0,
                        usdt_balance: 0,
                        mining_power: 10,
                        user_level: 1,
                        updated_at: new Date().toISOString()
                    }
                ]);

            if (gameError) throw gameError;

            window.currentUser = data.user;
            showNotification('🎉 ثبت‌نام موفق', 'حساب کاربری شما با موفقیت ایجاد شد!');
            closeAuthModal();
            updateNavForLoggedInUser();
            return true;
        }
    } catch (error) {
        console.error('خطا در ثبت‌نام:', error);
        showNotification('❌ خطا در ثبت‌نام', error.message);
        return false;
    }
}

async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (data.user) {
            window.currentUser = data.user;
            
            // آپدیت زمان آخرین ورود
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', window.currentUser.id);

            await loadUserData(window.currentUser.id);
            showNotification('👋 خوش آمدید', 'با موفقیت وارد شدید!');
            closeAuthModal();
            updateNavForLoggedInUser();
            return true;
        }
    } catch (error) {
        console.error('خطا در ورود:', error);
        showNotification('❌ خطا در ورود', 'ایمیل یا رمز عبور نادرست است');
        return false;
    }
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        window.currentUser = null;
        gameData.sodBalance = 0;
        gameData.usdtBalance = 0;
        gameData.todayEarnings = 0;
        updateUI();
        
        showNotification('👋 خدانگهدار', 'با موفقیت خارج شدید');
        updateNavForLoggedOutUser();
        
        setTimeout(() => {
            showLoginModal();
        }, 1000);
    } catch (error) {
        console.error('خطا در خروج:', error);
    }
}

async function loadUserData(userId) {
    try {
        // دریافت داده‌های بازی کاربر
        const { data: gameDataDB, error: gameError } = await supabase
            .from('user_game_data')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!gameError && gameDataDB) {
            gameData.sodBalance = gameDataDB.sod_balance || 0;
            gameData.usdtBalance = parseFloat(gameDataDB.usdt_balance) || 0;
            gameData.miningPower = gameDataDB.mining_power || 10;
            gameData.userLevel = gameDataDB.user_level || 1;
            gameData.totalMined = gameDataDB.total_mined || 0;
            gameData.todayEarnings = gameDataDB.today_earnings || 0;
            gameData.usdtProgress = gameDataDB.usdt_progress || 0;
            gameData.boostActive = gameDataDB.boost_active || false;
            gameData.boostEndTime = gameDataDB.boost_end_time ? new Date(gameDataDB.boost_end_time).getTime() : 0;
        }

        // دریافت پلن فعال کاربر
        const { data: activePlan, error: planError } = await supabase
            .from('user_plans')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (activePlan && !planError) {
            gameData.activePlan = {
                id: activePlan.plan_id,
                name: activePlan.plan_name,
                price: activePlan.price,
                multiplier: activePlan.multiplier,
                autoSpeed: activePlan.auto_speed,
                usdtBonus: activePlan.usdt_bonus
            };
        }

        // دریافت آخرین تراکنش‌ها
        await loadUserTransactions(userId);

        updateUI();

    } catch (error) {
        console.error('خطا در بارگذاری داده‌های کاربر:', error);
    }
}

async function saveGameToDatabase() {
    if (!window.currentUser) return;

    try {
        const { error } = await supabase
            .from('user_game_data')
            .upsert([
                {
                    user_id: window.currentUser.id,
                    sod_balance: gameData.sodBalance,
                    usdt_balance: gameData.usdtBalance,
                    mining_power: gameData.miningPower,
                    user_level: gameData.userLevel,
                    total_mined: gameData.totalMined,
                    today_earnings: gameData.todayEarnings,
                    usdt_progress: gameData.usdtProgress,
                    active_plan_id: gameData.activePlan?.id || null,
                    boost_active: gameData.boostActive,
                    boost_end_time: gameData.boostActive ? new Date(gameData.boostEndTime).toISOString() : null,
                    updated_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;
    } catch (error) {
        console.error('خطا در ذخیره داده‌های بازی:', error);
    }
}

async function saveTransactionToDB(description, amount, type) {
    if (!window.currentUser) return;

    try {
        const { error } = await supabase
            .from('transactions')
            .insert([
                {
                    user_id: window.currentUser.id,
                    description: description,
                    amount: Math.abs(amount),
                    type: type,
                    status: 'completed',
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;
    } catch (error) {
        console.error('خطا در ذخیره تراکنش:', error);
    }
}

async function loadUserTransactions(userId) {
    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!error && transactions) {
            gameData.transactions = transactions.map(tx => ({
                description: tx.description,
                amount: tx.amount,
                type: tx.type,
                time: new Date(tx.created_at).toLocaleString('fa-IR')
            }));
        }
    } catch (error) {
        console.error('خطا در بارگذاری تراکنش‌ها:', error);
    }
}

async function savePlanPurchase(plan) {
    if (!window.currentUser) return;

    try {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 ماه اعتبار

        const { error } = await supabase
            .from('user_plans')
            .insert([
                {
                    user_id: window.currentUser.id,
                    plan_id: plan.id,
                    plan_name: plan.name,
                    price: plan.price,
                    multiplier: plan.multiplier,
                    auto_speed: plan.autoSpeed,
                    usdt_bonus: plan.usdtBonus,
                    purchased_at: new Date().toISOString(),
                    expires_at: expiresAt.toISOString(),
                    is_active: true
                }
            ]);

        if (error) throw error;

        // غیرفعال کردن پلن‌های قبلی
        await supabase
            .from('user_plans')
            .update({ is_active: false })
            .eq('user_id', window.currentUser.id)
            .neq('plan_id', plan.id);

    } catch (error) {
        console.error('خطا در ذخیره خرید پلن:', error);
    }
}

// ==================== بخش ۴: مودال ورود/ثبت‌نام ====================
function showLoginModal() {
    // اگر مودال قبلاً نمایش داده شده، نمایش نده
    if (document.getElementById('authModal')) return;
    
    const modalHTML = `
        <div class="modal-overlay" id="authModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>ورود / ثبت‌نام</h3>
                    <button class="modal-close" onclick="closeAuthModal()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="auth-tabs">
                        <button class="auth-tab active" onclick="switchAuthTab('login')">ورود</button>
                        <button class="auth-tab" onclick="switchAuthTab('signup')">ثبت‌نام</button>
                    </div>
                    
                    <form id="loginForm" class="auth-form active">
                        <div class="form-group">
                            <label>ایمیل</label>
                            <input type="email" id="loginEmail" required placeholder="example@gmail.com">
                        </div>
                        
                        <div class="form-group">
                            <label>رمز عبور</label>
                            <input type="password" id="loginPassword" required placeholder="••••••••">
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-block">
                            <i class="fas fa-sign-in-alt"></i>
                            ورود به حساب
                        </button>
                    </form>
                    
                    <form id="signupForm" class="auth-form">
                        <div class="form-group">
                            <label>نام کاربری</label>
                            <input type="text" id="signupUsername" required placeholder="username">
                        </div>
                        
                        <div class="form-group">
                            <label>ایمیل</label>
                            <input type="email" id="signupEmail" required placeholder="example@gmail.com">
                        </div>
                        
                        <div class="form-group">
                            <label>رمز عبور</label>
                            <input type="password" id="signupPassword" required placeholder="••••••••">
                        </div>
                        
                        <div class="form-group">
                            <label>تکرار رمز عبور</label>
                            <input type="password" id="signupPasswordConfirm" required placeholder="••••••••">
                        </div>
                        
                        <button type="submit" class="btn btn-success btn-block">
                            <i class="fas fa-user-plus"></i>
                            ایجاد حساب کاربری
                        </button>
                    </form>
                    
                    <div class="auth-divider">
                        <span>یا</span>
                    </div>
                    
                    <button class="btn btn-outline btn-block" onclick="connectWallet()">
                        <i class="fas fa-wallet"></i>
                        ورود با کیف پول
                    </button>
                </div>
                
                <div class="modal-footer">
                    <p class="text-center">
                        با ورود یا ثبت‌نام، <a href="#">قوانین و شرایط</a> را می‌پذیرید.
                    </p>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.remove();
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    const tabBtn = document.querySelector(`.auth-tab[onclick*="${tab}"]`);
    const form = document.getElementById(`${tab}Form`);
    
    if (tabBtn) tabBtn.classList.add('active');
    if (form) form.classList.add('active');
}

// ==================== بخش ۵: آپدیت ناوبری ====================
function updateNavForLoggedInUser() {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.innerHTML = '<i class="fas fa-user"></i> پنل کاربری';
        connectBtn.onclick = showUserPanel;
    }
    
    updateFloatingWidget();
}

function updateNavForLoggedOutUser() {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.innerHTML = '<i class="fas fa-wallet"></i> ورود / ثبت‌نام';
        connectBtn.onclick = showLoginModal;
    }
    
    updateFloatingWidget();
}

// ==================== بخش ۶: منطق اصلی بازی ====================
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

function saveGame() {
    // ذخیره محلی
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

function showPlans() {
    document.getElementById('plansSection').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

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

async function init() {
    // اول Supabase رو چک کن
    if (!window.supabase) {
        console.error('❌ Supabase لود نشده است');
        showNotification('⚠️ خطا در اتصال', 'سیستم در حال راه‌اندازی است...');
        setTimeout(init, 1000);
        return;
    }
    
    // بعد احراز هویت
    const isAuthenticated = await handleAuth();
    
    // بازی رو بارگذاری کن (چه وارد شده باشه یا نه)
    loadGame();
    renderPlans();
    updateUI();
    setupEventListeners();
    startAutoMining();
    simulateLiveData();
    updateNetworkStats();
    
    // اگر وارد نشده، نوتیفیکیشن نمایش بده
    if (!isAuthenticated) {
        showNotification("👋 به SODmAX Pro خوش آمدید!", "برای شروع استخراج، وارد شوید یا ثبت‌نام کنید.");
    } else {
        showNotification("🌟 سیستم استخراج آماده!", "با کلیک روی هسته مرکزی شروع به استخراج کنید.");
    }
}

function renderPlans() {
    const grid = document.getElementById('plansGrid');
    if (!grid) return;
    
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

async function selectPlan(planId) {
    if (!window.currentUser) {
        showNotification("⚠️ ابتدا وارد شوید", "برای خرید پلن باید وارد حساب کاربری خود شوید.");
        showLoginModal();
        return;
    }
    
    const plan = plans.find(p => p.id === planId);
    
    if (plan.price > 0) {
        showConfirmationModal(
            `ارتقاء به پلن ${plan.name}`,
            `آیا مایل به خرید پلن ${plan.name} به مبلغ $${plan.price} هستید؟`,
            async () => {
                await activatePlan(plan);
                showNotification("🎉 پلن فعال شد!", `پلن ${plan.name} با موفقیت فعال گردید. قدرت استخراج شما افزایش یافت.`);
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
        await savePlanPurchase(plan);
    }
    
    updateUI();
    renderPlans();
    saveGame();
}

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
        
        // شانس ارتقاء سطح
        if (Math.random() > 0.85) {
            gameData.userLevel++;
            gameData.miningPower = (gameData.activePlan?.multiplier || 1) * 10 * gameData.userLevel;
            showNotification("⭐ ارتقاء سطح!", `سطح شما به ${gameData.userLevel} ارتقاء یافت. درآمد +۱۰٪`);
        }
    }
}

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

function updateUI() {
    // موجودی‌ها
    const sodBalanceEl = document.getElementById('sodBalance');
    const usdtBalanceEl = document.getElementById('usdtBalance');
    
    if (sodBalanceEl) {
        sodBalanceEl.innerHTML = `${formatNumber(gameData.sodBalance)} <span>SOD</span>`;
    }
    
    if (usdtBalanceEl) {
        usdtBalanceEl.innerHTML = `${gameData.usdtBalance.toFixed(2)} <span>USDT</span>`;
    }
    
    // آمار
    const todayEarningsEl = document.getElementById('todayEarnings');
    const miningPowerEl = document.getElementById('miningPower');
    const userLevelEl = document.getElementById('userLevel');
    const clickRewardEl = document.getElementById('clickReward');
    const lastClaimEl = document.getElementById('lastClaim');
    const availableUSDTEl = document.getElementById('availableUSDT');
    const progressFillEl = document.getElementById('progressFill');
    const progressTextEl = document.getElementById('progressText');
    
    if (todayEarningsEl) todayEarningsEl.textContent = `${formatNumber(gameData.todayEarnings)} SOD`;
    if (miningPowerEl) miningPowerEl.textContent = `${gameData.miningPower}x`;
    if (userLevelEl) userLevelEl.textContent = gameData.userLevel;
    if (clickRewardEl) clickRewardEl.textContent = `+${gameData.miningPower} SOD`;
    
    // نمایش آخرین دریافت
    if (lastClaimEl && gameData.lastClaimTime) {
        lastClaimEl.textContent = new Date(gameData.lastClaimTime).toLocaleTimeString('fa-IR');
    } else if (lastClaimEl) {
        lastClaimEl.textContent = '--';
    }
    
    // پاداش USDT
    if (availableUSDTEl) availableUSDTEl.textContent = `${gameData.usdtBalance.toFixed(2)} USDT`;
    
    const progressPercent = Math.min((gameData.usdtProgress / 10000000) * 100, 100);
    if (progressFillEl) progressFillEl.style.width = `${progressPercent}%`;
    if (progressTextEl) {
        progressTextEl.textContent = `${formatNumber(gameData.usdtProgress)} / ۱۰,۰۰۰,۰۰۰ SOD`;
    }
    
    // رندر تراکنش‌ها
    renderTransactions();
    
    // آپدیت ویجت
    updateFloatingWidget();
}

function updateFloatingWidget(recentMined = 0) {
    const widget = document.getElementById('floatingWidget');
    if (!widget) return;
    
    const pulse = widget.querySelector('.pulse');
    const text = document.getElementById('widgetText');
    
    if (!pulse || !text) return;
    
    if (window.currentUser) {
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
            text.textContent = "سیستم استخراج آماده";
            pulse.style.background = 'var(--primary)';
        }
    } else {
        text.textContent = "برای شروع وارد شوید";
        pulse.style.background = 'var(--text-secondary)';
    }
}

function renderTransactions() {
    const list = document.getElementById('transactionsList');
    if (!list) return;
    
    list.innerHTML = '';
    
    gameData.transactions.slice(0, 6).forEach(tx => {
        const row = document.createElement('div');
        row.className = 'transaction-row';
        
        let icon = '⛏️';
        let amountClass = 'sod';
        let amount = `+${formatNumber(tx.amount)} SOD`;
        let typeClass = 'استخراج';
        
        if (tx.type === 'usdt') {
            icon = tx.amount > 0 ? '💰' : '💳';
            amountClass = 'usdt';
            amount = `${tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)} USDT`;
            typeClass = tx.amount > 0 ? 'پاداش' : 'خرید';
        } else if (tx.type === 'system') {
            icon = '⚙️';
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
    if (window.currentUser) {
        saveTransactionToDB(description, amount, type);
    }
    
    // رندر مجدد
    renderTransactions();
}

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

// ==================== بخش ۷: مدیریت فرم‌ها ====================
document.addEventListener('DOMContentLoaded', function() {
    // مدیریت فرم ورود
    document.body.addEventListener('submit', async function(e) {
        if (e.target.id === 'loginForm') {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showNotification('⚠️ خطا', 'لطفا همه فیلدها را پر کنید');
                return;
            }
            
            await signIn(email, password);
        }
        
        // مدیریت فرم ثبت‌نام
        if (e.target.id === 'signupForm') {
            e.preventDefault();
            
            const username = document.getElementById('signupUsername').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
            
            if (!username || !email || !password || !passwordConfirm) {
                showNotification('⚠️ خطا', 'لطفا همه فیلدها را پر کنید');
                return;
            }
            
            if (password !== passwordConfirm) {
                showNotification('⚠️ خطا', 'رمز عبور و تکرار آن یکسان نیستند');
                return;
            }
            
            if (password.length < 6) {
                showNotification('⚠️ خطا', 'رمز عبور باید حداقل ۶ کاراکتر باشد');
                return;
            }
            
            await signUp(email, password, username);
        }
    });
});

// ==================== بخش ۸: راه‌اندازی اولیه ====================
window.addEventListener('DOMContentLoaded', function() {
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
    
    // راه‌اندازی سیستم
    setTimeout(() => {
        init();
    }, 1000);
    
    // نمایش نسخه
    console.log('📱 SODmAX Pro v3.0 | سیستم کامل با احراز هویت');
    console.log('👨‍💻 توسعه‌یافته توسط تیم SODmAX');
});

// ==================== بخش ۹: صادر کردن توابع به window ====================
window.gameData = gameData;
window.showNotification = showNotification;
window.hideNotification = hideNotification;
window.showLoginModal = showLoginModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.showPlans = showPlans;
window.selectPlan = selectPlan;
window.boostMining = boostMining;
window.signOut = signOut;

// ==================== بخش ۱۰: اضافه کردن event listeners ====================
// این بخش بعد از DOMContentLoaded اجرا می‌شود
setTimeout(() => {
    // کلیک برای استخراج
    const minerCore = document.getElementById('minerCore');
    if (minerCore) {
        minerCore.addEventListener('click', async () => {
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
        });
    }
    
    // دکمه استخراج خودکار
    const autoMineBtn = document.getElementById('autoMineBtn');
    if (autoMineBtn) {
        autoMineBtn.addEventListener('click', () => {
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
                if (widget) widget.style.transform = 'translateY(-5px)';
                showNotification("🤖 استخراج خودکار", "سیستم استخراج خودکار فعال شد.");
                addTransaction('فعال‌سازی استخراج خودکار', 0, 'system');
            } else {
                btn.innerHTML = '<i class="fas fa-robot"></i> استخراج خودکار';
                btn.style.background = '';
                if (widget) widget.style.transform = 'translateY(0)';
                showNotification("⏸️ توقف خودکار", "استخراج خودکار متوقف شد.");
                addTransaction('توقف استخراج خودکار', 0, 'system');
            }
        });
    }
    
    // دکمه افزایش قدرت
    const boostMiningBtn = document.getElementById('boostMiningBtn');
    if (boostMiningBtn) {
        boostMiningBtn.addEventListener('click', boostMining);
    }
    
    // دکمه نمایش پلن‌ها
    const showPlansBtn = document.getElementById('showPlansBtn');
    if (showPlansBtn) {
        showPlansBtn.addEventListener('click', showPlans);
    }
    
    // دکمه دریافت USDT
    const claimUSDTBtn = document.getElementById('claimUSDTBtn');
    if (claimUSDTBtn) {
        claimUSDTBtn.addEventListener('click', async () => {
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
    }
    
    // دکمه بستن نوتیفیکیشن
    const closeNotificationBtn = document.getElementById('closeNotificationBtn');
    if (closeNotificationBtn) {
        closeNotificationBtn.addEventListener('click', hideNotification);
    }
    
    // دکمه اتصال کیف پول/ورود
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', showLoginModal);
    }
}, 500);
