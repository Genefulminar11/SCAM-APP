// 1. Initialize Supabase Client
const SUPABASE_URL = 'https://tdjxnhzqowqdtdiljiyd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qaQHR29KLpqysSNwqEn1tA_tiQzJuTu';

// Ensure createClient is correctly referenced from the global supabase library
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.DB = {

  async registerUser(phone, password, firstName, lastName, invitationCode) {
    try {
      const uniqueRefCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : Math.floor(Math.random() * 1000000).toString();
      const dummyEmail = `user_${cleanPhone}@portalstore.local`;

      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: dummyEmail,
        password: password,
        options: {
          data: {
            phone: phone,
            first_name: firstName,
            last_name: lastName,
            ref_code: uniqueRefCode
          }
        }
      });

      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error("Registration failed to return user session.");

      const payload = {
        id: user.id,
        phone: phone,
        password: password,
        first_name: firstName,
        last_name: lastName,
        balance: 0.00,
        available_balance: 0.00,
        ref_code: uniqueRefCode,
        referred_by: invitationCode ? invitationCode.trim().toUpperCase() : null
      };

      const { error: userError } = await supabaseClient
        .from('users')
        .upsert(payload, { onConflict: 'id' });
        
      if (userError) throw userError;

      return { success: true, message: 'Account created successfully!' };
    } catch (err) {
      console.error("Registration error:", err.message);
      return { success: false, message: err.message };
    }
  },

  async adminCreateUser(phone, password, firstName, lastName, balance) {
    try {
      const uniqueRefCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : Math.floor(Math.random() * 1000000).toString();
      const dummyEmail = `user_${cleanPhone}@portalstore.local`;

      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: dummyEmail,
        password: password || 'password123',
        options: {
          data: { phone, first_name: firstName, last_name: lastName, ref_code: uniqueRefCode }
        }
      });

      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error("Failed to create auth user.");

      const initialBal = parseFloat(balance) || 0.00;
      const payload = {
        id: user.id,
        phone: phone,
        password: password,
        first_name: firstName,
        last_name: lastName,
        balance: initialBal,
        available_balance: 0.00,
        ref_code: uniqueRefCode
      };

      const { error: userError } = await supabaseClient
        .from('users')
        .upsert(payload, { onConflict: 'id' });
        
      if (userError) throw userError;

      return { success: true, message: 'User created successfully by admin!' };
    } catch (err) {
      console.error("Admin create user error:", err.message);
      return { success: false, message: err.message };
    }
  },

  async updateUserBalance(userId, newBalance) {
    try {
      const parsedBalance = parseFloat(newBalance) || 0.00;
      
      const payload = { 
        balance: parsedBalance
      };

      const { error: userError } = await supabaseClient
        .from('users')
        .update(payload)
        .eq('id', userId);

      if (userError) throw userError;

      return { success: true, message: 'Balance updated successfully!' };
    } catch (err) {
      console.error("Update balance error:", err.message);
      return { success: false, message: err.message };
    }
  },

  async updateUserInfo(userId, updatedData) {
    try {
      const payload = {
        first_name: updatedData.firstName,
        last_name: updatedData.lastName,
        phone: updatedData.phone
      };

      // If a new password is provided, update it in the database payload as well
      if (updatedData.password && updatedData.password.trim() !== '') {
        payload.password = updatedData.password.trim();
      }

      const { error } = await supabaseClient
        .from('users')
        .update(payload)
        .eq('id', userId);
        
      if (error) throw error;
      
      return { success: true, message: 'User profile updated successfully!' };
    } catch (err) {
      console.error("Update user info error:", err.message);
      return { success: false, message: err.message };
    }
  },

  async deleteUser(userId) {
    try {
      const { error } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', userId);
        
      if (error) throw error;
      
      return { success: true, message: 'User deleted successfully!' };
    } catch (err) {
      console.error("Delete user error:", err.message);
      return { success: false, message: err.message };
    }
  },

  async checkReferralCode(code) {
    if (!code) return true; 
    try {
      const formattedCode = code.trim().toUpperCase();
      const { data, error } = await supabaseClient
        .from('users')
        .select('ref_code')
        .eq('ref_code', formattedCode)
        .maybeSingle();

      if (error) return true;
      return !!data;
    } catch (err) {
      return true;
    }
  },

  async loginUser(phone, password) {
    try {
      const cleanPhone = phone.trim();
      const cleanDigits = cleanPhone.replace(/[^0-9]/g, '');

      // 1. Direct profile match check (safest and bypasses rigid auth email string mismatches)
      const { data: profileMatch, error: profileError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('phone', cleanPhone)
        .eq('password', password)
        .maybeSingle();

      if (profileError || !profileMatch) {
        // Fallback search matching any raw variation of phone
        const { data: allUsers } = await supabaseClient.from('users').select('*');
        const matched = allUsers ? allUsers.find(u => u.phone && u.phone.replace(/[^0-9]/g, '') === cleanDigits && u.password === password) : null;
        
        if (!matched) {
          return { success: false, message: 'Invalid password or phone number.' };
        }
        
        // Store session identifier locally to ensure getCurrentUser reads it successfully
        localStorage.setItem('portalstore_logged_user_id', matched.id);
        return { success: true, message: 'Logged in successfully!' };
      }

      // Store session identifier locally
      localStorage.setItem('portalstore_logged_user_id', profileMatch.id);

      // Attempt standard sign-in for Supabase session sync
      const predictableEmail = `user_${cleanDigits}@portalstore.local`;
      await supabaseClient.auth.signInWithPassword({
        email: predictableEmail,
        password: password
      }).catch(() => {});

      return { success: true, message: 'Logged in successfully!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async loginAdmin(username, password) {
    try {
      const { data, error } = await supabaseClient
        .from('admins')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { success: false, message: 'Invalid admin username or password.' };

      localStorage.setItem('isAdminLoggedIn', 'true');
      localStorage.setItem('adminUser', JSON.stringify(data));
      return { success: true, data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  isAdminLoggedIn() {
    return localStorage.getItem('isAdminLoggedIn') === 'true';
  },

  logoutAdmin() {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminUser');
  },

  async getAllUsers() {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*');
        
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Get all users error:", err.message);
      return [];
    }
  },

  async getTeamStats() {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || !currentUser.ref_code) return null;

      const { data: allUsers, error } = await supabaseClient
        .from('users')
        .select('*');

      if (error) throw error;
      if (!allUsers) return { totalMembers: 0, totalCommissions: '₱0.00', members: [] };

      // Recursive function to build nested downline tree nodes with dropdown support
      function buildTree(refCode, tier = 1) {
        const children = allUsers.filter(u => u.referred_by && u.referred_by.toUpperCase() === refCode.toUpperCase());
        return children.map(child => ({
          ...child,
          tier: tier,
          open: false,
          children: buildTree(child.ref_code, tier + 1)
        }));
      }

      const nestedMembers = buildTree(currentUser.ref_code, 1);

      function countNodesAndSumCommission(nodes) {
        let count = nodes.length;
        let commSum = 0;
        nodes.forEach(n => {
          commSum += parseFloat(n.total_commission || 0);
          if (n.children && n.children.length > 0) {
            const sub = countNodesAndSumCommission(n.children);
            count += sub.count;
            commSum += sub.commSum;
          }
        });
        return { count, commSum };
      }

      const stats = countNodesAndSumCommission(nestedMembers);
      const totalCommVal = parseFloat(currentUser.totalCommission || 0) + stats.commSum;

      const formattedCommissions = '₱' + totalCommVal.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      return {
        totalMembers: stats.count,
        totalCommissions: formattedCommissions,
        members: nestedMembers
      };
    } catch (err) {
      console.error("Get team stats error:", err.message);
      return { totalMembers: 0, totalCommissions: '₱0.00', members: [] };
    }
  },

  async getAllTransactions() {
    try {
      const { data: transactions, error: txError } = await supabaseClient
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txError) throw txError;
      if (!transactions || transactions.length === 0) return [];

      const { data: users } = await supabaseClient.from('users').select('*');

      return transactions.map(tx => {
        const matchedUser = users ? users.find(u => u.id === tx.user_id) : null;
        return {
          ...tx,
          username: matchedUser ? (matchedUser.phone || matchedUser.first_name || 'Client') : 'Client User',
          date: new Date(tx.created_at).toLocaleString('en-US', { 
            month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' 
          })
        };
      });
    } catch (err) {
      console.error("Get transactions error:", err.message);
      return [];
    }
  },

  async updateTransactionStatus(transactionId, status) {
    try {
      const { error } = await supabaseClient
        .from('transactions')
        .update({ status: status })
        .eq('id', transactionId);

      if (error) throw error;
      return { success: true, message: `Transaction successfully ${status.toLowerCase()}!` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async getCurrentUser() {
    try {
      let userId = null;
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (session && session.user) {
        userId = session.user.id;
      } else {
        userId = localStorage.getItem('portalstore_logged_user_id');
      }

      if (!userId) return null;

      let { data: profile } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        return null;
      }

      if (!profile.ref_code) {
        profile.ref_code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await supabaseClient
          .from('users')
          .update({ ref_code: profile.ref_code })
          .eq('id', userId);
      }

      return {
        id: userId,
        email: profile.phone ? `user_${profile.phone}@portalstore.local` : '',
        phone: profile.phone || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        avatar_url: profile.avatar_url || '',
        ref_code: profile.ref_code,
        balance: parseFloat(profile.balance || 0.00),
        available_balance: parseFloat(profile.available_balance || 0.00),
        totalCommission: parseFloat(profile.total_commission || 0.00),
        currentLevel: parseInt(profile.current_level || 1),
        taskProgress: parseInt(profile.task_progress || 0)
      };
    } catch (err) {
      console.error("Get current user error:", err.message);
      return null;
    }
  },

  async logout() {
    try {
      localStorage.removeItem('portalstore_logged_user_id');
      await supabaseClient.auth.signOut();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async getBankDetails() {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) return [];
      
      const { data, error } = await supabaseClient
        .from('user_banks')
        .select('*')
        .eq('user_id', currentUser.id);
        
      if (error) throw error;
      return data || [];
    } catch (err) {
      return [];
    }
  },

  async saveBankDetails(form) {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) return { success: false, message: 'Not authenticated' };

      const { error } = await supabaseClient
        .from('user_banks')
        .insert([{
          user_id: currentUser.id,
          account_type: form.accountType,
          account_name: form.accountName,
          account_number: form.accountNumber
        }]);

      if (error) throw error;
      return { success: true, message: 'Bank account successfully bound!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async requestTopUp(amount, refNumber, method) {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) return { success: false, message: 'Not authenticated' };

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return { success: false, message: 'Please enter a valid top-up amount.' };
      }

      const { error } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: currentUser.id,
          type: 'deposit',
          amount: numAmount,
          method: method,
          ref_number: refNumber.trim(),
          status: 'Pending'
        });

      if (error) throw error;
      return { success: true, message: 'Top-up request submitted successfully!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
};