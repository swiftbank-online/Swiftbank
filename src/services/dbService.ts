import { UserProfile, Transaction, BankCard, ChatMessage, Notification, LandingPageSettings } from '../types';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

function cleanObject(obj: any): any {
  const result: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        result[key] = cleanObject(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
  });
  return result;
}

const DEFAULTS_SETTINGS: LandingPageSettings = {
  heroTitle: "Bank Smarter with Swift Bank",
  heroSub: "Secure digital banking designed for modern financial management. Access instant transfers, global wire options, and visual smart credit cards anytime, anywhere.",
  logoUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=120",
  faviconUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=32",
  contactAddress: "1251 Avenue of the Americas, New York, NY 10020-1104",
  contactPhone: "929 126 0000",
  contactEmail: "support@swiftbank.com",
  faqs: JSON.stringify([
    { q: "How do I activate my digital Swift Card?", a: "Once processed, your simple virtual card is active instantly in your cards tab. You can start using it immediately." },
    { q: "What is the transaction PIN used for?", a: "The 4-digit PIN protects all outer transfers to keep your money safe." },
    { q: "Are international cash wires subject to admin holds?", a: "Are international transfers subject to review?" },
    { q: "Are international transfers reviewed?", a: "Yes, international transfers are reviewed to make sure your transfer is completed safely." }
  ]),
  footerAbout: "Swift Bank is a forward-thinking visual financial institution providing banking-grade secure services, atomic P2P deposits, and state-of-the-art encrypted card systems.",
  bankName: "SWIFT FEDERAL TRUST CO.",
  bankAccountName: "SWIFT BANK CORP ACQUISITION",
  bankAccountNumber: "0990432125",
  bankRoutingNumber: "021000021",
  bankSwiftCode: "SWIFTNY33XXX",
  bankAddress: "140 Broadway, New York, NY 10005, United States",
  btcAddress: "bc1qxy2kg3ut78dh8sd35jkh2h8ds8hjs7sdjkds8d",
  btcQrCodeUrl: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&q=80&w=250",
  usdtAddress: "0x7a3D39B88089E4E2C7D1D4133BCFbe08204E677F",
  usdtNetwork: "TRC20",
  usdtQrCodeUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=250",
  minLocalTransfer: 10,
  localTransferFee: 0,
  minIntlTransfer: 100,
  intlTransferFee: 25
};

class DBService {
  private usersCache: UserProfile[] = [];
  private transactionsCache: Transaction[] = [];
  private cardsCache: BankCard[] = [];
  private messagesCache: ChatMessage[] = [];
  private notificationsCache: Notification[] = [];
  private settingsCache: LandingPageSettings = DEFAULTS_SETTINGS;

  private unsubscribers: (() => void)[] = [];

  constructor() {
    this.initSettingsOnLoad();
  }

  // Initial seeding of settings if missing
  private async initSettingsOnLoad() {
    try {
      const docRef = doc(db, 'settings', 'global');
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, DEFAULTS_SETTINGS);
      } else {
        this.settingsCache = snap.data() as LandingPageSettings;
      }
    } catch (e) {
      console.warn("Settings fetch skipped or rule blocked in initSettingsOnLoad:", e);
    }
  }

  // Dynamic real-time sync listeners subscription
  public setupListeners(userId: string, isAdminUser: boolean) {
    this.clearListeners();

    // 1. Settings listener
    const settingsSub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        this.settingsCache = snap.data() as LandingPageSettings;
        window.dispatchEvent(new CustomEvent('swiftbank_update_settings', { detail: this.settingsCache }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
    this.unsubscribers.push(settingsSub);

    // 2. Users listener (Admin can see all, standard sees only their own profile)
    const usersQuery = isAdminUser ? collection(db, 'users') : query(collection(db, 'users'), where('userId', '==', userId));
    const usersSub = onSnapshot(usersQuery, async (snap) => {
      const ulist: UserProfile[] = [];
      snap.forEach(d => ulist.push(d.data() as UserProfile));
      this.usersCache = ulist;
      window.dispatchEvent(new CustomEvent('swiftbank_update_users', { detail: ulist }));

      // Lazy public profile synchronization for the currently logged in session
      const currentSessionProfile = ulist.find(u => u.userId === userId);
      if (currentSessionProfile) {
        try {
          const pubRef = doc(db, 'public_profiles', userId);
          const pubSnap = await getDoc(pubRef);
          if (!pubSnap.exists()) {
            await setDoc(pubRef, {
              userId: currentSessionProfile.userId,
              fullName: currentSessionProfile.fullName,
              accountNumber: currentSessionProfile.accountNumber,
              profileImage: currentSessionProfile.profileImage || "",
              status: currentSessionProfile.status
            });
            console.log("Lazy-provisioned public profile for:", currentSessionProfile.fullName);
          } else {
            const currentPub = pubSnap.data();
            if (currentPub.fullName !== currentSessionProfile.fullName ||
                currentPub.profileImage !== currentSessionProfile.profileImage ||
                currentPub.status !== currentSessionProfile.status ||
                currentPub.accountNumber !== currentSessionProfile.accountNumber) {
              await setDoc(pubRef, {
                userId: currentSessionProfile.userId,
                fullName: currentSessionProfile.fullName,
                accountNumber: currentSessionProfile.accountNumber,
                profileImage: currentSessionProfile.profileImage || "",
                status: currentSessionProfile.status
              }, { merge: true });
            }
          }
        } catch (err) {
          console.warn("Public profile auto-sync delayed:", err);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    this.unsubscribers.push(usersSub);

    // 3. Transactions listener
    const txQuery = isAdminUser ? collection(db, 'transactions') : query(collection(db, 'transactions'), where('userId', '==', userId));
    const txSub = onSnapshot(txQuery, (snap) => {
      const txlist: Transaction[] = [];
      snap.forEach(d => txlist.push(d.data() as Transaction));
      // Sort in memory to avoid firestore composite index crash
      txlist.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      this.transactionsCache = txlist;
      window.dispatchEvent(new CustomEvent('swiftbank_update_transactions', { detail: txlist }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });
    this.unsubscribers.push(txSub);

    // 4. Cards listener
    const cardsQuery = isAdminUser ? collection(db, 'cards') : query(collection(db, 'cards'), where('userId', '==', userId));
    const cardsSub = onSnapshot(cardsQuery, (snap) => {
      const clist: BankCard[] = [];
      snap.forEach(d => clist.push(d.data() as BankCard));
      this.cardsCache = clist;
      window.dispatchEvent(new CustomEvent('swiftbank_update_cards', { detail: clist }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'cards');
    });
    this.unsubscribers.push(cardsSub);

    // 5. Messages listener
    const msgsQuery = isAdminUser ? collection(db, 'messages') : query(collection(db, 'messages'), where('userId', '==', userId));
    const msgsSub = onSnapshot(msgsQuery, (snap) => {
      const mlist: ChatMessage[] = [];
      snap.forEach(d => mlist.push(d.data() as ChatMessage));
      // Sort messages ascending by creation time
      mlist.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      this.messagesCache = mlist;
      window.dispatchEvent(new CustomEvent('swiftbank_update_messages', { detail: mlist }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'messages');
    });
    this.unsubscribers.push(msgsSub);

    // 6. Notifications listener
    const notifsQuery = isAdminUser ? collection(db, 'notifications') : query(collection(db, 'notifications'), where('userId', '==', userId));
    const notifsSub = onSnapshot(notifsQuery, (snap) => {
      const nlist: Notification[] = [];
      snap.forEach(d => nlist.push(d.data() as Notification));
      nlist.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      this.notificationsCache = nlist;
      window.dispatchEvent(new CustomEvent('swiftbank_update_notifications', { detail: nlist }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });
    this.unsubscribers.push(notifsSub);
  }

  public clearListeners() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  // --- SETTINGS ---
  public getSettings(): LandingPageSettings {
    return this.settingsCache;
  }

  public async saveSettings(settings: LandingPageSettings): Promise<void> {
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
  }

  // --- USERS MANAGEMENT ---
  public getUsers(): UserProfile[] {
    return this.usersCache;
  }

  public getUserByAccountNumber(accountNumber: string): UserProfile | undefined {
    return this.usersCache.find(u => u.accountNumber === accountNumber && u.status === 'active');
  }

  public async registerUser(profile: Omit<UserProfile, 'createdAt' | 'balance' | 'status' | 'profileImage' | 'isAdmin' | 'accountNumber'> & { accountNumber?: string; phoneNumber?: string }): Promise<UserProfile> {
    const userId = profile.userId;
    const userDocRef = doc(db, 'users', userId);

    let accountNumber = profile.accountNumber || "";
    if (!accountNumber) {
      const existingAccs = this.usersCache.map(u => u.accountNumber);
      do {
        accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      } while (existingAccs.includes(accountNumber));
    }

    const newProfile: UserProfile = {
      ...profile,
      accountNumber,
      balance: 100.00, // starting balance bonus
      status: 'active',
      profileImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200", 
      createdAt: new Date().toISOString(),
      isAdmin: false
    };

    try {
      await setDoc(userDocRef, newProfile);
      // Synchronize Public profile entry for transfers
      try {
        await setDoc(doc(db, 'public_profiles', userId), {
          userId,
          fullName: newProfile.fullName,
          accountNumber: newProfile.accountNumber,
          profileImage: newProfile.profileImage || "",
          status: newProfile.status
        });
      } catch (pubErr) {
        console.error("Failed to provision public_profile during registration:", pubErr);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}`);
    }

    await this.addNotification(userId, "Welcome to Swift Bank!", `Your account ${accountNumber} has been successfully provisioned with a secure digital vault.`);

    return newProfile;
  }

  public async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, updates);
      
      const refreshedDoc = await getDoc(docRef);
      const data = refreshedDoc.exists() ? (refreshedDoc.data() as UserProfile) : null;
      if (data) {
        // Keep public profile elements fully synchronized
        const pubRef = doc(db, 'public_profiles', userId);
        const pubUpdates: any = {};
        if (updates.fullName !== undefined) pubUpdates.fullName = updates.fullName;
        if (updates.profileImage !== undefined) pubUpdates.profileImage = updates.profileImage;
        if (updates.status !== undefined) pubUpdates.status = updates.status;
        if (Object.keys(pubUpdates).length > 0) {
          try {
            await setDoc(pubRef, pubUpdates, { merge: true });
          } catch (e) {
            console.warn("Public profile update sync skipped:", e);
          }
        }
      }
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      return null;
    }
  }

  public async setUserBlockedStatus(userId: string, isBlocked: boolean): Promise<void> {
    try {
      const statusValue = isBlocked ? 'blocked' : 'active';
      await updateDoc(doc(db, 'users', userId), { status: statusValue });
      try {
        await updateDoc(doc(db, 'public_profiles', userId), { status: statusValue });
      } catch (e) {
        console.warn("Public profile block status sync skipped:", e);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  }

  // --- TRANSACTIONS ---
  public getTransactions(): Transaction[] {
    return this.transactionsCache;
  }

  public getUserTransactions(userId: string): Transaction[] {
    return this.transactionsCache.filter(tx => tx.userId === userId);
  }

  public async requestDeposit(userId: string, amount: number, note: string = "Account Top-up"): Promise<Transaction> {
    const transactionId = "tx_dep_" + Math.random().toString(36).substring(2, 9);
    const newTx: Transaction = {
      id: transactionId,
      userId,
      type: 'deposit',
      amount,
      status: 'pending',
      notes: note,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'transactions', transactionId), newTx);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `transactions/${transactionId}`);
    }

    await this.addNotification(userId, "Deposit Initiated", `Your deposit of $${amount} is processing.`);
    return newTx;
  }

  public async createBackupTransaction(txData: Omit<Transaction, 'id'>, adjustBalance: boolean): Promise<void> {
    const id = "tx_back_" + Math.random().toString(36).substring(2, 9);
    const cleanedTx: Transaction = cleanObject({
      ...txData,
      id
    });

    try {
      if (adjustBalance && txData.status === 'approved') {
        const userDocRef = doc(db, 'users', txData.userId);
        await runTransaction(db, async (transaction) => {
          const userSnap = await transaction.get(userDocRef);
          if (userSnap.exists()) {
            const user = userSnap.data() as UserProfile;
            let finalBalance = user.balance;
            const changeAmount = txData.amount;
            const fee = txData.fee || 0;

            if (txData.type === 'deposit') {
              finalBalance += changeAmount;
            } else {
              // local_transfer, intl_transfer, withdrawal, card_payment are debits
              finalBalance -= (changeAmount + fee);
            }

            if (finalBalance < 0) {
              throw new Error("Target transaction would result in a negative balance for this customer portfolio.");
            }

            transaction.update(userDocRef, { balance: finalBalance });
            transaction.set(doc(db, 'transactions', id), cleanedTx);
          } else {
            transaction.set(doc(db, 'transactions', id), cleanedTx);
          }
        });
      } else {
        await setDoc(doc(db, 'transactions', id), cleanedTx);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `transactions/${id}`);
    }
  }

  public async saveFailedTransaction(tx: Transaction): Promise<void> {
    try {
      await setDoc(doc(db, 'transactions', tx.id), tx);
      await this.addNotification(tx.userId, "Transfer Hold / Declined", `Your transfer of $${tx.amount.toFixed(2)} to account ${tx.recipientAccount} was suspended: Flagged under regulation SEC-803.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `transactions/${tx.id}`);
    }
  }

  public async adjustUserBalance(userId: string, amount: number, isDeduct: boolean, memo: string): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    const txId = "tx_adj_" + Math.random().toString(36).substring(2, 9);
    
    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) {
          throw new Error("User portfolio not found.");
        }
        
        const user = userSnap.data() as UserProfile;
        let finalBalance = user.balance;
        
        if (isDeduct) {
          finalBalance -= amount;
        } else {
          finalBalance += amount;
        }
        
        if (finalBalance < 0) {
          throw new Error(`Target adjustment would result in a negative balance ($${finalBalance.toFixed(2)}) for this portfolio.`);
        }
        
        const adjustmentTx: Transaction = {
          id: txId,
          userId: userId,
          type: isDeduct ? 'withdrawal' : 'deposit',
          amount: amount,
          status: 'approved',
          fee: 0,
          senderName: isDeduct ? user.fullName : 'Swift Central Reserve',
          recipientName: isDeduct ? 'Swift Central Reserve' : user.fullName,
          notes: memo || (isDeduct ? "Manual Balance Debit" : "Manual Balance Credit"),
          createdAt: new Date().toISOString()
        };
        
        transaction.update(userDocRef, { balance: finalBalance });
        transaction.set(doc(db, 'transactions', txId), adjustmentTx);
      });
      
      const notificationTitle = isDeduct ? "Account Debit Adjustment" : "Account Credit Adjustment";
      const notificationBody = isDeduct 
        ? `Your account was debited by $${amount.toFixed(2)}: ${memo || 'Manual Balance Debit'}` 
        : `Your account was credited with $${amount.toFixed(2)}: ${memo || 'Manual Balance Credit'}`;
      await this.addNotification(userId, notificationTitle, notificationBody);
      
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      throw error;
    }
  }

  public async lookupUserByAccountNumber(accountNumber: string): Promise<UserProfile | null> {
    try {
      const resp = await fetch(`/api/lookup-account/${accountNumber}`);
      if (resp.ok) {
        return await resp.json() as UserProfile;
      }
    } catch (e) {
      console.warn("Backend secure lookup unavailable, using client public_profiles fallback:", e);
    }

    try {
      const q = query(collection(db, 'public_profiles'), where('accountNumber', '==', accountNumber));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const p = snap.docs[0].data();
        if (p.status === 'active') {
          return {
            userId: p.userId,
            fullName: p.fullName,
            accountNumber: p.accountNumber,
            profileImage: p.profileImage || "",
            status: p.status,
            email: "",
            balance: 0,
            pin: "",
            createdAt: ""
          } as UserProfile;
        }
      }
    } catch (err) {
      console.error("Client fallback public profile lookup failed:", err);
    }
    return null;
  }

  // Atomic recipient peer local transfer routed through secure server-side transaction gateway (with zero-secret preview fallback)
  public async executeLocalTransfer(senderId: string, recipientAccountNumber: string, amount: number, notes: string = "", pin: string): Promise<Transaction> {
    let reachedBackend = false;
    let backendErrorMsg = "";
    try {
      const resp = await fetch('/api/execute-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          senderId,
          recipientAccountNumber,
          amountStr: amount.toString(),
          notes,
          pin
        })
      });

      reachedBackend = true;
      if (resp.ok) {
        const res = await resp.json();
        return res.transaction as Transaction;
      } else {
        const errorData = await resp.json();
        backendErrorMsg = errorData.error || "Dynamic wire transfer processor failed.";
        throw new Error(backendErrorMsg);
      }
    } catch (err: any) {
      if (reachedBackend) {
        throw new Error(backendErrorMsg || err.message);
      }

      console.warn("Backend transaction gateway failed, trying active client-side fallback:", err.message);

      if (err.message && (
        err.message.includes("PIN") || 
        err.message.includes("RESTRICTED_TRANSFER") || 
        err.message.includes("minimum local transfer") || 
        err.message.includes("balance") || 
        err.message.includes("restricted") ||
        err.message.includes("own account")
      )) {
        throw err;
      }

      // Compliant Client-side fallback transaction execution
      try {
        const matchedRecipient = await this.lookupUserByAccountNumber(recipientAccountNumber);
        if (!matchedRecipient) {
          throw new Error("Recipient account could not be found or is inactive.");
        }
        const recipientId = matchedRecipient.userId;
        const recipientDocRef = doc(db, 'users', recipientId);
        const senderDocRef = doc(db, 'users', senderId);

        const transactionId = "tx_local_" + Math.random().toString(36).substring(2, 9);
        const debitTxId = transactionId + "_deb";
        const creditTxId = transactionId + "_cred";

        const settings = this.getSettings();
        const minAmt = settings.minLocalTransfer ?? 10;
        const fee = settings.localTransferFee ?? 0;

        await runTransaction(db, async (transaction) => {
          const senderSnap = await transaction.get(senderDocRef);
          if (!senderSnap.exists()) throw new Error("Sender account does not exist.");
          const senderData = senderSnap.data() as UserProfile;

          if (senderData.pin !== pin) throw new Error("Invalid 4-digit transaction PIN security authorization.");
          if (senderData.status !== 'active') throw new Error("Your account has been restricted.");

          if (amount < minAmt) {
            throw new Error(`The minimum local transfer amount is $${minAmt.toFixed(2)}.`);
          }

          const totalDebit = amount + fee;
          if (senderData.balance < totalDebit) {
            throw new Error(`Insufficient account balance. Required: $${totalDebit.toFixed(2)} (includes $${fee.toFixed(2)} processing fee).`);
          }

          const recipientSnap = await transaction.get(recipientDocRef);
          if (!recipientSnap.exists()) throw new Error("Recipient account does not exist.");
          const recipientData = recipientSnap.data() as UserProfile;

          // Atomic calculations
          transaction.update(senderDocRef, { balance: senderData.balance - totalDebit });
          transaction.update(recipientDocRef, { balance: recipientData.balance + amount });

          // Submit matched double-ledger journal logs
          transaction.set(doc(db, 'transactions', debitTxId), {
            id: debitTxId,
            userId: senderId,
            type: 'local_transfer',
            amount,
            fee,
            status: 'approved',
            senderName: senderData.fullName,
            recipientName: recipientData.fullName,
            senderImage: senderData.profileImage || "",
            recipientImage: recipientData.profileImage || "",
            recipientAccount: recipientAccountNumber,
            notes: fee > 0 ? `Sent: ${notes} (Fee: $${fee.toFixed(2)})` : `Sent: ${notes}`,
            createdAt: new Date().toISOString()
          });

          transaction.set(doc(db, 'transactions', creditTxId), {
            id: creditTxId,
            userId: recipientId,
            type: 'local_transfer',
            amount,
            fee: 0,
            status: 'approved',
            senderName: senderData.fullName,
            recipientName: recipientData.fullName,
            senderImage: senderData.profileImage || "",
            recipientImage: recipientData.profileImage || "",
            recipientAccount: recipientAccountNumber,
            notes: `Received: ${notes}`,
            createdAt: new Date().toISOString()
          });

          // Submit system warning/receipt push notifications
          const nsId = "notif_" + Math.random().toString(36).substring(2, 9);
          const nrId = "notif_" + Math.random().toString(36).substring(2, 9);

          transaction.set(doc(db, 'notifications', nsId), {
            id: nsId,
            userId: senderId,
            title: "Transfer Sent",
            message: `Your wire transfer of $${amount.toFixed(2)} to account ${recipientAccountNumber} was approved and processed successfully.`,
            createdAt: new Date().toISOString(),
            read: false
          });

          transaction.set(doc(db, 'notifications', nrId), {
            id: nrId,
            userId: recipientId,
            title: "Transfer Received",
            message: `You received an instant wire transfer of $${amount.toFixed(2)} from ${senderData.fullName}.`,
            createdAt: new Date().toISOString(),
            read: false
          });
        });

        // Return client-constructed receipt object
        return {
          id: debitTxId,
          userId: senderId,
          type: 'local_transfer',
          amount,
          fee,
          status: 'approved',
          senderName: "You",
          recipientName: matchedRecipient.fullName,
          recipientAccount: recipientAccountNumber,
          senderImage: "",
          recipientImage: matchedRecipient.profileImage || "",
          notes: fee > 0 ? `Sent: ${notes} (Fee: $${fee.toFixed(2)})` : `Sent: ${notes}`,
          createdAt: new Date().toISOString()
        } as Transaction;

      } catch (fallbackErr: any) {
        console.error("Client fallback transfer also failed:", fallbackErr);
        if (fallbackErr.message && fallbackErr.message.includes("permission")) {
          throw new Error("Transfers require a Service Account to be configured in settings. Please configure FIREBASE_SERVICE_ACCOUNT_KEY in the Settings menu.");
        }
        throw fallbackErr;
      }
    }
  }

  public async executeIntlTransfer(userId: string, method: string, details: string, amount: number, notes: string, pin: string): Promise<Transaction> {
    const userDocRef = doc(db, 'users', userId);
    const transactionId = "tx_intl_" + Math.random().toString(36).substring(2, 10);

    const settings = this.getSettings();
    const minAmt = settings.minIntlTransfer ?? 100;
    const fee = settings.intlTransferFee ?? 25;

    const newTx: Transaction = {
      id: transactionId,
      userId,
      type: 'intl_transfer',
      amount,
      fee,
      status: 'pending',
      recipientName: details,
      intlMethod: method,
      notes,
      createdAt: new Date().toISOString()
    };

    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) throw new Error("User record missing.");
        const user = userSnap.data() as UserProfile;

        if (user.pin !== pin) throw new Error("Invalid 4-digit transaction PIN security exception.");
        if (user.status !== 'active') throw new Error("Account has been administratively disabled.");

        // Disable anti-fraud transfer restriction unless explicitly requested
        if (false) {
          throw new Error(`RESTRICTED_TRANSFER:${user.restrictMessage || "Fraudulent transfers restricted to secure client funds."}`);
        }

        if (amount < minAmt) {
          throw new Error(`The minimum international transfer amount is $${minAmt.toFixed(2)}.`);
        }

        const totalDebit = amount + fee;
        if (user.balance < totalDebit) {
          throw new Error(`Insufficient balance to complete international wire. Required: $${totalDebit.toFixed(2)} (includes $${fee.toFixed(2)} wire processing charge).`);
        }

        transaction.update(userDocRef, { balance: user.balance - totalDebit });
        
        const finalTx = {
          ...newTx,
          senderName: user.fullName,
          senderImage: user.profileImage || "",
          notes: fee > 0 ? `${notes} (Fee: $${fee.toFixed(2)})` : notes
        };
        transaction.set(doc(db, 'transactions', transactionId), finalTx);
      });
    } catch (err: any) {
      if (err.message && err.message.includes("RESTRICTED_TRANSFER:")) {
        throw err;
      }
      handleFirestoreError(err, OperationType.WRITE, `transactions/${transactionId}`);
    }

    await this.addNotification(userId, "Outbound Transfer", `Your ${method} transfer of $${amount} is processing. Wire Fee: $${fee.toFixed(2)}.`);
    return newTx;
  }

  public async requestWithdrawal(userId: string, amount: number): Promise<Transaction> {
    const userDocRef = doc(db, 'users', userId);
    const txId = "tx_with_" + Math.random().toString(36).substring(2, 8);
    const tx: Transaction = {
      id: txId,
      userId,
      type: 'withdrawal',
      amount,
      status: 'approved',
      notes: 'Direct ATM Cash Withdrawal',
      createdAt: new Date().toISOString()
    };

    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) throw new Error("Invalid user authentication detail.");
        const user = userSnap.data() as UserProfile;

        if (user.balance < amount) throw new Error("Insufficient balance.");

        transaction.update(userDocRef, { balance: user.balance - amount });
        transaction.set(doc(db, 'transactions', txId), tx);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `transactions/${txId}`);
    }

    await this.addNotification(userId, "Cash Withdrawal", `Successfully withdrew $${amount.toFixed(2)} from your account.`);
    return tx;
  }

  // Admin approval routines
  public async approveDeposit(txId: string): Promise<void> {
    try {
      const txDocRef = doc(db, 'transactions', txId);
      const txSnap = await getDoc(txDocRef);
      if (txSnap.exists()) {
        const tx = txSnap.data() as Transaction;
        if (tx.status === 'pending') {
          const userDocRef = doc(db, 'users', tx.userId);

          await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userDocRef);
            if (!userSnap.exists()) throw new Error("User corresponding to transaction doesn't exist.");
            const userData = userSnap.data() as UserProfile;

            transaction.update(txDocRef, { status: 'approved' });
            transaction.update(userDocRef, { balance: userData.balance + tx.amount });
          });

          await this.addNotification(tx.userId, "Deposit Completed", `Your deposit of $${tx.amount.toFixed(2)} was successful.`);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${txId}`);
    }
  }

  public async rejectDeposit(txId: string): Promise<void> {
    try {
      const txDocRef = doc(db, 'transactions', txId);
      const txSnap = await getDoc(txDocRef);
      if (txSnap.exists()) {
        const tx = txSnap.data() as Transaction;
        if (tx.status === 'pending') {
          await updateDoc(txDocRef, { status: 'rejected' });
          await this.addNotification(tx.userId, "Deposit Failed", `Your deposit of $${tx.amount.toFixed(2)} failed.`);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${txId}`);
    }
  }

  public async approveTransfer(txId: string): Promise<void> {
    try {
      const txDocRef = doc(db, 'transactions', txId);
      const txSnap = await getDoc(txDocRef);
      if (txSnap.exists()) {
        const tx = txSnap.data() as Transaction;
        if (tx.status === 'pending') {
          await updateDoc(txDocRef, { status: 'approved' });
          await this.addNotification(tx.userId, "Transfer Completed", `Your transfer of $${tx.amount.toFixed(2)} was successful.`);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${txId}`);
    }
  }

  public async rejectTransfer(txId: string): Promise<void> {
    try {
      const txDocRef = doc(db, 'transactions', txId);
      const txSnap = await getDoc(txDocRef);
      if (txSnap.exists()) {
        const tx = txSnap.data() as Transaction;
        if (tx.status === 'pending') {
          const userDocRef = doc(db, 'users', tx.userId);

          await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userDocRef);
            if (!userSnap.exists()) throw new Error("User record missing.");
            const userData = userSnap.data() as UserProfile;

            const refundFee = tx.fee ?? 0;
            const refundTotal = tx.amount + refundFee;

            transaction.update(txDocRef, { status: 'rejected' });
            transaction.update(userDocRef, { balance: userData.balance + refundTotal });
          });

          await this.addNotification(tx.userId, "Transfer Failed", `Your transfer of $${tx.amount.toFixed(2)} failed. Money has been returned to your account.`);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${txId}`);
    }
  }

  // --- CARDS AND APPLICATIONS ---
  public getCards(): BankCard[] {
    return this.cardsCache;
  }

  public getUserCards(userId: string): BankCard[] {
    return this.cardsCache.filter(c => c.userId === userId);
  }

  public async applyForCard(cardData: Omit<BankCard, 'id' | 'cardNumber' | 'expiryDate' | 'cvv' | 'status' | 'createdAt'>): Promise<BankCard> {
    const cardId = "card_app_" + Math.random().toString(36).substring(2, 9);
    const pendingCard: BankCard = {
      ...cardData,
      id: cardId,
      cardNumber: "•••• •••• •••• ••••",
      expiryDate: "••/••",
      cvv: "•••",
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'cards', cardId), pendingCard);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `cards/${cardId}`);
    }

    await this.addNotification(cardData.userId, "Card Application Processing", `Your application for the ${cardData.brand} card is processing.`);
    return pendingCard;
  }

  public async approveCardApplication(cardId: string): Promise<void> {
    try {
      const cardDocRef = doc(db, 'cards', cardId);
      const cardSnap = await getDoc(cardDocRef);
      if (cardSnap.exists()) {
        const card = cardSnap.data() as BankCard;
        
        const prefixes = {
          'Visa': '4111',
          'Mastercard': '5399',
          'American Express': '3782'
        };
        const pref = prefixes[card.brand] || '4000';
        const middle1 = Math.floor(1000 + Math.random() * 9000).toString();
        const middle2 = Math.floor(1000 + Math.random() * 9000).toString();
        const last = Math.floor(1000 + Math.random() * 9000).toString();
        const generatedNumber = `${pref} ${middle1} ${middle2} ${last}`;
        const cvvNum = Math.floor(100 + Math.random() * 900).toString();

        await updateDoc(cardDocRef, {
          cardNumber: generatedNumber,
          cvv: cvvNum,
          expiryDate: `0${Math.floor(1 + Math.random() * 9)}/31`,
          status: 'active'
        });

        await this.addNotification(card.userId, "Card Active!", `Your new virtual ${card.brand} card is active and ready to use.`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `cards/${cardId}`);
    }
  }

  public async rejectCardApplication(cardId: string): Promise<void> {
    try {
      const cardDocRef = doc(db, 'cards', cardId);
      const cardSnap = await getDoc(cardDocRef);
      if (cardSnap.exists()) {
        const card = cardSnap.data() as BankCard;
        await updateDoc(cardDocRef, { status: 'rejected' });
        await this.addNotification(card.userId, "Card Application Declined", `Your request for the ${card.brand} card was declined.`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `cards/${cardId}`);
    }
  }

  // --- MESSAGES / CHATS ---
  public getMessages(): ChatMessage[] {
    return this.messagesCache;
  }

  public getUserMessages(userId: string): ChatMessage[] {
    return this.messagesCache.filter(msg => msg.userId === userId || msg.senderId === userId);
  }

  public async sendMessage(senderId: string, senderName: string, text: string): Promise<ChatMessage> {
    const messageId = "msg_" + Math.random().toString(36).substring(2, 10);
    const newMsg: ChatMessage = {
      id: messageId,
      senderId,
      senderName,
      text,
      createdAt: new Date().toISOString(),
      isReadByAdmin: senderId === 'admin',
      isReadByUser: senderId !== 'admin',
      ticketStatus: 'open',
      userId: senderId // standard user is the ticket owner
    };

    try {
      await setDoc(doc(db, 'messages', messageId), newMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `messages/${messageId}`);
    }

    // Auto-generate chatbot response if sent from normal user
    if (senderId !== 'admin' && senderId !== 'system') {
      setTimeout(async () => {
        const replyId = "msg_reply_" + Math.random().toString(36).substring(2, 10);
        const botReplies = [
          "Thank you for reaching out to Swift Bank support! We received your ticket regarding your premium account. An Administrator is currently reviewing your log and will reply to you shortly.",
          "Our system shows your account status is active. If this is in regards to a pending Card levels application or international transfer, please hold as our validation admin updates states instantly.",
          "For direct transaction inquiries or wire approvals, please ensure your account contains sufficient balances. We are alert 24/7 to solve your needs."
        ];
        const randomAnswer = botReplies[Math.floor(Math.random() * botReplies.length)];
        
        const answerMsg: ChatMessage = {
          id: replyId,
          senderId: "admin",
          senderName: "Swift Advisor Agent",
          text: randomAnswer,
          createdAt: new Date().toISOString(),
          isReadByAdmin: true,
          isReadByUser: false,
          ticketStatus: 'open',
          userId: senderId // reply belongs to senderId support stream
        };

        try {
          await setDoc(doc(db, 'messages', replyId), answerMsg);
        } catch (err) {
          console.warn("Pre-compiled automated support bot reply failed to append:", err);
        }
      }, 3500);
    }

    return newMsg;
  }

  public async replyFromAdmin(userId: string, text: string): Promise<ChatMessage> {
    const replyId = "msg_admin_" + Math.random().toString(36).substring(2, 10);
    const newMsg: ChatMessage = {
      id: replyId,
      senderId: 'admin',
      senderName: "Swift Administrator Desk",
      text,
      createdAt: new Date().toISOString(),
      isReadByAdmin: true,
      isReadByUser: false,
      ticketStatus: 'open',
      userId: userId // belongs to selected customer support stream
    };

    try {
      const batch = writeBatch(db);
      
      this.messagesCache.forEach(m => {
        if (m.senderId === userId || m.userId === userId) {
          batch.update(doc(db, 'messages', m.id), { isReadByAdmin: true });
        }
      });

      batch.set(doc(db, 'messages', replyId), newMsg);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `messages/${replyId}`);
    }

    return newMsg;
  }

  public async closeTicket(userId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      this.messagesCache.forEach(m => {
        if (m.senderId === userId || m.senderId === 'admin') {
          batch.update(doc(db, 'messages', m.id), { ticketStatus: 'closed' });
        }
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/ticket-close-${userId}`);
    }
  }

  public async saveMessages(messages: ChatMessage[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      messages.forEach(m => {
        batch.set(doc(db, 'messages', m.id), m);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/save-all`);
    }
  }

  // --- NOTIFICATIONS ---
  public getNotifications(): Notification[] {
    return this.notificationsCache;
  }

  public getUserNotifications(userId: string): Notification[] {
    return this.notificationsCache.filter(n => n.userId === userId);
  }

  public async addNotification(userId: string, title: string, message: string): Promise<void> {
    const id = "notif_" + Math.random().toString(36).substring(2, 9);
    const newNotif: Notification = {
      id,
      userId,
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false
    };

    try {
      await setDoc(doc(db, 'notifications', id), newNotif);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `notifications/${id}`);
    }
  }

  public async markNotificationAsRead(notifId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notifId}`);
    }
  }

  public async clearNotifications(userId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      this.notificationsCache.forEach(n => {
        if (n.userId === userId) {
          batch.delete(doc(db, 'notifications', n.id));
        }
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/clear-user-${userId}`);
    }
  }
}

export const dbService = new DBService();
