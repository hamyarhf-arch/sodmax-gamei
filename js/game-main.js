function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginTab = document.querySelector('.auth-tabs button:nth-child(1)');
    const signupTab = document.querySelector('.auth-tabs button:nth-child(2)');
    
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
    document.getElementById('sodBalance').textContent = formatNumber(gameData.sodBalance);
    document.getElementById('usdtBalance').textContent = formatNumber(gameData.usdtBalance);
    document.getElementById('todayEarnings').textContent = formatNumber(gameData.todayEarnings);
    document.getElementById('totalMined').textContent = formatNumber(gameData.totalMined);
    document.getElementById('miningPower').textContent = formatNumber(gameData.miningPower);
    document.getElementById('userLevel').textContent = gameData.userLevel;
    
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
    }
}

function updateTransactionsList() {
    const container = document.getElementById('transactionsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (gameData.transactions.length === 0) {
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
        floatingText.remove();
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
document.addEventListener('DOMContentLoaded', async function() {
    // بارگذاری بازی
    await loadGame();
    
    // بررسی احراز هویت
    await handleAuth();
    
    // به‌روزرسانی UI
    updateUI();
    
    // شروع تایمرهای خودکار
    startTimers();
    
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
            const planId = parseInt(this.closest('.plan-card').dataset.planId);
            activatePlan(planId);
        });
    });
    
    // تنظیم فرم‌های احراز هویت
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
});

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
        if (window.currentUser && !window.isOfflineMode) {
            // غیرفعال کردن همه پلن‌ها
            if (window.supabase) {
                supabase
                    .from('user_plans')
                    .update({ is_active: false })
                    .eq('user_id', window.currentUser.id);
            }
        }
        
        saveGame();
        updateUI();
        
        showNotification('🔄 بازنشانی', 'بازی با موفقیت بازنشانی شد.');
    }
}

// ==================== بخش ۱۱: راه‌اندازی اولیه ====================
// صبر کن تا DOM کاملاً بارگذاری شود
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

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
    setupClickEvents();
    
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

function setupClickEvents() {
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

// ==================== بخش ۱۲: تابع‌های مربوط به شبکه ====================
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

// ==================== بخش ۱۳: تابع‌های مربوط به توسعه و دیباگ ====================
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
            <button class="cheat-btn" onclick="cheats.addSOD(1000)">+1K SOD</button>
            <button class="cheat-btn" onclick="cheats.addUSDT(100)">+100 USDT</button>
            <button class="cheat-btn" onclick="cheats.unlockAllPlans()">بازکردن پلن‌ها</button>
            <button class="cheat-btn" onclick="cheats.resetProgress()">ریست</button>
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

// ==================== بخش ۱۴: تابع‌های آماری و گزارش‌گیری ====================
function getGameStats() {
    return {
        version: window.gameVersion,
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
    if (gameData.totalMined === 0) return 0;
    
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

// ==================== بخش ۱۵: تابع‌های مربوط به پروفایل کاربر ====================
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

// ==================== بخش ۱۶: رویدادهای ویژه و فصلی ====================
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

// ==================== بخش ۱۷: راه‌اندازی نهایی ====================
// صبر کن تا همه چیز بارگذاری شود
window.addEventListener('load', function() {
    console.log('🚀 بازی SODMax کاملاً بارگذاری شد');
    
    // اعمال رویدادهای ویژه
    const events = checkForSpecialEvents();
    if (events.length > 0) {
        events.forEach(event => {
            showNotification(`🎊 ${event.name}`, event.message);
        });
    }
    
    // نمایش آمار اولیه
    setTimeout(() => {
        const stats = getGameStats();
        console.log('📊 آمار بازی:', stats);
    }, 5000);
});

// ==================== پایان فایل game-main.js ====================
