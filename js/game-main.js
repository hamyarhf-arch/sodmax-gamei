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

// ==================== بخش ۳: توابع ذخیره/بارگذاری پیشرفته ====================

/**
 * ذخیره ترکیبی - هم محلی هم دیتابیس
 */
async function saveGame() {
    // ۱. ذخیره در localStorage (همیشه)
    try {
        localStorage.setItem('sodmaxProData', JSON.stringify(gameData));
        localStorage.setItem('sodmaxLastSave', Date.now());
        localStorage.setItem('sodmaxVersion', '3.0');
    } catch (e) {
        console.warn('ذخیره محلی با خطا مواجه شد:', e);
    }
    
    // ۲. ذخیره در دیتابیس (اگر کاربر وارد شده)
    if (window.currentUser && window.supabase && window.supabaseConfigured) {
        try {
            await saveGameToDatabase();
            console.log('✅ بازی در دیتابیس ذخیره شد');
        } catch (dbError) {
            console.warn('ذخیره دیتابیس با خطا مواجه شد:', dbError);
            // اگر دیتابیس خطا داد، حالت آفلاین رو فعال کن
            enableOfflineMode();
        }
    }
}

/**
 * بارگذاری ترکیبی - اول از localStorage، بعد از دیتابیس
 */
async function loadGame() {
    let loadedFromDB = false;
    
    // ۱. اول از دیتابیس بارگذاری کن (اگر کاربر وارد شده)
    if (window.currentUser && window.supabase && window.supabaseConfigured) {
        try {
            loadedFromDB = await loadFromDatabase();
            if (loadedFromDB) {
                console.log('✅ داده‌ها از دیتابیس بارگذاری شدند');
                return;
            }
        } catch (dbError) {
            console.warn('بارگذاری از دیتابیس با خطا مواجه شد:', dbError);
        }
    }
    
    // ۲. اگر از دیتابیس بارگذاری نشد، از localStorage استفاده کن
    try {
        const saved = localStorage.getItem('sodmaxProData');
        if (saved) {
            const data = JSON.parse(saved);
            
            // مهاجرت داده‌های قدیمی اگر نیاز باشد
            migrateOldData(data);
            
            Object.assign(gameData, data);
            
            // بازنشانی روزانه
            const today = new Date().toDateString();
            const lastPlayed = localStorage.getItem('sodmaxLastPlayed');
            
            if (lastPlayed !== today) {
                gameData.todayEarnings = 0;
                localStorage.setItem('sodmaxLastPlayed', today);
            }
            
            console.log('✅ داده‌ها از localStorage بارگذاری شدند');
            
            // اگر کاربر وارد شده اما از localStorage بارگذاری کردیم، دیتابیس رو آپدیت کن
            if (window.currentUser && !loadedFromDB) {
                setTimeout(() => {
                    saveGameToDatabase();
                }, 2000);
            }
        }
    } catch (e) {
        console.warn('بارگذاری از localStorage با خطا مواجه شد:', e);
    }
}

/**
 * بارگذاری از دیتابیس
 */
async function loadFromDatabase() {
    if (!window.currentUser || !window.supabase) return false;
    
    try {
        // دریافت داده‌های بازی کاربر
        const { data: gameDataDB, error: gameError } = await supabase
            .from('user_game_data')
            .select('*')
            .eq('user_id', window.currentUser.id)
            .single();

        if (gameError) throw gameError;
        
        if (gameDataDB) {
            // تبدیل داده‌های دیتابیس به فرمت بازی
            gameData.sodBalance = gameDataDB.sod_balance || 0;
            gameData.usdtBalance = parseFloat(gameDataDB.usdt_balance) || 0;
            gameData.miningPower = gameDataDB.mining_power || 10;
            gameData.userLevel = gameDataDB.user_level || 1;
            gameData.totalMined = gameDataDB.total_mined || 0;
            gameData.todayEarnings = gameDataDB.today_earnings || 0;
            gameData.usdtProgress = gameDataDB.usdt_progress || 0;
            gameData.boostActive = gameDataDB.boost_active || false;
            gameData.boostEndTime = gameDataDB.boost_end_time ? 
                new Date(gameDataDB.boost_end_time).getTime() : 0;
            gameData.lastClaimTime = gameDataDB.last_claim_time;
            
            // همزمان در localStorage هم ذخیره کن
            localStorage.setItem('sodmaxProData', JSON.stringify(gameData));
            
            // دریافت پلن فعال
            const { data: activePlan, error: planError } = await supabase
                .from('user_plans')
                .select('*')
                .eq('user_id', window.currentUser.id)
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
            
            // دریافت تراکنش‌ها
            await loadUserTransactions(window.currentUser.id);
            
            return true;
        }
    } catch (error) {
        console.error('خطا در بارگذاری از دیتابیس:', error);
    }
    
    return false;
}

/**
 * مهاجرت داده‌های قدیمی
 */
function migrateOldData(data) {
    // اگر نسخه قدیمی‌تر از 2.0 هست
    if (!data.version || data.version < '2.0') {
        console.log('🔄 در حال مهاجرت داده‌های قدیمی...');
        
        // تبدیل داده‌های قدیمی به جدید
        if (data.balance !== undefined) {
            data.sodBalance = data.balance;
            delete data.balance;
        }
        
        if (data.power !== undefined) {
            data.miningPower = data.power;
            delete data.power;
        }
        
        data.version = '3.0';
    }
}

/**
 * فعال کردن حالت آفلاین
 */
function enableOfflineMode() {
    console.log('🔌 فعال کردن حالت آفلاین');
    
    window.isOfflineMode = true;
    
    // نمایش نوتیفیکیشن به کاربر
    showNotification('📡 حالت آفلاین', 'در حال حاضر به دیتابیس متصل نیستید. داده‌ها فقط محلی ذخیره می‌شوند.');
    
    // تغییر متن ویجت
    updateFloatingWidget();
}

/**
 * همگام‌سازی داده‌های محلی با دیتابیس
 */
async function syncLocalDataWithDatabase() {
    if (!window.currentUser || !window.supabase || window.isOfflineMode) {
        return;
    }
    
    try {
        console.log('🔄 همگام‌سازی داده‌های محلی با دیتابیس...');
        
        // ۱. بارگذاری از localStorage
        const saved = localStorage.getItem('sodmaxProData');
        if (!saved) return;
        
        const localData = JSON.parse(saved);
        
        // ۲. بارگذاری از دیتابیس
        const { data: dbData, error } = await supabase
            .from('user_game_data')
            .select('sod_balance, usdt_balance, total_mined, updated_at')
            .eq('user_id', window.currentUser.id)
            .single();
        
        if (error) throw error;
        
        // ۳. مقایسه و انتخاب جدیدترین داده
        if (dbData) {
            const dbTime = new Date(dbData.updated_at).getTime();
            const localTime = parseInt(localStorage.getItem('sodmaxLastSave') || '0');
            
            if (localTime > dbTime) {
                // داده‌های محلی جدیدتر هستند
                console.log('💾 داده‌های محلی جدیدتر هستند، در حال آپدیت دیتابیس...');
                await saveGameToDatabase();
            } else if (dbTime > localTime) {
                // داده‌های دیتابیس جدیدتر هستند
                console.log('💾 داده‌های دیتابیس جدیدتر هستند، در حال آپدیت localStorage...');
                await loadFromDatabase();
                updateUI();
            }
        } else {
            // هیچ داده‌ای در دیتابیس نیست، داده‌های محلی رو ذخیره کن
            console.log('💾 ذخیره داده‌های محلی در دیتابیس...');
            await saveGameToDatabase();
        }
        
    } catch (error) {
        console.error('خطا در همگام‌سازی:', error);
        enableOfflineMode();
    }
}

// ==================== بخش ۴: توابع احراز هویت ====================
async function handleAuth() {
    try {
        // اول از localStorage چک کن اگر کاربری ذخیره شده
        const savedUser = localStorage.getItem('sodmaxUser');
        if (savedUser && !window.supabaseConfigured) {
            console.log('👤 کاربر از localStorage تشخیص داده شد');
            const userData = JSON.parse(savedUser);
            window.currentUser = { id: 'local-' + userData.email, email: userData.email };
            updateNavForLoggedInUser();
            return true;
        }
        
        // اگر Supabase وصل هست
        if (window.supabase && window.supabaseConfigured) {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) throw error;
            
            if (session) {
                window.currentUser = session.user;
                await loadUserData(session.user.id);
                updateNavForLoggedInUser();
                return true;
            }
        }
        
        // کاربر وارد نشده
        setTimeout(() => {
            showLoginModal();
        }, 1000);
        return false;
        
    } catch (error) {
        console.error('خطا در احراز هویت:', error);
        
        // حالت آفلاین رو فعال کن
        enableOfflineMode();
        
        // کاربر رو به صورت مهمان دربیار
        window.currentUser = null;
        updateNavForLoggedOutUser();
        
        setTimeout(() => {
            showLoginModal();
        }, 1000);
        return false;
    }
}

async function signUp(email, password, username) {
    try {
        // اگر Supabase وصل نیست، حالت آفلاین
        if (!window.supabase || !window.supabaseConfigured) {
            console.log('🔌 ثبت‌نام در حالت آفلاین');
            
            // ذخیره کاربر در localStorage
            const userData = {
                email: email,
                username: username,
                lastLogin: new Date().toISOString()
            };
            localStorage.setItem('sodmaxUser', JSON.stringify(userData));
            
            window.currentUser = { 
                id: 'local-' + email, 
                email: email 
            };
            
            enableOfflineMode();
            showNotification('🎉 ثبت‌نام موفق (آفلاین)', 'حساب کاربری شما ایجاد شد.');
            closeAuthModal();
            updateNavForLoggedInUser();
            return true;
        }
        
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
            
            // ذخیره در localStorage برای حالت آفلاین
            localStorage.setItem('sodmaxUser', JSON.stringify({
                email: data.user.email,
                id: data.user.id,
                username: username,
                lastLogin: new Date().toISOString()
            }));
            
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
        // اگر Supabase وصل نیست، حالت آفلاین
        if (!window.supabase || !window.supabaseConfigured) {
            console.log('🔌 ورود در حالت آفلاین');
            
            // ذخیره کاربر در localStorage
            const userData = {
                email: email,
                username: email.split('@')[0],
                lastLogin: new Date().toISOString()
            };
            localStorage.setItem('sodmaxUser', JSON.stringify(userData));
            
            window.currentUser = { 
                id: 'local-' + email, 
                email: email 
            };
            
            enableOfflineMode();
            showNotification('👋 خوش آمدید (آفلاین)', 'شما در حالت آفلاین وارد شدید.');
            closeAuthModal();
            updateNavForLoggedInUser();
            return true;
        }
        
        // ورود عادی با Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (data.user) {
            window.currentUser = data.user;
            
            // ذخیره در localStorage برای حالت آفلاین
            localStorage.setItem('sodmaxUser', JSON.stringify({
                email: data.user.email,
                id: data.user.id,
                lastLogin: new Date().toISOString()
            }));
            
            // آپدیت دیتابیس
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
        // اگر Supabase وصل هست
        if (window.supabase && window.supabaseConfigured) {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        }
        
        window.currentUser = null;
        localStorage.removeItem('sodmaxUser');
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
                    last_claim_time: gameData.lastClaimTime,
                    updated_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;
    } catch (error) {
        console.error('خطا در ذخیره داده‌های بازی:', error);
        throw error;
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

// ==================== بخش ۵: مودال ورود/ثبت‌نام ====================
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
