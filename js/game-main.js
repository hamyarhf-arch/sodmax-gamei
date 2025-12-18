// ==================== بخش ۱: توابع ذخیره/بارگذاری پیشرفته ====================

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
    
    // ۳. ذخیره در IndexedDB برای پشتیبان اضافه (اختیاری)
    saveToIndexedDB();
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

/**
 * ذخیره در IndexedDB برای پشتیبان اضافه
 */
function saveToIndexedDB() {
    if (!window.indexedDB) return;
    
    try {
        const request = indexedDB.open('sodmax_backup', 1);
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('game_data')) {
                db.createObjectStore('game_data', { keyPath: 'id' });
            }
        };
        
        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['game_data'], 'readwrite');
            const store = transaction.objectStore('game_data');
            
            const backupData = {
                id: window.currentUser ? window.currentUser.id : 'guest',
                data: gameData,
                timestamp: Date.now(),
                version: '3.0'
            };
            
            store.put(backupData);
        };
        
    } catch (error) {
        console.warn('ذخیره در IndexedDB با خطا مواجه شد:', error);
    }
}

// ==================== بخش ۲: تغییر در init اصلی ====================

async function init() {
    console.log('🚀 در حال راه‌اندازی SODmAX Pro...');
    
    // ۱. ابتدا Supabase رو چک کن
    if (!window.supabase || !window.supabaseConfigured) {
        console.warn('⚠️ Supabase لود نشده است');
        showNotification('📡 حالت آفلاین', 'شما در حال حاضر در حالت آفلاین بازی می‌کنید.');
        window.isOfflineMode = true;
    }
    
    // ۲. احراز هویت
    const isAuthenticated = await handleAuth();
    
    // ۳. بارگذاری بازی (چه کاربر وارد شده باشه یا نه)
    await loadGame();
    
    // ۴. اگر کاربر وارد شده، همگام‌سازی کن
    if (isAuthenticated && !window.isOfflineMode) {
        setTimeout(() => {
            syncLocalDataWithDatabase();
        }, 3000);
    }
    
    // ۵. بقیه تنظیمات
    renderPlans();
    updateUI();
    setupEventListeners();
    startAutoMining();
    simulateLiveData();
    updateNetworkStats();
    
    // ۶. نمایش پیام مناسب
    if (isAuthenticated) {
        if (window.isOfflineMode) {
            showNotification("👋 خوش آمدید", "شما در حالت آفلاین وارد شدید. داده‌ها فقط محلی ذخیره می‌شوند.");
        } else {
            showNotification("🌟 سیستم استخراج آماده!", "با کلیک روی هسته مرکزی شروع به استخراج کنید.");
        }
    } else {
        showNotification("👋 به SODmAX Pro خوش آمدید!", "برای ذخیره دائمی داده‌ها، وارد شوید یا ثبت‌نام کنید.");
    }
}

// ==================== بخش ۳: تغییر در تابع handleAuth ====================

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

// ==================== بخش ۴: تغییر در تابع updateFloatingWidget ====================

function updateFloatingWidget(recentMined = 0) {
    const widget = document.getElementById('floatingWidget');
    if (!widget) return;
    
    const pulse = widget.querySelector('.pulse');
    const text = document.getElementById('widgetText');
    
    if (!pulse || !text) return;
    
    if (window.currentUser) {
        if (window.isOfflineMode) {
            text.textContent = "📡 حالت آفلاین - فقط ذخیره محلی";
            pulse.style.background = 'var(--warning)';
        } else if (gameData.autoMining) {
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
        text.textContent = "برای ذخیره دائمی، وارد شوید";
        pulse.style.background = 'var(--text-secondary)';
    }
}

// ==================== بخش ۵: مدیریت حالت آنلاین/آفلاین ====================

// تشخیص تغییر وضعیت اتصال اینترنت
window.addEventListener('online', () => {
    console.log('🌐 اتصال اینترنت برقرار شد');
    if (window.currentUser && window.supabaseConfigured) {
        showNotification('🌐 آنلاین شدید', 'اتصال به دیتابیس برقرار شد.');
        window.isOfflineMode = false;
        
        // سعی کن دوباره همگام‌سازی کنی
        setTimeout(() => {
            syncLocalDataWithDatabase();
        }, 2000);
    }
});

window.addEventListener('offline', () => {
    console.log('📡 اتصال اینترنت قطع شد');
    if (window.currentUser) {
        showNotification('📡 حالت آفلاین', 'اتصال اینترنت قطع شد. داده‌ها فقط محلی ذخیره می‌شوند.');
        enableOfflineMode();
    }
});

// ==================== بخش ۶: تغییر در signIn و signUp ====================

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
