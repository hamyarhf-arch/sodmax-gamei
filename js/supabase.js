// تنظیمات Supabase
const SUPABASE_URL = 'https://vlulmfsqlfdooqwpmzdj.supabase.co'; // جایگزین کن
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdWxtZnNxbGZkb29xd3BtemRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTE4MTEsImV4cCI6MjA4MTYyNzgxMX0.qASXAyRGzydl1_DiJngYxk-NG3_1w6zd8gutJdxqJEk'; // جایگزین کن

// ایجاد کلاینت Supabase
const supabase = window.supabase || supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// بررسی وضعیت کاربر
let currentUser = null;

// تابع ورود/ثبت‌نام
async function handleAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        await loadUserData(currentUser.id);
        return true;
    } else {
        showLoginModal();
        return false;
    }
}

// ثبت‌نام کاربر
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

            currentUser = data.user;
            showNotification('🎉 ثبت‌نام موفق', 'حساب کاربری شما با موفقیت ایجاد شد!');
            return true;
        }
    } catch (error) {
        console.error('خطا در ثبت‌نام:', error);
        showNotification('❌ خطا در ثبت‌نام', error.message);
        return false;
    }
}

// ورود کاربر
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (data.user) {
            currentUser = data.user;
            
            // آپدیت زمان آخرین ورود
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', currentUser.id);

            await loadUserData(currentUser.id);
            showNotification('👋 خوش آمدید', 'با موفقیت وارد شدید!');
            return true;
        }
    } catch (error) {
        console.error('خطا در ورود:', error);
        showNotification('❌ خطا در ورود', 'ایمیل یا رمز عبور نادرست است');
        return false;
    }
}

// خروج کاربر
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        gameData.sodBalance = 0;
        gameData.usdtBalance = 0;
        gameData.todayEarnings = 0;
        updateUI();
        
        showNotification('👋 خدانگهدار', 'با موفقیت خارج شدید');
        setTimeout(() => {
            showLoginModal();
        }, 1000);
    } catch (error) {
        console.error('خطا در خروج:', error);
    }
}

// بارگذاری داده‌های کاربر
async function loadUserData(userId) {
    try {
        // دریافت داده‌های بازی کاربر
        const { data: gameDataDB, error: gameError } = await supabase
            .from('user_game_data')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (gameError) throw gameError;

        // آپدیت داده‌های بازی محلی
        if (gameDataDB) {
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
        saveGame(); // ذخیره محلی برای آفلاین

        // ثبت فعالیت ورود
        await supabase
            .from('user_activity')
            .insert([
                {
                    user_id: userId,
                    activity_type: 'login',
                    details: { time: new Date().toISOString() }
                }
            ]);

    } catch (error) {
        console.error('خطا در بارگذاری داده‌های کاربر:', error);
    }
}

// ذخیره داده‌های بازی در دیتابیس
async function saveGameToDatabase() {
    if (!currentUser) return;

    try {
        const { error } = await supabase
            .from('user_game_data')
            .upsert([
                {
                    user_id: currentUser.id,
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

// ذخیره تراکنش در دیتابیس
async function saveTransactionToDB(description, amount, type) {
    if (!currentUser) return;

    try {
        const { error } = await supabase
            .from('transactions')
            .insert([
                {
                    user_id: currentUser.id,
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

// بارگذاری تراکنش‌های کاربر
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

// خرید پلن در دیتابیس
async function savePlanPurchase(plan) {
    if (!currentUser) return;

    try {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 ماه اعتبار

        const { error } = await supabase
            .from('user_plans')
            .insert([
                {
                    user_id: currentUser.id,
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
            .eq('user_id', currentUser.id)
            .neq('plan_id', plan.id);

        // ثبت فعالیت
        await supabase
            .from('user_activity')
            .insert([
                {
                    user_id: currentUser.id,
                    activity_type: 'plan_purchase',
                    details: { 
                        plan_name: plan.name, 
                        price: plan.price,
                        time: new Date().toISOString() 
                    }
                }
            ]);

    } catch (error) {
        console.error('خطا در ذخیره خرید پلن:', error);
    }
}

// مودال ورود/ثبت‌نام
function showLoginModal() {
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

// بستن مودال
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.remove();
}

// تغییر تب ورود/ثبت‌نام
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    document.querySelector(`.auth-tab[onclick*="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Form`).classList.add('active');
}

// صادر کردن توابع
window.supabaseClient = supabase;
window.handleAuth = handleAuth;
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.saveGameToDatabase = saveGameToDatabase;
window.saveTransactionToDB = saveTransactionToDB;
window.savePlanPurchase = savePlanPurchase;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
