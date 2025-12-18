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
    
    // اضافه کردن event listeners برای فرم‌ها
    setTimeout(() => {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                signIn(email, password);
            });
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const username = document.getElementById('signupUsername').value;
                const email = document.getElementById('signupEmail').value;
                const password = document.getElementById('signupPassword').value;
                const confirmPassword = document.getElementById('signupPasswordConfirm').value;
                
                if (password !== confirmPassword) {
                    showNotification('❌ خطا', 'رمز عبور و تکرار آن مطابقت ندارند.');
                    return;
                }
                
                signUp(email, password, username);
            });
        }
    }, 100);
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.remove();
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginTab = document.querySelector('.auth-tabs button:nth-child(1)');
    const signupTab = document.querySelector('.auth-tabs button:nth-child(2)');
    
    if (!loginForm || !signupForm || !loginTab || !signupTab) return;
    
    if (tab === 'login') {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
    } else {
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
    }
}

// ==================== بخش ۶: تابع‌های اصلی بازی ====================
function updateUI() {
    // به‌روزرسانی موجودی‌ها
    const sodBalanceEl = document.getElementById('sodBalance');
    const usdtBalanceEl = document.getElementById('usdtBalance');
    const todayEarningsEl = document.getElementById('todayEarnings');
    const totalMinedEl = document.getElementById('totalMined');
    const miningPowerEl = document.getElementById('miningPower');
    const userLevelEl = document.getElementById('userLevel');
    
    if (sodBalanceEl) sodBalanceEl.textContent = formatNumber(gameData.sodBalance);
    if (usdtBalanceEl) usdtBalanceEl.textContent = formatNumber(gameData.usdtBalance);
    if (todayEarningsEl) todayEarningsEl.textContent = formatNumber(gameData.todayEarnings);
    if (totalMinedEl) totalMinedEl.textContent = formatNumber(gameData.totalMined);
    if (miningPowerEl) miningPowerEl.textContent = formatNumber(gameData.miningPower);
    if (userLevelEl) userLevelEl.textContent = gameData.userLevel;
    
    // به‌روزرسانی پیشرفت USDT
    const usdtProgressBar = document.getElementById('usdtProgressBar');
    const usdtProgressText = document.getElementById('usdtProgressText');
    if (usdtProgressBar && usdtProgressText) {
        usdtProgressBar.style.width = `${gameData.usdtProgress}%`;
        usdtProgressText.textContent = `${Math.round(gameData.usdtProgress)}%`;
    }
    
    // به‌روزرسانی پلن فعال
    updateActivePlanDisplay();
    
    // به‌روزرسانی لیست تراکنش‌ها
    updateTransactionsList();
    
    // به‌روزرسانی وضعیت تقویت
    updateBoostStatus();
    
    // به‌روزرسانی ویجت شناور
    updateFloatingWidget();
}

function updateActivePlanDisplay() {
    const planBadge = document.getElementById('activePlanBadge');
    const planName = document.getElementById('activePlanName');
    const autoMiningStatus = document.getElementById('autoMiningStatus');
    const multiplierDisplay = document.getElementById('multiplierDisplay');
    
    if (gameData.activePlan) {
        if (planBadge) planBadge.textContent = gameData.activePlan.name;
        if (planName) planName.textContent = gameData.activePlan.name;
        if (autoMiningStatus) {
            autoMiningStatus.textContent = gameData.autoMining ? 
                `فعال (${formatNumber(gameData.activePlan.autoSpeed)} SOD/ثانیه)` : 
                'غیرفعال';
        }
        if (multiplierDisplay) multiplierDisplay.textContent = `${gameData.activePlan.multiplier}x`;
        
        // به‌روزرسانی کلیدهای پلن
        document.querySelectorAll('.plan-card').forEach(card => {
            const planId = parseInt(card.dataset.planId);
            const btn = card.querySelector('.btn-plan');
            
            if (btn) {
                if (planId === gameData.activePlan.id) {
                    btn.textContent = 'پلن فعال ✓';
                    btn.classList.add('btn-success');
                    btn.classList.remove('btn-primary');
                    btn.disabled = true;
                } else if (planId === 1 && !gameData.activePlan) {
                    // پلن رایگان
                    btn.textContent = 'فعال‌سازی رایگان';
                    btn.classList.add('btn-primary');
                    btn.classList.remove('btn-success');
                    btn.disabled = false;
                } else {
                    btn.textContent = planId === 1 ? 'فعال‌سازی رایگان' : 'خرید پلن';
                    btn.classList.add('btn-primary');
                    btn.classList.remove('btn-success');
                    btn.disabled = false;
                }
            }
        });
    } else {
        // پلن رایگان فعال است
        if (planBadge) planBadge.textContent = 'استارتر';
        if (planName) planName.textContent = 'استارتر (رایگان)';
        if (autoMiningStatus) autoMiningStatus.textContent = 'غیرفعال';
        if (multiplierDisplay) multiplierDisplay.textContent = '1x';
        
        // به‌روزرسانی کلیدهای پلن
        document.querySelectorAll('.plan-card').forEach(card => {
            const planId = parseInt(card.dataset.planId);
            const btn = card.querySelector('.btn-plan');
            
            if (btn) {
                if (planId === 1) {
                    btn.textContent = 'فعال‌سازی رایگان';
                    btn.classList.add('btn-primary');
                    btn.classList.remove('btn-success');
                    btn.disabled = false;
                } else {
                    btn.textContent = 'خرید پلن';
                    btn.classList.add('btn-primary');
                    btn.classList.remove('btn-success');
                    btn.disabled = false;
                }
            }
        });
    }
}

function updateTransactionsList() {
    const container = document.getElementById('transactionsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!gameData.transactions || gameData.transactions.length === 0) {
        container.innerHTML = `
            <div class="transaction-item empty">
                <i class="fas fa-exchange-alt"></i>
                <p>هنوز هیچ تراکنشی ثبت نشده است</p>
            </div>
        `;
        return;
    }
    
    gameData.transactions.forEach(tx => {
        const txElement = document.createElement('div');
        txElement.className = `transaction-item ${tx.type}`;
        
        const icon = tx.type === 'earn' ? 'fa-plus-circle' : 
                    tx.type === 'spend' ? 'fa-minus-circle' : 
                    'fa-exchange-alt';
        const sign = tx.type === 'earn' ? '+' : '-';
        
        txElement.innerHTML = `
            <div class="transaction-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-desc">${tx.description}</div>
                <div class="transaction-time">${tx.time}</div>
            </div>
            <div class="transaction-amount ${tx.type}">
                ${sign}${formatNumber(tx.amount)} ${tx.type === 'usdt' ? 'USDT' : 'SOD'}
            </div>
        `;
        
        container.appendChild(txElement);
    });
}

function updateBoostStatus() {
    const boostBtn = document.getElementById('boostBtn');
    const boostTimer = document.getElementById('boostTimer');
    const boostIcon = document.getElementById('boostIcon');
    
    if (!boostBtn || !boostTimer) return;
    
    if (gameData.boostActive && gameData.boostEndTime > Date.now()) {
        // تقویت فعال است
        const timeLeft = Math.max(0, gameData.boostEndTime - Date.now());
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        
        boostBtn.disabled = true;
        boostBtn.innerHTML = `<i class="fas fa-bolt"></i> فعال`;
        boostTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        boostTimer.style.display = 'inline';
        
        if (boostIcon) {
            boostIcon.style.animation = 'pulse 1s infinite';
            boostIcon.style.color = '#ff9500';
        }
    } else {
        // تقویت غیرفعال
        gameData.boostActive = false;
        boostBtn.disabled = false;
        boostBtn.innerHTML = `<i class="fas fa-bolt"></i> تقویت استخراج`;
        boostTimer.style.display = 'none';
        
        if (boostIcon) {
            boostIcon.style.animation = 'none';
            boostIcon.style.color = '#666';
        }
    }
}

function updateFloatingWidget() {
    const widget = document.getElementById('floatingWidget');
    if (!widget) return;
    
    const status = document.getElementById('onlineStatus');
    const userInfo = document.getElementById('floatingUserInfo');
    const syncBtn = document.getElementById('syncNowBtn');
    
    if (window.currentUser) {
        if (userInfo) {
            userInfo.textContent = window.currentUser.email.split('@')[0];
        }
        
        if (window.isOfflineMode) {
            if (status) {
                status.innerHTML = '<i class="fas fa-wifi-slash"></i> آفلاین';
                status.className = 'offline';
            }
            if (syncBtn) syncBtn.style.display = 'block';
        } else {
            if (status) {
                status.innerHTML = '<i class="fas fa-wifi"></i> آنلاین';
                status.className = 'online';
            }
            if (syncBtn) syncBtn.style.display = 'none';
        }
    } else {
        if (status) {
            status.innerHTML = '<i class="fas fa-user-slash"></i> مهمان';
            status.className = 'guest';
        }
        if (userInfo) userInfo.textContent = 'کاربر مهمان';
        if (syncBtn) syncBtn.style.display = 'none';
    }
}

// ==================== بخش ۷: استخراج و کسب درآمد ====================
function mineSOD() {
    let earnings = gameData.miningPower;
    
    // اعمال ضریب پلن فعال
    if (gameData.activePlan) {
        earnings *= gameData.activePlan.multiplier;
    }
    
    // اعمال تقویت ۲x اگر فعال باشد
    if (gameData.boostActive && gameData.boostEndTime > Date.now()) {
        earnings *= 2;
    }
    
    // اعمال پاداش‌های تصادفی
    if (Math.random() < 0.05) { // 5% شانس برای پاداش ۲x
        earnings *= 2;
        showNotification('✨ پاداش ۲x', 'شانس آوردی! استخراج این بار دو برابر شد!');
    }
    
    // گرد کردن به عدد صحیح
    earnings = Math.floor(earnings);
    
    // افزایش موجودی
    gameData.sodBalance += earnings;
    gameData.totalMined += earnings;
    gameData.todayEarnings += earnings;
    
    // افزایش پیشرفت USDT
    const usdtProgressIncrement = Math.random() * 0.5; // 0-0.5%
    gameData.usdtProgress = Math.min(100, gameData.usdtProgress + usdtProgressIncrement);
    
    // اگر پیشرفت به ۱۰۰٪ رسید، USDT دریافت کن
    if (gameData.usdtProgress >= 100) {
        claimUSDT();
    }
    
    // ذخیره تراکنش
    const transaction = {
        description: 'استخراج SOD',
        amount: earnings,
        type: 'earn',
        time: new Date().toLocaleString('fa-IR')
    };
    
    gameData.transactions.unshift(transaction);
    if (gameData.transactions.length > 50) {
        gameData.transactions.pop();
    }
    
    // ذخیره در دیتابیس
    if (window.currentUser && !window.isOfflineMode) {
        saveTransactionToDB('استخراج SOD', earnings, 'earn');
        saveGameToDatabase();
    } else {
        saveGame();
    }
    
    // به‌روزرسانی UI
    updateUI();
    
    // انیمیشن کلیک
    const mineBtn = document.getElementById('mineBtn');
    if (mineBtn) {
        mineBtn.classList.add('clicked');
        setTimeout(() => {
            mineBtn.classList.remove('clicked');
        }, 200);
    }
    
    // نمایش متغیر شناور
    showFloatingText(earnings);
    
    return earnings;
}

function showFloatingText(amount) {
    const floatingText = document.createElement('div');
    floatingText.className = 'floating-earnings';
    floatingText.textContent = `+${formatNumber(amount)} SOD`;
    floatingText.style.position = 'fixed';
    floatingText.style.zIndex = '9999';
    floatingText.style.color = '#4CAF50';
    floatingText.style.fontWeight = 'bold';
    floatingText.style.fontSize = '18px';
    floatingText.style.pointerEvents = 'none';
    floatingText.style.animation = 'floatUp 1s ease-out forwards';
    
    // موقعیت تصادفی حول دکمه استخراج
    const mineBtn = document.getElementById('mineBtn');
    if (mineBtn) {
        const rect = mineBtn.getBoundingClientRect();
        floatingText.style.left = `${rect.left + Math.random() * 50}px`;
        floatingText.style.top = `${rect.top - 30}px`;
    } else {
        floatingText.style.left = `${window.innerWidth / 2}px`;
        floatingText.style.top = `${window.innerHeight / 2}px`;
    }
    
    document.body.appendChild(floatingText);
    
    // حذف بعد از انیمیشن
    setTimeout(() => {
        if (floatingText.parentNode) {
            floatingText.remove();
        }
    }, 1000);
}

function startAutoMining() {
    if (!gameData.activePlan || gameData.activePlan.id === 1) {
        showNotification('⚠️ نیاز به پلن', 'برای استفاده از استخراج خودکار، باید پلن PRO یا بالاتر خریداری کنید.');
        return;
    }
    
    if (gameData.autoMining) {
        gameData.autoMining = false;
        showNotification('⏸️ توقف خودکار', 'استخراج خودکار متوقف شد.');
    } else {
        gameData.autoMining = true;
        showNotification('⚡ شروع خودکار', `استخراج خودکار با سرعت ${formatNumber(gameData.activePlan.autoSpeed)} SOD/ثانیه فعال شد.`);
    }
    
    updateUI();
    saveGame();
}

function claimUSDT() {
    let usdtAmount = 1; // مقدار پایه
    
    // اعمال پاداش پلن
    if (gameData.activePlan) {
        usdtAmount *= (1 + gameData.activePlan.usdtBonus / 100);
    }
    
    // اعمال پاداش سطح
    const levelBonus = (gameData.userLevel - 1) * 0.1; // 10% به ازای هر سطح
    usdtAmount *= (1 + levelBonus);
    
    // گرد کردن به دو رقم اعشار
    usdtAmount = parseFloat(usdtAmount.toFixed(2));
    
    // افزایش موجودی
    gameData.usdtBalance += usdtAmount;
    gameData.usdtProgress = 0;
    gameData.lastClaimTime = new Date().toISOString();
    
    // ذخیره تراکنش
    const transaction = {
        description: 'دریافت پاداش USDT',
        amount: usdtAmount,
        type: 'usdt',
        time: new Date().toLocaleString('fa-IR')
    };
    
    gameData.transactions.unshift(transaction);
    
    // ذخیره در دیتابیس
    if (window.currentUser && !window.isOfflineMode) {
        saveTransactionToDB('دریافت پاداش USDT', usdtAmount, 'usdt');
        saveGameToDatabase();
    } else {
        saveGame();
    }
    
    // به‌روزرسانی UI
    updateUI();
    
    showNotification('🎁 دریافت USDT', `${usdtAmount} USDT دریافت کردید!`);
}

function activateBoost() {
    if (gameData.boostActive && gameData.boostEndTime > Date.now()) {
        showNotification('⚠️ تقویت فعال', 'در حال حاضر تقویت استخراج فعال است.');
        return;
    }
    
    // بررسی موجودی
    const boostCost = 1000; // هزینه تقویت
    
    if (gameData.sodBalance < boostCost) {
        showNotification('❌ موجودی ناکافی', `برای فعال‌سازی تقویت، حداقل ${boostCost} SOD نیاز دارید.`);
        return;
    }
    
    // کسر هزینه
    gameData.sodBalance -= boostCost;
    
    // فعال‌سازی تقویت
    gameData.boostActive = true;
    gameData.boostEndTime = Date.now() + (5 * 60 * 1000); // 5 دقیقه
    
    // ذخیره تراکنش
    const transaction = {
        description: 'خرید تقویت استخراج',
        amount: boostCost,
        type: 'spend',
        time: new Date().toLocaleString('fa-IR')
    };
    
    gameData.transactions.unshift(transaction);
    
    // ذخیره در دیتابیس
    if (window.currentUser && !window.isOfflineMode) {
        saveTransactionToDB('خرید تقویت استخراج', boostCost, 'spend');
        saveGameToDatabase();
    } else {
        saveGame();
    }
    
    // به‌روزرسانی UI
    updateUI();
    
    showNotification('⚡ تقویت فعال', 'استخراج شما برای ۵ دقیقه ۲ برابر شده است!');
}

function upgradeMiningPower() {
    const upgradeCost = Math.pow(gameData.miningPower, 1.5) * 10;
    
    if (gameData.sodBalance < upgradeCost) {
        showNotification('❌ موجودی ناکافی', `برای ارتقاء قدرت استخراج، ${formatNumber(upgradeCost)} SOD نیاز دارید.`);
        return;
    }
    
    // کسر هزینه
    gameData.sodBalance -= upgradeCost;
    
    // افزایش قدرت استخراج
    gameData.miningPower += 5;
    
    // افزایش سطح کاربر
    if (gameData.miningPower % 50 === 0) {
        gameData.userLevel++;
        showNotification('🎉 سطح افزایش یافت', `تبریک! به سطح ${gameData.userLevel} رسیدید.`);
    }
    
    // ذخیره تراکنش
    const transaction = {
        description: 'ارتقاء قدرت استخراج',
        amount: upgradeCost,
        type: 'spend',
        time: new Date().toLocaleString('fa-IR')
    };
    
    gameData.transactions.unshift(transaction);
    
    // ذخیره در دیتابیس
    if (window.currentUser && !window.isOfflineMode) {
        saveTransactionToDB('ارتقاء قدرت استخراج', upgradeCost, 'spend');
        saveGameToDatabase();
    } else {
        saveGame();
    }
    
    // به‌روزرسانی UI
    updateUI();
    
    showNotification('⚡ ارتقاء موفق', `قدرت استخراج شما به ${gameData.miningPower} افزایش یافت.`);
}

// ==================== بخش ۸: سیستم پلن‌ها ====================
function activatePlan(planId) {
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
        showNotification('❌ خطا', 'پلن مورد نظر یافت نشد.');
        return;
    }
    
    // بررسی پلن فعلی
    if (gameData.activePlan && gameData.activePlan.id === planId) {
        showNotification('ℹ️ پلن فعال', 'این پلن در حال حاضر فعال است.');
        return;
    }
    
    // پلن رایگان (استارتر)
    if (planId === 1) {
        activateFreePlan(plan);
        return;
    }
    
    // نمایش مودال خرید
    showPurchaseModal(plan);
}

function activateFreePlan(plan) {
    gameData.activePlan = {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        multiplier: plan.multiplier,
        autoSpeed: plan.autoSpeed,
        usdtBonus: plan.usdtBonus
    };
    
    // ذخیره در localStorage
    saveGame();
    
    // ذخیره در دیتابیس (اگر کاربر وارد شده)
    if (window.currentUser && !window.isOfflineMode) {
        savePlanPurchase(plan);
        saveGameToDatabase();
    }
    
    // به‌روزرسانی UI
    updateUI();
    
    showNotification('🎉 پلن فعال شد', 'پلن استارتر با موفقیت فعال شد.');
}

function showPurchaseModal(plan) {
    // اگر مودال خرید قبلاً وجود دارد، حذف کن
    closeModal('purchaseModal');
    
    const modalHTML = `
        <div class="modal-overlay" id="purchaseModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>خرید پلن ${plan.name}</h3>
                    <button class="modal-close" onclick="closeModal('purchaseModal')">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="plan-summary">
                        <h4>مشخصات پلن:</h4>
                        <ul>
                            ${plan.features.map(f => `<li>✓ ${f}</li>`).join('')}
                        </ul>
                        
                        <div class="price-section">
                            <span class="price">${plan.price} USDT</span>
                            <span class="price-usd">≈ ${(plan.price * 1.0).toFixed(2)} USD</span>
                        </div>
                    </div>
                    
                    <div class="payment-methods">
                        <h4>روش پرداخت:</h4>
                        <div class="payment-options">
                            <label class="payment-option active">
                                <input type="radio" name="paymentMethod" value="usdt" checked>
                                <i class="fab fa-usdt"></i>
                                <span>پرداخت با USDT</span>
                            </label>
                            
                            <label class="payment-option">
                                <input type="radio" name="paymentMethod" value="crypto">
                                <i class="fas fa-coins"></i>
                                <span>ارز دیجیتال</span>
                            </label>
                            
                            <label class="payment-option">
                                <input type="radio" name="paymentMethod" value="wallet">
                                <i class="fas fa-wallet"></i>
                                <span>کیف پول</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="current-balance">
                        <span>موجودی فعلی USDT:</span>
                        <span class="balance-amount">${formatNumber(gameData.usdtBalance)} USDT</span>
                    </div>
                    
                    <div class="payment-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        پس از خرید، پلن به مدت ۳۰ روز فعال خواهد بود.
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('purchaseModal')">انصراف</button>
                    <button class="btn btn-primary" onclick="processPlanPurchase(${plan.id})">
                        <i class="fas fa-shopping-cart"></i>
                        پرداخت و فعال‌سازی
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

function processPlanPurchase(planId) {
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
        showNotification('❌ خطا', 'پلن مورد نظر یافت نشد.');
        closeModal('purchaseModal');
        return;
    }
    
    // بررسی موجودی
    if (gameData.usdtBalance < plan.price) {
        showNotification('❌ موجودی ناکافی', `برای خرید این پلن، ${plan.price} USDT نیاز دارید.`);
        return;
    }
    
    // کسر هزینه
    gameData.usdtBalance -= plan.price;
    
    // فعال‌سازی پلن
    gameData.activePlan = {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        multiplier: plan.multiplier,
        autoSpeed: plan.autoSpeed,
        usdtBonus: plan.usdtBonus
    };
    
    // ذخیره تراکنش
    const transaction = {
        description: `خرید پلن ${plan.name}`,
        amount: plan.price,
        type: 'spend',
        time: new Date().toLocaleString('fa-IR')
    };
    
    gameData.transactions.unshift(transaction);
    
    // ذخیره در دیتابیس
    if (window.currentUser && !window.isOfflineMode) {
        savePlanPurchase(plan);
        saveTransactionToDB(`خرید پلن ${plan.name}`, plan.price, 'spend');
        saveGameToDatabase();
    } else {
        saveGame();
    }
    
    // بستن مودال
    closeModal('purchaseModal');
    
    // به‌روزرسانی UI
    updateUI();
    
    showNotification('🎉 خرید موفق', `پلن ${plan.name} با موفقیت خریداری و فعال شد!`);
}

// ==================== بخش ۹: مدیریت رویدادها ====================
function setupEventListeners() {
    // تنظیم رویداد کلیک برای استخراج
    const mineBtn = document.getElementById('mineBtn');
    if (mineBtn) {
        mineBtn.addEventListener('click', mineSOD);
    }
    
    // تنظیم رویداد برای استخراج خودکار
    const autoMineBtn = document.getElementById('autoMineBtn');
    if (autoMineBtn) {
        autoMineBtn.addEventListener('click', startAutoMining);
    }
    
    // تنظیم رویداد برای تقویت
    const boostBtn = document.getElementById('boostBtn');
    if (boostBtn) {
        boostBtn.addEventListener('click', activateBoost);
    }
    
    // تنظیم رویداد برای ارتقاء قدرت استخراج
    const upgradeBtn = document.getElementById('upgradeBtn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', upgradeMiningPower);
    }
    
    // تنظیم رویداد برای دریافت USDT
    const claimUsdtBtn = document.getElementById('claimUsdtBtn');
    if (claimUsdtBtn) {
        claimUsdtBtn.addEventListener('click', claimUSDT);
    }
    
    // تنظیم رویدادهای پلن‌ها
    document.querySelectorAll('.btn-plan').forEach(btn => {
        btn.addEventListener('click', function() {
            const planCard = this.closest('.plan-card');
            if (!planCard) return;
            
            const planId = parseInt(planCard.dataset.planId);
            if (!isNaN(planId)) {
                activatePlan(planId);
            }
        });
    });
    
    // تنظیم دکمه خروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
    }
    
    // تنظیم دکمه همگام‌سازی
    const syncBtn = document.getElementById('syncNowBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async function() {
            if (!window.currentUser || !window.supabase) {
                showNotification('❌ خطا', 'برای همگام‌سازی باید وارد حساب کاربری خود شوید.');
                return;
            }
            
            try {
                await syncLocalDataWithDatabase();
                showNotification('✅ موفق', 'داده‌ها با موفقیت همگام‌سازی شدند.');
                updateFloatingWidget();
            } catch (error) {
                showNotification('❌ خطا', 'خطا در همگام‌سازی داده‌ها.');
            }
        });
    }
    
    // کلیک روی صفحه برای استخراج (جایگزین)
    document.body.addEventListener('click', function(e) {
        // اگر روی دکمه استخراج کلیک نشده و روی المان خاصی نباشد
        if (!e.target.closest('#mineBtn') && 
            !e.target.closest('.modal') && 
            !e.target.closest('a') && 
            !e.target.closest('button') &&
            e.target.isContentEditable !== true) {
            
            // 10% شانس برای استخراج با کلیک عادی
            if (Math.random() < 0.1) {
                mineSOD();
            }
        }
    });
}

// ==================== بخش ۱۰: تابع‌های کمکی ====================
function connectWallet() {
    showNotification('🔌 در حال اتصال', 'اتصال به کیف پول...');
    
    // شبیه‌سازی اتصال به کیف پول
    setTimeout(() => {
        showNotification('✅ متصل شد', 'اتصال به کیف پول با موفقیت انجام شد.');
        
        // دریافت آدرس کیف پول (شبیه‌سازی)
        const walletAddress = '0x' + Array.from({length: 40}, () => 
            Math.floor(Math.random() * 16).toString(16)).join('');
        
        // ذخیره در localStorage
        localStorage.setItem('sodmaxWallet', walletAddress);
        
        // بستن مودال احراز هویت
        closeAuthModal();
        
        // ورود خودکار
        window.currentUser = {
            id: 'wallet-' + walletAddress.substring(0, 10),
            email: `${walletAddress.substring(0, 8)}@wallet.com`
        };
        
        updateNavForLoggedInUser();
        showNotification('👋 خوش آمدید', 'با کیف پول وارد شدید!');
    }, 2000);
}

function updateNavForLoggedInUser() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    
    if (authButtons) authButtons.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    
    // به‌روزرسانی ایمیل کاربر
    const userEmail = document.getElementById('userEmail');
    if (userEmail && window.currentUser) {
        userEmail.textContent = window.currentUser.email.split('@')[0];
    }
}

function updateNavForLoggedOutUser() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    
    if (authButtons) authButtons.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
}

function exportGameData() {
    const data = {
        gameData: gameData,
        user: window.currentUser,
        timestamp: new Date().toISOString(),
        version: '3.0'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `sodmax-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('💾 پشتیبان‌گیری', 'داده‌های بازی با موفقیت ذخیره شدند.');
}

function importGameData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.gameData || data.version !== '3.0') {
                showNotification('❌ خطا', 'فایل پشتیبان معتبر نیست.');
                return;
            }
            
            if (confirm('آیا مطمئن هستید؟ این کار داده‌های فعلی را بازنویسی می‌کند.')) {
                Object.assign(gameData, data.gameData);
                saveGame();
                updateUI();
                showNotification('✅ بازیابی', 'داده‌های بازی با موفقیت بازیابی شدند.');
            }
        } catch (error) {
            showNotification('❌ خطا', 'خطا در خواندن فایل پشتیبان.');
        }
    };
    reader.readAsText(file);
    
    // ریست کردن input برای امکان انتخاب مجدد
    event.target.value = '';
}

function resetGame() {
    if (confirm('⚠️ آیا مطمئن هستید؟\n\nاین کار تمام پیشرفت‌های شما را پاک می‌کند و قابل بازگشت نیست.')) {
        // بازنشانی داده‌های بازی
        gameData.sodBalance = 0;
        gameData.usdtBalance = 0;
        gameData.todayEarnings = 0;
        gameData.totalMined = 0;
        gameData.miningPower = 10;
        gameData.userLevel = 1;
        gameData.activePlan = null;
        gameData.usdtProgress = 0;
        gameData.autoMining = false;
        gameData.transactions = [];
        gameData.boostActive = false;
        gameData.boostEndTime = 0;
        gameData.lastClaimTime = null;
        
        // پاک کردن localStorage
        localStorage.removeItem('sodmaxProData');
        localStorage.removeItem('sodmaxLastSave');
        localStorage.removeItem('sodmaxLastPlayed');
        
        // پاک کردن دیتابیس (اگر کاربر وارد شده)
        if (window.currentUser && !window.isOfflineMode && window.supabase) {
            // غیرفعال کردن همه پلن‌ها
            supabase
                .from('user_plans')
                .update({ is_active: false })
                .eq('user_id', window.currentUser.id);
        }
        
        saveGame();
        updateUI();
        
        showNotification('🔄 بازنشانی', 'بازی با موفقیت بازنشانی شد.');
    }
}

// ==================== بخش ۱۱: تابع‌های آماری و گزارش‌گیری ====================
function getGameStats() {
    return {
        version: window.gameVersion || 'unknown',
        playTime: calculatePlayTime(),
        efficiency: calculateMiningEfficiency(),
        achievements: getAchievements(),
        nextMilestone: getNextMilestone(),
        estimatedDailyEarnings: calculateDailyEarnings()
    };
}

function calculatePlayTime() {
    const firstPlay = localStorage.getItem('sodmaxFirstPlay');
    if (!firstPlay) {
        localStorage.setItem('sodmaxFirstPlay', Date.now());
        return '0 دقیقه';
    }
    
    const minutes = Math.floor((Date.now() - parseInt(firstPlay)) / 60000);
    
    if (minutes < 60) {
        return `${minutes} دقیقه`;
    } else if (minutes < 1440) {
        return `${Math.floor(minutes / 60)} ساعت`;
    } else {
        return `${Math.floor(minutes / 1440)} روز`;
    }
}

function calculateMiningEfficiency() {
    if (!gameData.totalMined || gameData.totalMined === 0) return 0;
    
    const firstPlay = parseInt(localStorage.getItem('sodmaxFirstPlay') || Date.now());
    const minutes = Math.max(1, (Date.now() - firstPlay) / 60000);
    
    return Math.floor(gameData.totalMined / minutes);
}

function getAchievements() {
    const achievements = [];
    
    if (gameData.totalMined >= 1000) achievements.push('استخراج‌کننده مبتدی');
    if (gameData.totalMined >= 10000) achievements.push('استخراج‌کننده حرفه‌ای');
    if (gameData.totalMined >= 100000) achievements.push('استخراج‌کننده افسانه‌ای');
    if (gameData.userLevel >= 10) achievements.push('سطح بالا');
    if (gameData.userLevel >= 50) achievements.push('کاربر VIP');
    if (gameData.activePlan && gameData.activePlan.id === 4) achievements.push('صاحب پلن الماس');
    
    return achievements;
}

function getNextMilestone() {
    if (gameData.totalMined < 1000) {
        return { target: 1000, type: 'SOD', reward: 'دریافت 100 SOD اضافی' };
    } else if (gameData.totalMined < 10000) {
        return { target: 10000, type: 'SOD', reward: 'قدرت استخراج 2x به مدت 1 ساعت' };
    } else if (gameData.totalMined < 100000) {
        return { target: 100000, type: 'SOD', reward: 'دریافت 1 USDT رایگان' };
    } else {
        return { target: 1000000, type: 'SOD', reward: 'دسترسی به ویژگی‌های ویژه' };
    }
}

function calculateDailyEarnings() {
    const baseEarnings = gameData.miningPower * 3600 * 24; // فرض 24 ساعت کلیک
    let total = baseEarnings;
    
    // اعمال پلن
    if (gameData.activePlan) {
        total *= gameData.activePlan.multiplier;
    }
    
    // اعمال استخراج خودکار
    if (gameData.autoMining && gameData.activePlan) {
        total += gameData.activePlan.autoSpeed * 3600 * 24;
    }
    
    return Math.floor(total);
}

// ==================== بخش ۱۲: راه‌اندازی اولیه ====================
async function initializeGame() {
    console.log('🎮 شروع بازی SODMax...');
    
    // تنظیم نسخه بازی
    window.gameVersion = '3.0';
    
    // تنظیم وضعیت اولیه
    window.currentUser = null;
    window.isOfflineMode = false;
    window.supabaseConfigured = typeof supabase !== 'undefined';
    
    // بارگذاری بازی
    await loadGame();
    
    // بررسی احراز هویت
    await handleAuth();
    
    // تنظیم رویدادهای کلیک
    setupEventListeners();
    
    // شروع تایمرهای خودکار
    startTimers();
    
    // به‌روزرسانی اولیه UI
    updateUI();
    
    // نمایش پیام خوش‌آمدگویی
    setTimeout(() => {
        if (!window.currentUser) {
            showNotification('👋 به SODMax خوش آمدید!', 'برای ذخیره پیشرفت‌تان وارد حساب کاربری شوید.');
        }
    }, 2000);
    
    console.log('✅ بازی آماده است!');
}

function startTimers() {
    // تایمر خودکار استخراج
    setInterval(() => {
        if (gameData.autoMining && gameData.activePlan && gameData.activePlan.autoSpeed > 0) {
            const earnings = gameData.activePlan.autoSpeed;
            gameData.sodBalance += earnings;
            gameData.totalMined += earnings;
            gameData.todayEarnings += earnings;
            
            // به‌روزرسانی هر 10 ثانیه
            if (Date.now() % 10000 < 100) {
                saveGame();
                updateUI();
            }
        }
    }, 1000);
    
    // تایمر به‌روزرسانی وضعیت تقویت
    setInterval(() => {
        updateBoostStatus();
    }, 1000);
    
    // تایمر ذخیره‌سازی خودکار
    setInterval(() => {
        saveGame();
    }, 30000); // هر 30 ثانیه
    
    // تایمر همگام‌سازی با دیتابیس
    setInterval(() => {
        if (window.currentUser && !window.isOfflineMode) {
            syncLocalDataWithDatabase();
        }
    }, 60000); // هر 1 دقیقه
}

// ==================== بخش ۱۳: تابع‌های مربوط به شبکه ====================
async function checkNetworkStatus() {
    try {
        const online = navigator.onLine;
        
        if (!online) {
            window.isOfflineMode = true;
            showNotification('📡 قطع اتصال', 'اتصال اینترنت شما قطع شده است.');
            updateFloatingWidget();
            return false;
        }
        
        // بررسی اتصال به Supabase
        if (window.supabase && window.supabaseConfigured) {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('count')
                    .limit(1);
                
                if (error) throw error;
                
                window.isOfflineMode = false;
                
                // اگر قبلاً آفلاین بودیم، همگام‌سازی کن
                if (window.wasOffline) {
                    await syncLocalDataWithDatabase();
                    window.wasOffline = false;
                }
                
                return true;
            } catch (error) {
                window.isOfflineMode = true;
                window.wasOffline = true;
                updateFloatingWidget();
                return false;
            }
        }
        
        return online;
    } catch (error) {
        console.error('خطا در بررسی وضعیت شبکه:', error);
        return false;
    }
}

// ==================== بخش ۱۴: رویدادهای ویژه و فصلی ====================
function checkForSpecialEvents() {
    const now = new Date();
    const events = [];
    
    // رویداد سال نو
    if (now.getMonth() === 0 && now.getDate() === 1) {
        events.push({
            name: 'سال نو',
            bonus: 2.0,
            message: 'سال نو مبارک! استخراج ۲ برابر شده است!'
        });
    }
    
    // رویداد کریسمس
    if (now.getMonth() === 11 && now.getDate() >= 20 && now.getDate() <= 26) {
        events.push({
            name: 'کریسمس',
            bonus: 1.5,
            message: 'کریسمس مبارک! ۵۰٪ پاداش اضافی دریافت کنید!'
        });
    }
    
    // رویداد تعطیلات آخر هفته
    if (now.getDay() === 0 || now.getDay() === 6) {
        events.push({
            name: 'آخر هفته',
            bonus: 1.2,
            message: 'تعطیلات آخر هفته! ۲۰٪ پاداش اضافی'
        });
    }
    
    return events;
}

function applyEventBonuses(earnings) {
    const events = checkForSpecialEvents();
    
    events.forEach(event => {
        earnings *= event.bonus;
        showNotification(`🎉 ${event.name}`, event.message);
    });
    
    return earnings;
}

// ==================== بخش ۱۵: راه‌اندازی نهایی ====================
// صبر کن تا DOM کاملاً بارگذاری شود
document.addEventListener('DOMContentLoaded', function() {
    // صبر کن تا همه چیز بارگذاری شود
    window.addEventListener('load', async function() {
        console.log('🚀 بازی SODMax کاملاً بارگذاری شد');
        
        // راه‌اندازی بازی
        await initializeGame();
        
        // اعمال رویدادهای ویژه
        const events = checkForSpecialEvents();
        if (events.length > 0) {
            events.forEach(event => {
                showNotification(`🎊 ${event.name}`, event.message);
            });
        }
        
        // نمایش آمار اولیه با تاخیر
        setTimeout(() => {
            try {
                const stats = getGameStats();
                console.log('📊 آمار بازی:', stats);
            } catch (error) {
                console.warn('خطا در نمایش آمار:', error);
            }
        }, 3000);
        
        // بررسی دوره‌ای وضعیت شبکه
        setInterval(checkNetworkStatus, 30000);
        
        // رویدادهای آنلاین/آفلاین مرورگر
        window.addEventListener('online', () => {
            showNotification('📡 اتصال برقرار شد', 'در حال همگام‌سازی...');
            checkNetworkStatus();
        });
        
        window.addEventListener('offline', () => {
            showNotification('📡 قطع اتصال', 'شما در حالت آفلاین هستید.');
            window.isOfflineMode = true;
            updateFloatingWidget();
        });
    });
});

// ==================== بخش ۱۶: تابع‌های مربوط به توسعه و دیباگ ====================
// فقط در حالت توسعه فعال شود
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.enableCheats = function() {
        console.log('🔓 حالت تقلب فعال شد');
        
        window.cheats = {
            addSOD: function(amount) {
                gameData.sodBalance += amount;
                updateUI();
                saveGame();
                showNotification('🧪 تقلب', `${formatNumber(amount)} SOD اضافه شد.`);
            },
            
            addUSDT: function(amount) {
                gameData.usdtBalance += amount;
                updateUI();
                saveGame();
                showNotification('🧪 تقلب', `${formatNumber(amount)} USDT اضافه شد.`);
            },
            
            setLevel: function(level) {
                gameData.userLevel = level;
                updateUI();
                saveGame();
                showNotification('🧪 تقلب', `سطح به ${level} تنظیم شد.`);
            },
            
            unlockAllPlans: function() {
                gameData.activePlan = plans[3]; // پلن الماس
                updateUI();
                saveGame();
                showNotification('🧪 تقلب', 'همه پلن‌ها باز شدند.');
            },
            
            resetProgress: function() {
                resetGame();
            }
        };
        
        // اضافه کردن منوی تقلب به UI
        const cheatMenu = document.createElement('div');
        cheatMenu.id = 'cheatMenu';
        cheatMenu.innerHTML = `
            <style>
                #cheatMenu {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 10px;
                    border-radius: 5px;
                    z-index: 9999;
                    font-size: 12px;
                }
                .cheat-btn {
                    background: #ff5722;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    margin: 2px;
                    border-radius: 3px;
                    cursor: pointer;
                }
            </style>
            <strong>🧪 حالت توسعه</strong><br>
            <button class="cheat-btn" onclick="window.cheats.addSOD(1000)">+1K SOD</button>
            <button class="cheat-btn" onclick="window.cheats.addUSDT(100)">+100 USDT</button>
            <button class="cheat-btn" onclick="window.cheats.unlockAllPlans()">بازکردن پلن‌ها</button>
            <button class="cheat-btn" onclick="window.cheats.resetProgress()">ریست</button>
        `;
        
        document.body.appendChild(cheatMenu);
    };
    
    // فعال کردن خودکار در لوکال‌هاست
    setTimeout(() => {
        if (typeof window.enableCheats === 'function') {
            window.enableCheats();
        }
    }, 3000);
}

// ==================== بخش ۱۷: تابع‌های مربوط به پروفایل کاربر ====================
async function updateUserProfile(username, avatarUrl) {
    if (!window.currentUser || window.isOfflineMode) {
        showNotification('⚠️ خطا', 'برای ویرایش پروفایل باید آنلاین باشید.');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('users')
            .update({
                username: username,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', window.currentUser.id);
        
        if (error) throw error;
        
        showNotification('✅ موفق', 'پروفایل با موفقیت به‌روزرسانی شد.');
    } catch (error) {
        console.error('خطا در به‌روزرسانی پروفایل:', error);
        showNotification('❌ خطا', 'خطا در به‌روزرسانی پروفایل.');
    }
}

async function changePassword(currentPassword, newPassword) {
    if (!window.currentUser || window.isOfflineMode) {
        showNotification('⚠️ خطا', 'برای تغییر رمز عبور باید آنلاین باشید.');
        return;
    }
    
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        showNotification('✅ موفق', 'رمز عبور با موفقیت تغییر یافت.');
    } catch (error) {
        console.error('خطا در تغییر رمز عبور:', error);
        showNotification('❌ خطا', 'خطا در تغییر رمز عبور.');
    }
}

// ==================== پایان فایل game-main.js ====================
