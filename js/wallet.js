// مدیریت کیف پول داخلی
class WalletManager {
    constructor() {
        this.balance = {
            usdt: 0,
            sod: 0
        };
        this.transactions = [];
        this.initialized = false;
    }

    async init() {
        if (!currentUser) return;
        
        // بارگذاری موجودی از دیتابیس
        await this.loadBalance();
        this.initialized = true;
    }

    async loadBalance() {
        try {
            const { data, error } = await supabase
                .from('user_game_data')
                .select('usdt_balance, sod_balance')
                .eq('user_id', currentUser.id)
                .single();

            if (!error && data) {
                this.balance.usdt = parseFloat(data.usdt_balance) || 0;
                this.balance.sod = data.sod_balance || 0;
            }
        } catch (error) {
            console.error('خطا در بارگذاری موجودی:', error);
        }
    }

    // واریز به کیف پول
    async deposit(amount, currency = 'usdt', method = 'manual') {
        if (!currentUser) return false;

        try {
            // ثبت تراکنش
            const { error } = await supabase
                .from('wallet_transactions')
                .insert([
                    {
                        user_id: currentUser.id,
                        amount: amount,
                        currency: currency.toUpperCase(),
                        type: 'deposit',
                        status: 'pending',
                        network: method,
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;

            // آپدیت موجودی
            if (currency === 'usdt') {
                this.balance.usdt += amount;
                gameData.usdtBalance += amount;
                
                await supabase
                    .from('user_game_data')
                    .update({ 
                        usdt_balance: this.balance.usdt,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', currentUser.id);
            } else if (currency === 'sod') {
                this.balance.sod += amount;
                gameData.sodBalance += amount;
                
                await supabase
                    .from('user_game_data')
                    .update({ 
                        sod_balance: this.balance.sod,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', currentUser.id);
            }

            // ثبت فعالیت
            await supabase
                .from('user_activity')
                .insert([
                    {
                        user_id: currentUser.id,
                        activity_type: 'deposit',
                        details: { 
                            amount: amount, 
                            currency: currency,
                            method: method,
                            time: new Date().toISOString() 
                        }
                    }
                ]);

            updateUI();
            showNotification('💰 واریز موفق', `${amount} ${currency.toUpperCase()} به کیف پول شما واریز شد`);
            
            return true;
        } catch (error) {
            console.error('خطا در واریز:', error);
            showNotification('❌ خطا', 'واریز ناموفق بود');
            return false;
        }
    }

    // برداشت از کیف پول
    async withdraw(amount, currency = 'usdt', address) {
        if (!currentUser) return false;

        // بررسی موجودی کافی
        if ((currency === 'usdt' && this.balance.usdt < amount) ||
            (currency === 'sod' && this.balance.sod < amount)) {
            showNotification('⚠️ خطا', 'موجودی کافی نیست');
            return false;
        }

        try {
            // ثبت تراکنش
            const { error } = await supabase
                .from('wallet_transactions')
                .insert([
                    {
                        user_id: currentUser.id,
                        amount: amount,
                        currency: currency.toUpperCase(),
                        type: 'withdraw',
                        status: 'pending',
                        network: 'TRON',
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;

            // کسر از موجودی
            if (currency === 'usdt') {
                this.balance.usdt -= amount;
                gameData.usdtBalance -= amount;
                
                await supabase
                    .from('user_game_data')
                    .update({ 
                        usdt_balance: this.balance.usdt,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', currentUser.id);
            } else if (currency === 'sod') {
                this.balance.sod -= amount;
                gameData.sodBalance -= amount;
                
                await supabase
                    .from('user_game_data')
                    .update({ 
                        sod_balance: this.balance.sod,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', currentUser.id);
            }

            showNotification('⏳ درخواست برداشت ثبت شد', 'برداشت شما در حال بررسی است');
            
            // در اینجا باید به API پرداخت وصل شوید
            // simulateWithdrawToWallet(address, amount, currency);
            
            return true;
        } catch (error) {
            console.error('خطا در برداشت:', error);
            showNotification('❌ خطا', 'برداشت ناموفق بود');
            return false;
        }
    }

    // دریافت تراکنش‌های کیف پول
    async getTransactions(limit = 10) {
        if (!currentUser) return [];

        try {
            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('خطا در دریافت تراکنش‌ها:', error);
            return [];
        }
    }

    // نمایش بخش کیف پول
    showWalletSection() {
        const walletHTML = `
            <div class="modal-overlay" id="walletModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>💰 کیف پول داخلی</h3>
                        <button class="modal-close" onclick="closeWalletModal()">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="wallet-balances">
                            <div class="balance-card usdt">
                                <div class="balance-icon">
                                    <i class="fab fa-usdt"></i>
                                </div>
                                <div class="balance-info">
                                    <div class="balance-label">موجودی USDT</div>
                                    <div class="balance-amount">${this.balance.usdt.toFixed(2)} USDT</div>
                                </div>
                            </div>
                            
                            <div class="balance-card sod">
                                <div class="balance-icon">
                                    <i class="fas fa-coins"></i>
                                </div>
                                <div class="balance-info">
                                    <div class="balance-label">موجودی SOD</div>
                                    <div class="balance-amount">${formatNumber(this.balance.sod)} SOD</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="wallet-actions">
                            <button class="btn btn-success btn-block" onclick="showDepositModal()">
                                <i class="fas fa-plus-circle"></i>
                                واریز به کیف پول
                            </button>
                            
                            <button class="btn btn-outline btn-block" onclick="showWithdrawModal()">
                                <i class="fas fa-arrow-up"></i>
                                برداشت از کیف پول
                            </button>
                        </div>
                        
                        <div class="wallet-transactions">
                            <h4>آخرین تراکنش‌ها</h4>
                            <div id="walletTransactionsList">
                                <!-- تراکنش‌ها اینجا نمایش داده می‌شوند -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', walletHTML);
        this.loadWalletTransactions();
    }
    
    async loadWalletTransactions() {
        const transactions = await this.getTransactions(5);
        const list = document.getElementById('walletTransactionsList');
        
        if (!list) return;
        
        if (transactions.length === 0) {
            list.innerHTML = '<p class="empty-state">تراکنشی یافت نشد</p>';
            return;
        }
        
        list.innerHTML = transactions.map(tx => `
            <div class="transaction-item ${tx.type}">
                <div class="tx-icon">
                    ${tx.type === 'deposit' ? '⬇️' : tx.type === 'withdraw' ? '⬆️' : '💰'}
                </div>
                <div class="tx-details">
                    <div class="tx-type">${this.getTransactionTypeLabel(tx.type)}</div>
                    <div class="tx-time">${new Date(tx.created_at).toLocaleString('fa-IR')}</div>
                </div>
                <div class="tx-amount ${tx.type}">
                    ${tx.type === 'deposit' ? '+' : '-'}${tx.amount} ${tx.currency}
                </div>
            </div>
        `).join('');
    }
    
    getTransactionTypeLabel(type) {
        const labels = {
            'deposit': 'واریز',
            'withdraw': 'برداشت',
            'reward': 'پاداش',
            'purchase': 'خرید'
        };
        return labels[type] || type;
    }
}

function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) modal.remove();
}

function showDepositModal() {
    const depositHTML = `
        <div class="modal-overlay" id="depositModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💵 واریز به کیف پول</h3>
                    <button class="modal-close" onclick="closeDepositModal()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="deposit-methods">
                        <div class="method-card" onclick="selectDepositMethod('usdt')">
                            <i class="fab fa-usdt"></i>
                            <span>واریز USDT</span>
                            <small>شبکه TRON (TRC20)</small>
                        </div>
                        
                        <div class="method-card" onclick="selectDepositMethod('sod')">
                            <i class="fas fa-coins"></i>
                            <span>واریز SOD</span>
                            <small>فقط برای کاربران ویژه</small>
                        </div>
                    </div>
                    
                    <div id="depositForm" style="display: none;">
                        <div class="form-group">
                            <label>مبلغ (USDT)</label>
                            <input type="number" id="depositAmount" min="1" step="0.1" placeholder="10">
                        </div>
                        
                        <div class="wallet-address">
                            <label>آدرس کیف پول ما</label>
                            <div class="address-box">
                                <code id="depositAddress">Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
                                <button onclick="copyAddress()">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <small class="warning">⚠️ فقط به این آدرس واریز کنید</small>
                        </div>
                        
                        <button class="btn btn-primary btn-block" onclick="confirmDeposit()">
                            <i class="fas fa-check"></i>
                            تایید واریز
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', depositHTML);
}

function closeDepositModal() {
    const modal = document.getElementById('depositModal');
    if (modal) modal.remove();
    
    const walletModal = document.getElementById('walletModal');
    if (walletModal) walletModal.remove();
}

// ایجاد نمونه Wallet Manager
const walletManager = new WalletManager();
window.walletManager = walletManager;
window.showWalletSection = () => walletManager.showWalletSection();
