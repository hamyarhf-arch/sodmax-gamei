// مدیریت فرم‌های ورود/ثبت‌نام
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
            
            const success = await signIn(email, password);
            if (success) {
                closeAuthModal();
            }
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
            
            const success = await signUp(email, password, username);
            if (success) {
                closeAuthModal();
            }
        }
    });
    
    // بررسی وضعیت ورود کاربر
    setTimeout(async () => {
        const isAuthenticated = await handleAuth();
        
        if (isAuthenticated) {
            // تغییر دکمه‌های ناوبری
            updateNavForLoggedInUser();
        }
    }, 1000);
});

// آپدیت ناوبری برای کاربر واردشده
function updateNavForLoggedInUser() {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.innerHTML = '<i class="fas fa-user"></i> پنل کاربری';
        connectBtn.onclick = showUserPanel;
    }
}

// نمایش پنل کاربری
function showUserPanel() {
    const panelHTML = `
        <div class="modal-overlay" id="userPanelModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>پنل کاربری</h3>
                    <button class="modal-close" onclick="closeUserPanel()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="user-info-card">
                        <div class="user-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="user-details">
                            <h4>${currentUser?.email || 'کاربر'}</h4>
                            <p>سطح: ${gameData.userLevel}</p>
                            <p>عضویت از: ${new Date().toLocaleDateString('fa-IR')}</p>
                        </div>
                    </div>
                    
                    <div class="user-stats">
                        <div class="stat-item">
                            <i class="fas fa-coins"></i>
                            <span>${formatNumber(gameData.sodBalance)} SOD</span>
                            <small>موجودی SOD</small>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-gem"></i>
                            <span>${gameData.usdtBalance.toFixed(2)} USDT</span>
                            <small>موجودی USDT</small>
                        </div>
                    </div>
                    
                    <div class="user-actions">
                        <button class="btn btn-outline btn-block" onclick="showWalletSection()">
                            <i class="fas fa-wallet"></i>
                            مدیریت کیف پول
                        </button>
                        
                        <button class="btn btn-outline btn-block" onclick="showTransactions()">
                            <i class="fas fa-history"></i>
                            تاریخچه تراکنش‌ها
                        </button>
                        
                        <button class="btn btn-outline btn-block" onclick="showPlans()">
                            <i class="fas fa-crown"></i>
                            پلن‌های من
                        </button>
                        
                        <button class="btn btn-outline btn-block" onclick="showReferrals()">
                            <i class="fas fa-users"></i>
                            دعوت از دوستان
                        </button>
                        
                        <button class="btn btn-error btn-block" onclick="signOut()">
                            <i class="fas fa-sign-out-alt"></i>
                            خروج از حساب
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', panelHTML);
}

function closeUserPanel() {
    const modal = document.getElementById('userPanelModal');
    if (modal) modal.remove();
}

// اتصال کیف پول واقعی
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts.length > 0) {
                const walletAddress = accounts[0];
                
                // ذخیره آدرس کیف پول در دیتابیس
                if (currentUser) {
                    await supabase
                        .from('users')
                        .update({ wallet_address: walletAddress })
                        .eq('id', currentUser.id);
                }
                
                showNotification('🔗 کیف پول متصل شد', `آدرس: ${walletAddress.substring(0, 8)}...`);
                closeAuthModal();
            }
        } catch (error) {
            console.error('خطا در اتصال کیف پول:', error);
            showNotification('❌ خطا', 'اتصال کیف پول ناموفق بود');
        }
    } else {
        showNotification('⚠️ کیف پول یافت نشد', 'لطفا MetaMask یا Trust Wallet را نصب کنید');
    }
}
