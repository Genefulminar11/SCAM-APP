// db.js - LocalStorage Database Engine (Optimized & Unified)
const DB = {
  init() {
    if (!localStorage.getItem('app_users')) {
      localStorage.setItem('app_users', JSON.stringify([]));
    }
    if (!localStorage.getItem('app_transactions')) {
      localStorage.setItem('app_transactions', JSON.stringify([]));
    }
  },

  getUsers() {
    this.init();
    return JSON.parse(localStorage.getItem('app_users')) || [];
  },

  saveUsers(users) {
    localStorage.setItem('app_users', JSON.stringify(users));
  },

  getTransactions() {
    this.init();
    return JSON.parse(localStorage.getItem('app_transactions')) || [];
  },

  generateRefCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  registerUser(phone, password, refCodeInput) {
    const users = this.getUsers();

    if (users.find(u => u.phone === phone)) {
      return { success: false, message: 'Phone number is already registered.' };
    }

    const inviter = users.find(u => u.referralCode === refCodeInput);

    const newUser = {
      id: 'usr_' + Date.now(),
      firstName: '', // Can be populated if passed
      lastName: '',  // Can be populated if passed
      phone: phone,
      password: password,
      referralCode: this.generateRefCode(),
      referredBy: inviter ? inviter.id : null,
      balance: '0.00',
      totalCommission: '0.00',
      tasksCompleted: 0,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    return { success: true, user: newUser };
  },

  adminCreateUser(phone, password, refCodeInput) {
    return this.registerUser(phone, password, refCodeInput);
  },

  loginUser(phone, password) {
    const users = this.getUsers();
    const user = users.find(u => u.phone === phone);

    if (!user) {
      return { success: false, message: 'Phone number is not registered.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Incorrect password.' };
    }

    localStorage.setItem('current_user_id', user.id);
    return { success: true, user: user };
  },

  getCurrentUser() {
    const currentId = localStorage.getItem('current_user_id');
    if (!currentId) return null;

    const users = this.getUsers();
    const user = users.find(u => u.id === currentId);

    if (!user) return null;

    const team = users.filter(u => u.referredBy === user.id);

    return {
      ...user,
      teamCount: team.length
    };
  },

  updatePassword(currentPassword, newPassword) {
    const currentId = localStorage.getItem('current_user_id');
    if (!currentId) return { success: false, message: 'User not logged in.' };

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === currentId);

    if (userIndex === -1) {
      return { success: false, message: 'User not found.' };
    }

    if (users[userIndex].password !== currentPassword) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    users[userIndex].password = newPassword;
    this.saveUsers(users);

    return { success: true, message: 'Password updated successfully!' };
  },

  saveBankDetails(bankData) {
    const currentId = localStorage.getItem('current_user_id');
    if (!currentId) return { success: false, message: 'User not logged in.' };

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === currentId);

    if (userIndex === -1) {
      return { success: false, message: 'User not found.' };
    }

    if (!Array.isArray(users[userIndex].bankDetails)) {
      users[userIndex].bankDetails = [];
    }

    const newAccount = {
      id: 'acc_' + Date.now(),
      accountType: bankData.accountType,
      accountName: bankData.accountName,
      accountNumber: bankData.accountNumber,
      createdAt: new Date().toISOString()
    };

    users[userIndex].bankDetails.push(newAccount);
    this.saveUsers(users);

    return { success: true, message: 'Payment method added successfully!' };
  },

  getBankDetails() {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.bankDetails) return [];
    return Array.isArray(currentUser.bankDetails) ? currentUser.bankDetails : [currentUser.bankDetails];
  },

  getTeamMembers() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return [];

    const users = this.getUsers();
    return users.filter(u => u.referredBy === currentUser.id);
  },

  getTeamStats() {
    const members = this.getTeamMembers();
    const transactions = this.getTransactions();
    
    const totalCommissions = transactions
      .filter(tx => tx.type === 'Commission')
      .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

    return {
      totalMembers: members.length,
      totalCommissions: totalCommissions.toFixed(2),
      members: members
    };
  },

  getAvailableTasks() {
    const imageFiles = [
      'Notebook.jpg', 'Ballpen Set.jpg', 'Key Chain.jpg', 'Phone Stand.jpg', 'Cable Organizer.jpg',
      'USB Dust Plug.jpg', 'Screen Protector.jpg', 'Mini Notepad.jpg', 'Bookmark Clip.jpg', 'Sticker Pack.jpg',
      'Wireless Mouse.jpg', 'Phone Case.jpg', 'USB Cable.jpg', 'Earphone Case.jpg', 'Desk Mat.jpg',
      'Mini Fan.jpg', 'Card Holder.jpg', 'Stylus Pen.jpg', 'Cleaning Kit.jpg', 'Webcam Cover.jpg'
    ];

    return imageFiles.map((filename, index) => {
      const cleanTitle = filename.replace(/\.[^/.]+$/, '');
      const level = index < 10 ? 1 : Math.floor(index / 10) + 1;
      const price = level === 1 ? Math.floor(Math.random() * 50) + 30 : Math.floor(Math.random() * 1000) + 100;
      const commissionRate = 0.05;

      return {
        id: `tsk_${index + 1}`,
        title: cleanTitle,
        image: `images/${filename}`,
        price: price,
        commissionRate: commissionRate,
        level: level
      };
    });
  },

  getCurrentTaskForUser() {
    const user = this.getCurrentUser();
    if (!user) return null;

    const totalCompleted = user.tasksCompleted || 0;
    const currentLevel = Math.min(Math.floor(totalCompleted / 10) + 1, 9);
    const taskProgress = totalCompleted % 10;

    const tasks = this.getAvailableTasks();
    const task = tasks[totalCompleted % tasks.length];

    return {
      currentLevel,
      taskProgress,
      task,
      totalCompleted
    };
  },

  completeTask(taskId) {
    const currentId = localStorage.getItem('current_user_id');
    if (!currentId) return { success: false, message: 'User not logged in.' };

    const tasks = this.getAvailableTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === currentId);
    if (userIndex === -1) return { success: false, message: 'User not found.' };

    const user = users[userIndex];
    const currentBalance = parseFloat(user.balance || 0);

    if (currentBalance < task.price) {
      return { 
        success: false, 
        message: `Insufficient balance! You need ₱${task.price.toFixed(2)} to accept this order.` 
      };
    }

    const prevTotal = user.tasksCompleted || 0;
    const newTotal = prevTotal + 1;
    
    const prevLevel = Math.min(Math.floor(prevTotal / 10) + 1, 9);
    const newLevel = Math.min(Math.floor(newTotal / 10) + 1, 9);
    const leveledUp = newLevel > prevLevel;

    const commissionEarned = task.price * task.commissionRate;
    const newBalance = (currentBalance + commissionEarned).toFixed(2);
    const currentCommission = parseFloat(user.totalCommission || 0);
    const newCommission = (currentCommission + commissionEarned).toFixed(2);

    users[userIndex].balance = newBalance;
    users[userIndex].totalCommission = newCommission;
    users[userIndex].tasksCompleted = newTotal;
    this.saveUsers(users);

    const transactions = this.getTransactions();
    const newRecord = {
      id: `tx_${Date.now()}`,
      userId: currentId,
      type: 'Commission',
      amount: commissionEarned.toFixed(2),
      description: `Completed Order: ${task.title}`,
      status: 'Completed',
      balanceAfter: newBalance,
      withdrawableAfter: newCommission,
      createdAt: new Date().toISOString()
    };

    transactions.unshift(newRecord);
    localStorage.setItem('app_transactions', JSON.stringify(transactions));

    return {
      success: true,
      message: `Order completed! Earned ₱${commissionEarned.toFixed(2)} commission.`,
      commission: commissionEarned.toFixed(2),
      balance: newBalance,
      withdrawableBalance: newCommission,
      leveledUp: leveledUp,
      newLevel: newLevel
    };
  },

  getUserBalanceInfo() {
    const user = this.getCurrentUser();
    if (!user) return { balance: '0.00', withdrawableBalance: '0.00' };

    return {
      balance: parseFloat(user.balance || 0).toFixed(2),
      withdrawableBalance: parseFloat(user.totalCommission || 0).toFixed(2)
    };
  },

  requestTopUp(amount, refNumber, method = 'Bank/E-Wallet') {
    const currentId = localStorage.getItem('current_user_id');
    if (!currentId) return { success: false, message: 'User not logged in.' };

    const reqAmount = parseFloat(amount);
    if (isNaN(reqAmount) || reqAmount <= 0) {
      return { success: false, message: 'Please enter a valid amount.' };
    }

    if (!refNumber || refNumber.trim() === '') {
      return { success: false, message: 'Please enter the transaction reference number.' };
    }

    const transactions = this.getTransactions();
    const newTx = {
      id: `dep_${Date.now()}`,
      userId: currentId,
      type: 'Deposit',
      amount: reqAmount.toFixed(2),
      refNumber: refNumber.trim(),
      method: method,
      description: `Top Up via ${method} (Ref: ${refNumber.trim()})`,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    transactions.unshift(newTx);
    localStorage.setItem('app_transactions', JSON.stringify(transactions));

    return {
      success: true,
      message: `Top-up request of ₱${reqAmount.toFixed(2)} submitted successfully! Pending approval.`,
      transaction: newTx
    };
  },

  requestWithdrawal(amount, payoutMethod, accountName, accountNumber, withdrawPassword) {
    const currentId = localStorage.getItem('current_user_id');
    if (!currentId) return { success: false, message: 'User not logged in.' };

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === currentId);
    if (userIndex === -1) return { success: false, message: 'User not found.' };

    const user = users[userIndex];
    const withdrawable = parseFloat(user.totalCommission || 0);
    const reqAmount = parseFloat(amount);

    if (isNaN(reqAmount) || reqAmount <= 0) {
      return { success: false, message: 'Please enter a valid withdrawal amount.' };
    }

    if (reqAmount > withdrawable) {
      return { 
        success: false, 
        message: `Insufficient withdrawable balance! Available: ₱${withdrawable.toFixed(2)}` 
      };
    }

    if (user.withdrawPassword && user.withdrawPassword !== withdrawPassword) {
      return { success: false, message: 'Incorrect withdrawal password.' };
    }

    const newWithdrawable = (withdrawable - reqAmount).toFixed(2);
    const currentBalance = parseFloat(user.balance || 0);
    const newBalance = Math.max(0, currentBalance - reqAmount).toFixed(2);

    users[userIndex].totalCommission = newWithdrawable;
    users[userIndex].balance = newBalance;
    this.saveUsers(users);

    const transactions = this.getTransactions();
    const newTx = {
      id: `wd_${Date.now()}`,
      userId: currentId,
      type: 'Withdrawal',
      amount: reqAmount.toFixed(2),
      method: payoutMethod,
      description: `Payout via ${payoutMethod} (${accountNumber})`,
      status: 'Pending',
      balanceAfter: newBalance,
      withdrawableAfter: newWithdrawable,
      createdAt: new Date().toISOString()
    };

    transactions.unshift(newTx);
    localStorage.setItem('app_transactions', JSON.stringify(transactions));

    return {
      success: true,
      message: `Withdrawal request of ₱${reqAmount.toFixed(2)} submitted successfully!`,
      newBalance,
      newWithdrawable
    };
  },

  getOrderHistory() {
    const currentId = localStorage.getItem('current_user_id');
    if (!currentId) return [];
    return this.getTransactions().filter(tx => tx.userId === currentId && tx.type === 'Commission');
  },

  getTransactionsByStatus(status = 'All') {
    const transactions = this.getTransactions();
    if (status === 'All') return transactions;
    return transactions.filter(tx => tx.status === status);
  },

  getAllTransactions() {
    return this.getTransactions();
  },

  approveTopUp(txId) {
    const allTx = this.getTransactions();
    const txIndex = allTx.findIndex(t => t.id === txId);
    if (txIndex === -1) return { success: false, message: 'Transaction not found.' };

    const tx = allTx[txIndex];
    if (tx.status === 'Completed') {
      return { success: false, message: 'This transaction is already completed.' };
    }

    allTx[txIndex].status = 'Completed';
    localStorage.setItem('app_transactions', JSON.stringify(allTx));

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === tx.userId);
    if (userIndex !== -1) {
      const currentBalance = parseFloat(users[userIndex].balance || 0);
      const topUpAmount = parseFloat(tx.amount || 0);
      users[userIndex].balance = (currentBalance + topUpAmount).toFixed(2);
      this.saveUsers(users);
    }

    return { success: true, message: `Top up of ₱${tx.amount} approved and credited to wallet!` };
  },

  approveWithdrawal(txId) {
    const allTx = this.getTransactions();
    const txIndex = allTx.findIndex(t => t.id === txId);
    if (txIndex === -1) return { success: false, message: 'Transaction not found.' };

    const tx = allTx[txIndex];
    if (tx.status === 'Completed') {
      return { success: false, message: 'This withdrawal is already completed.' };
    }

    allTx[txIndex].status = 'Completed';
    localStorage.setItem('app_transactions', JSON.stringify(allTx));

    return { success: true, message: `Withdrawal of ₱${tx.amount} approved!` };
  },

  loginAdmin(username, password) {
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('is_admin_logged', 'true');
      return { success: true };
    }
    return { success: false, message: 'Invalid admin username or password.' };
  },

  logoutAdmin() {
    localStorage.removeItem('is_admin_logged');
  },

  isAdminLoggedIn() {
    return localStorage.getItem('is_admin_logged') === 'true';
  },

  updateUserBalance(userId, newBalance) {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return { success: false, message: 'User not found.' };

    users[userIndex].balance = parseFloat(newBalance).toFixed(2);
    this.saveUsers(users);
    return { success: true, message: 'User balance updated successfully.' };
  },

  logout() {
    localStorage.removeItem('current_user_id');
  }
};