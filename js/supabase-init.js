/**
 * فایل تنظیمات اولیه Supabase
 * این فایل فقط یکبار اجرا می‌شود و Supabase رو راه‌اندازی می‌کند
 */

(function() {
    // جلوگیری از اجرای دوباره
    if (window.supabaseConfigured) {
        console.log('✅ Supabase قبلاً راه‌اندازی شده است');
        return;
    }
    
    console.log('🚀 در حال راه‌اندازی Supabase...');
    
    // ==================== تنظیمات Supabase ====================
    // ❗️ مهم: این مقادیر رو با اطلاعات پروژه خودت جایگزین کن
    
    // URL پروژه Supabase (مثل: https://xxxxxxxxxxxxxx.supabase.co)
    const SUPABASE_URL = 'https://vlulmfsqlfdooqwpmzdj.supabase.co';
    
    // کلید anon (در Settings > API از پنل Supabase پیدا کن)
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdWxtZnNxbGZkb29xd3BtemRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTE4MTEsImV4cCI6MjA4MTYyNzgxMX0.qASXAyRGzydl1_DiJngYxk-NG3_1w6zd8gutJdxqJEk';
    
    // ==================== بررسی تنظیمات ====================
    if (SUPABASE_URL.includes('your-project-id') || SUPABASE_ANON_KEY.includes('your-anon-key')) {
        console.error('❌ خطا: لطفاً تنظیمات Supabase رو کامل کن');
        console.warn('📝 آموزش:');
        console.warn('1. به supabase.com برو و ثبت‌نام کن');
        console.warn('2. یک پروژه جدید بساز');
        console.warn('3. از Settings > API، URL و anon key رو کپی کن');
        console.warn('4. مقادیر بالا رو در این فایل جایگزین کن');
        
        // حالت توسعه - می‌تونی این بخش رو غیرفعال کنی
        console.warn('⚠️ در حال اجرا در حالت توسعه (بدون دیتابیس)');
        
        // ساخت Supabase ساختگی برای جلوگیری از خطا
        window.supabase = {
            auth: {
                getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                signUp: () => Promise.resolve({ data: null, error: new Error('لطفاً تنظیمات Supabase رو کامل کن') }),
                signInWithPassword: () => Promise.resolve({ data: null, error: new Error('لطفاً تنظیمات Supabase رو کامل کن') }),
                signOut: () => Promise.resolve({ error: null })
            },
            from: () => ({
                select: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({ data: null, error: null })
                    })
                }),
                insert: () => Promise.resolve({ error: null }),
                update: () => ({
                    eq: () => Promise.resolve({ error: null })
                }),
                upsert: () => Promise.resolve({ error: null })
            })
        };
        
        window.supabaseConfigured = true;
        window.currentUser = null;
        window.isOfflineMode = true;
        console.log('⚠️ Supabase در حالت توسعه اجرا شد');
        return;
    }
    
    // ==================== راه‌اندازی Supabase واقعی ====================
    try {
        // بررسی اینکه کتابخانه Supabase لود شده
        if (typeof supabase === 'undefined') {
            console.error('❌ کتابخانه Supabase لود نشده است');
            console.log('📦 در حال لود کردن کتابخانه...');
            
            // تلاش برای لود کردن کتابخانه
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js';
            script.onload = () => {
                console.log('✅ کتابخانه Supabase لود شد');
                initSupabase();
            };
            script.onerror = () => {
                console.error('❌ خطا در لود کردن کتابخانه Supabase');
                createMockSupabase();
            };
            document.head.appendChild(script);
        } else {
            initSupabase();
        }
        
        function initSupabase() {
            try {
                // ایجاد کلاینت Supabase
                window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    },
                    db: {
                        schema: 'public'
                    },
                    global: {
                        headers: {
                            'X-Client-Info': 'sodmax-pro'
                        }
                    }
                });
                
                // ذخیره تنظیمات
                window.SUPABASE_URL = SUPABASE_URL;
                window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
                window.supabaseConfigured = true;
                window.currentUser = null;
                window.isOfflineMode = false;
                
                console.log('✅ Supabase با موفقیت راه‌اندازی شد');
                console.log('🔗 URL:', SUPABASE_URL.substring(0, 30) + '...');
                
                // تست اتصال
                testConnection();
                
            } catch (error) {
                console.error('❌ خطا در راه‌اندازی Supabase:', error);
                createMockSupabase();
            }
        }
        
        function testConnection() {
            // تست ساده اتصال
            setTimeout(async () => {
                try {
                    const { data, error } = await supabase.auth.getSession();
                    if (error) {
                        console.warn('⚠️ اتصال به Supabase دارای مشکل:', error.message);
                        window.isOfflineMode = true;
                    } else {
                        console.log('🔗 اتصال به Supabase موفقیت‌آمیز بود');
                        window.isOfflineMode = false;
                        if (data.session) {
                            console.log('👤 کاربر وارد شده:', data.session.user.email);
                            window.currentUser = data.session.user;
                        }
                    }
                } catch (testError) {
                    console.warn('⚠️ تست اتصال با خطا مواجه شد:', testError.message);
                    window.isOfflineMode = true;
                }
            }, 1000);
        }
        
        function createMockSupabase() {
            // ایجاد Supabase ساختگی برای حالت آفلاین/توسعه
            console.warn('⚠️ ایجاد Supabase ساختگی (حالت آفلاین)');
            
            window.supabase = {
                auth: {
                    getSession: () => Promise.resolve({ 
                        data: { session: null }, 
                        error: null 
                    }),
                    signUp: (credentials) => {
                        console.log('📝 ثبت‌نام در حالت آفلاین:', credentials.email);
                        return Promise.resolve({ 
                            data: { 
                                user: { 
                                    id: 'offline-' + Date.now(),
                                    email: credentials.email,
                                    user_metadata: { username: credentials.options?.data?.username }
                                } 
                            }, 
                            error: null 
                        });
                    },
                    signInWithPassword: (credentials) => {
                        console.log('🔐 ورود در حالت آفلاین:', credentials.email);
                        return Promise.resolve({ 
                            data: { 
                                user: { 
                                    id: 'offline-user',
                                    email: credentials.email
                                },
                                session: {
                                    user: {
                                        id: 'offline-user',
                                        email: credentials.email
                                    }
                                }
                            }, 
                            error: null 
                        });
                    },
                    signOut: () => {
                        console.log('👋 خروج در حالت آفلاین');
                        window.currentUser = null;
                        return Promise.resolve({ error: null });
                    }
                },
                from: (tableName) => {
                    console.log(`📊 دسترسی به جدول ${tableName} (آفلاین)`);
                    
                    return {
                        select: () => ({
                            eq: () => ({
                                single: () => Promise.resolve({ 
                                    data: null, 
                                    error: null 
                                }),
                                limit: (count) => Promise.resolve({ 
                                    data: [], 
                                    error: null 
                                })
                            }),
                            order: () => ({
                                limit: (count) => Promise.resolve({ 
                                    data: [], 
                                    error: null 
                                })
                            })
                        }),
                        insert: (data) => {
                            console.log(`➕ درج داده در ${tableName}:`, data);
                            return Promise.resolve({ error: null });
                        },
                        update: (data) => ({
                            eq: () => Promise.resolve({ error: null })
                        }),
                        upsert: (data) => {
                            console.log(`🔄 آپدیت/درج در ${tableName}:`, data);
                            return Promise.resolve({ error: null });
                        }
                    };
                }
            };
            
            window.supabaseConfigured = true;
            window.currentUser = null;
            window.isOfflineMode = true;
            
            console.log('✅ حالت آفلاین فعال شد - کاربران می‌توانند بازی کنند اما داده‌ها ذخیره نمی‌شوند');
        }
        
    } catch (error) {
        console.error('❌ خطای غیرمنتظره در راه‌اندازی Supabase:', error);
        createMockSupabase();
    }
    
    // ==================== توابع کمکی ====================
    
    /**
     * بررسی می‌کند که Supabase به درستی راه‌اندازی شده
     */
    window.isSupabaseReady = function() {
        return window.supabaseConfigured && window.supabase;
    };
    
    /**
     * دریافت وضعیت کاربر فعلی
     */
    window.getCurrentUser = function() {
        return window.currentUser;
    };
    
    /**
     * بررسی می‌کند که آیا کاربر وارد شده است
     */
    window.isUserLoggedIn = function() {
        return !!window.currentUser;
    };
    
    /**
     * تنظیم کاربر فعلی
     */
    window.setCurrentUser = function(user) {
        window.currentUser = user;
    };
    
    /**
     * دریافت کلاینت Supabase
     */
    window.getSupabaseClient = function() {
        return window.supabase;
    };
    
    /**
     * بررسی حالت آفلاین
     */
    window.isOfflineMode = function() {
        return window.isOfflineMode;
    };
    
    // ==================== رویدادهای Supabase ====================
    
    // گوش دادن به تغییرات وضعیت احراز هویت
    if (window.supabase && window.supabase.auth) {
        window.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 تغییر وضعیت احراز هویت:', event);
            
            if (event === 'SIGNED_IN' && session) {
                window.currentUser = session.user;
                window.isOfflineMode = false;
                console.log('👤 کاربر وارد شد:', session.user.email);
                
                // نمایش نوتیفیکیشن
                if (window.showNotification) {
                    window.showNotification('👋 خوش آمدید', `با موفقیت وارد شدید ${session.user.email}`);
                }
            } 
            else if (event === 'SIGNED_OUT') {
                window.currentUser = null;
                console.log('👋 کاربر خارج شد');
                
                // نمایش نوتیفیکیشن
                if (window.showNotification) {
                    window.showNotification('👋 خدانگهدار', 'با موفقیت خارج شدید');
                }
            }
            else if (event === 'USER_UPDATED') {
                console.log('🔄 اطلاعات کاربر آپدیت شد');
            }
        });
    }
    
    // ==================== لاگ نهایی ====================
    console.log('🎉 راه‌اندازی Supabase تکمیل شد');
    console.log('📝 دستورات:');
    console.log('  - window.isSupabaseReady() - بررسی وضعیت');
    console.log('  - window.getCurrentUser() - دریافت کاربر');
    console.log('  - window.isUserLoggedIn() - بررسی ورود');
    console.log('  - window.getSupabaseClient() - دریافت کلاینت');
    console.log('  - window.isOfflineMode() - بررسی حالت آفلاین');
    
})();
