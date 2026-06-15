import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { UserProfile, Transaction, BankCard, ChatMessage, LandingPageSettings } from '../types';
import { 
  BarChart, 
  Users, 
  ArrowRightLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Layout, 
  CreditCard, 
  MessageSquare, 
  Settings, 
  Menu, 
  Search, 
  Check, 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  LogOut, 
  Send, 
  CheckCircle, 
  Info,
  Sliders,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  FolderLock,
  Clock,
  History
} from 'lucide-react';

interface AdminPanelProps {
  adminUser: UserProfile;
  onLogout: () => void;
}

export default function AdminPanel({ adminUser, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab ] = useState<'overview' | 'deposits' | 'transfers' | 'users' | 'landing-page' | 'cards' | 'chat' | 'settings' | 'security' | 'backup'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Live state from dbService
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allCards, setAllCards] = useState<BankCard[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [landingSettings, setLandingSettings] = useState<LandingPageSettings>(dbService.getSettings());

  // Search filters
  const [userSearchText, setUserSearchText] = useState("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Chat conversation details
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");

  // Edit Landing Page parameters
  const [heroTitle, setHeroTitle] = useState(landingSettings.heroTitle);
  const [heroSub, setHeroSub] = useState(landingSettings.heroSub);
  const [contactAddress, setContactAddress] = useState(landingSettings.contactAddress);
  const [contactPhone, setContactPhone] = useState(landingSettings.contactPhone);
  const [contactEmail, setContactEmail] = useState(landingSettings.contactEmail);
  const [footerAbout, setFooterAbout] = useState(landingSettings.footerAbout);
  const [faqsRawText, setFaqsRawText] = useState("");
  const [showBrandingSuccess, setShowBrandingSuccess] = useState(false);

  // Edit Payment Credentials Settings parameters
  const [bankName, setBankName] = useState(landingSettings.bankName || "");
  const [bankAccountName, setBankAccountName] = useState(landingSettings.bankAccountName || "");
  const [bankAccountNumber, setBankAccountNumber] = useState(landingSettings.bankAccountNumber || "");
  const [bankRoutingNumber, setBankRoutingNumber] = useState(landingSettings.bankRoutingNumber || "");
  const [bankSwiftCode, setBankSwiftCode] = useState(landingSettings.bankSwiftCode || "");
  const [bankAddress, setBankAddress] = useState(landingSettings.bankAddress || "");
  const [btcAddress, setBtcAddress] = useState(landingSettings.btcAddress || "");
  const [btcQrCodeUrl, setBtcQrCodeUrl] = useState(landingSettings.btcQrCodeUrl || "");
  const [usdtAddress, setUsdtAddress] = useState(landingSettings.usdtAddress || "");
  const [usdtNetwork, setUsdtNetwork] = useState(landingSettings.usdtNetwork || "TRC20");
  const [usdtQrCodeUrl, setUsdtQrCodeUrl] = useState(landingSettings.usdtQrCodeUrl || "");
  const [showSettingsSuccess, setShowSettingsSuccess] = useState(false);

  const [minLocalTransfer, setMinLocalTransfer] = useState(landingSettings.minLocalTransfer ?? 10);
  const [localTransferFee, setLocalTransferFee] = useState(landingSettings.localTransferFee ?? 0);
  const [minIntlTransfer, setMinIntlTransfer] = useState(landingSettings.minIntlTransfer ?? 100);
  const [intlTransferFee, setIntlTransferFee] = useState(landingSettings.intlTransferFee ?? 25);
  const [faviconUrl, setFaviconUrl] = useState(landingSettings.faviconUrl || "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=32");
  
  const [btcIsUploading, setBtcIsUploading] = useState(false);
  const [usdtIsUploading, setUsdtIsUploading] = useState(false);
  const [faviconIsUploading, setFaviconIsUploading] = useState(false);

  // Security editing state parameters
  const [selectedSecurityUser, setSelectedSecurityUser] = useState<UserProfile | null>(null);
  const [securityRestrictTransfers, setSecurityRestrictTransfers] = useState(false);
  const [securityTxLimit, setSecurityTxLimit] = useState(2);
  const [securityWarningTitle, setSecurityWarningTitle] = useState("Transfer Security Alert");
  const [securityWarningMessage, setSecurityWarningMessage] = useState("Your transaction frequency has initiated our advanced review procedures. To protect assets, please verify your credentials with our support branch.");
  const [securitySuccess, setSecuritySuccess] = useState(false);

  // Backup Transactions state parameters
  const [backSelectedUserId, setBackSelectedUserId] = useState("");
  const [backTxType, setBackTxType] = useState<'deposit' | 'withdrawal' | 'local_transfer' | 'intl_transfer' | 'card_payment'>('deposit');
  const [backAmount, setBackAmount] = useState(100);
  const [backFee, setBackFee] = useState(0);
  const [backStatus, setBackStatus] = useState<'approved' | 'pending' | 'rejected'>('approved');
  const [backDateTime, setBackDateTime] = useState(() => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  });
  const [backNotes, setBackNotes] = useState("");
  const [backRecipientName, setBackRecipientName] = useState("");
  const [backRecipientAccount, setBackRecipientAccount] = useState("");
  const [backSenderName, setBackSenderName] = useState("");
  const [backSenderAccount, setBackSenderAccount] = useState("");
  const [backIntlMethod, setBackIntlMethod] = useState("wire");
  const [backAdjustBalance, setBackAdjustBalance] = useState(true);
  const [backSuccess, setBackSuccess] = useState<string | null>(null);
  const [backError, setBackError] = useState<string | null>(null);
  const [backIsSubmitting, setBackIsSubmitting] = useState(false);

  useEffect(() => {
    setBankName(landingSettings.bankName || "");
    setBankAccountName(landingSettings.bankAccountName || "");
    setBankAccountNumber(landingSettings.bankAccountNumber || "");
    setBankRoutingNumber(landingSettings.bankRoutingNumber || "");
    setBankSwiftCode(landingSettings.bankSwiftCode || "");
    setBankAddress(landingSettings.bankAddress || "");
    setBtcAddress(landingSettings.btcAddress || "");
    setBtcQrCodeUrl(landingSettings.btcQrCodeUrl || "");
    setUsdtAddress(landingSettings.usdtAddress || "");
    setUsdtNetwork(landingSettings.usdtNetwork || "TRC20");
    setUsdtQrCodeUrl(landingSettings.usdtQrCodeUrl || "");
    setMinLocalTransfer(landingSettings.minLocalTransfer ?? 10);
    setLocalTransferFee(landingSettings.localTransferFee ?? 0);
    setMinIntlTransfer(landingSettings.minIntlTransfer ?? 100);
    setIntlTransferFee(landingSettings.intlTransferFee ?? 25);
    setFaviconUrl(landingSettings.faviconUrl || "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=32");
  }, [landingSettings]);

  useEffect(() => {
    syncAdminState();

    const handleSync = () => {
      syncAdminState();
    };

    window.addEventListener('swiftbank_update_users', handleSync);
    window.addEventListener('swiftbank_update_transactions', handleSync);
    window.addEventListener('swiftbank_update_cards', handleSync);
    window.addEventListener('swiftbank_update_messages', handleSync);
    window.addEventListener('swiftbank_update_settings', handleSync);

    // Seed FAQ raw editable
    try {
      const parsed = JSON.parse(landingSettings.faqs);
      const text = parsed.map((item: any) => `Q: ${item.q}\nA: ${item.a}`).join("\n\n");
      setFaqsRawText(text);
    } catch (e) {
      setFaqsRawText("");
    }

    return () => {
      window.removeEventListener('swiftbank_update_users', handleSync);
      window.removeEventListener('swiftbank_update_transactions', handleSync);
      window.removeEventListener('swiftbank_update_cards', handleSync);
      window.removeEventListener('swiftbank_update_messages', handleSync);
      window.removeEventListener('swiftbank_update_settings', handleSync);
    };
  }, []);

  const syncAdminState = () => {
    setAllUsers(dbService.getUsers());
    setAllTransactions(dbService.getTransactions());
    setAllCards(dbService.getCards());
    setAllMessages(dbService.getMessages());
    setLandingSettings(dbService.getSettings());
  };

  // Compute statistic details
  const stats = {
    totalDepositsAmount: allTransactions.filter(t => t.type === 'deposit' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0),
    pendingDepositsCount: allTransactions.filter(t => t.type === 'deposit' && t.status === 'pending').length,
    totalTransfersAmount: allTransactions.filter(t => t.type === 'intl_transfer' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0),
    pendingTransfersCount: allTransactions.filter(t => t.type === 'intl_transfer' && t.status === 'pending').length,
    totalUsersCount: allUsers.length,
    activeUsersCount: allUsers.filter(u => u.status === 'active').length,
    blockedUsersCount: allUsers.filter(u => u.status === 'blocked').length
  };

  // Approve card application
  const approveCard = (id: string) => {
    dbService.approveCardApplication(id);
    syncAdminState();
  };

  const rejectCard = (id: string) => {
    dbService.rejectCardApplication(id);
    syncAdminState();
  };

  // Block / Unblock user
  const toggleBlockUser = (user: UserProfile) => {
    const nextBlocked = user.status === 'active';
    dbService.setUserBlockedStatus(user.userId, nextBlocked);
    // Add warning notification
    dbService.addNotification(user.userId, 
      nextBlocked ? "Account Placed on Hold" : "Hold Lifted", 
      nextBlocked 
        ? "Your account balance has been put on hold due to compliance policies." 
        : "Hold status has been lifted. Account active.");
    syncAdminState();
  };

  // Save User edit revisions
  const handleSaveUserRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    dbService.updateUserProfile(editingUser.userId, editingUser);
    setEditingUser(null);
    syncAdminState();
  };

  // Save branding revisions
  const handleBrandingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse Q/A raw FAQ text
    const faqsArr: { q: string; a: string }[] = [];
    const blocks = faqsRawText.split(/\n\s*\n/);
    blocks.forEach(block => {
      const qMatch = block.match(/^Q:\s*(.*)/mi);
      const aMatch = block.match(/^A:\s*(.*)/mi);
      if (qMatch && qMatch[1] && aMatch && aMatch[1]) {
        faqsArr.push({ q: qMatch[1].trim(), a: aMatch[1].trim() });
      }
    });

    const finalizedFaqs = faqsArr.length > 0 ? faqsArr : JSON.parse(landingSettings.faqs);

    dbService.saveSettings({
      ...landingSettings,
      heroTitle,
      heroSub,
      contactAddress,
      contactPhone,
      contactEmail,
      footerAbout,
      logoUrl: landingSettings.logoUrl,
      faviconUrl,
      faqs: JSON.stringify(finalizedFaqs)
    });

    setShowBrandingSuccess(true);
    setTimeout(() => {
      setShowBrandingSuccess(false);
    }, 3000);
    syncAdminState();
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.saveSettings({
      ...landingSettings,
      bankName,
      bankAccountName,
      bankAccountNumber,
      bankRoutingNumber,
      bankSwiftCode,
      bankAddress,
      btcAddress,
      btcQrCodeUrl,
      usdtAddress,
      usdtNetwork,
      usdtQrCodeUrl,
      minLocalTransfer,
      localTransferFee,
      minIntlTransfer,
      intlTransferFee
    });
    setShowSettingsSuccess(true);
    setTimeout(() => {
      setShowSettingsSuccess(false);
    }, 3000);
    syncAdminState();
  };

  const handleBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backSelectedUserId) {
      setBackError("Please select a target user portfolio registry context.");
      return;
    }

    setBackIsSubmitting(true);
    setBackSuccess(null);
    setBackError(null);

    try {
      const selectedUser = allUsers.find(u => u.userId === backSelectedUserId);
      const isCard = backTxType === 'card_payment';
      const notesWithCard = isCard ? (backNotes.toLowerCase().includes('card') ? backNotes : `${backNotes} (Card Charge)`).trim() : backNotes.trim();

      const txPayload = {
        userId: backSelectedUserId,
        type: backTxType,
        amount: Number(backAmount),
        fee: Number(backFee),
        status: backStatus,
        notes: notesWithCard,
        createdAt: new Date(backDateTime).toISOString(),
        senderName: backTxType === 'deposit' ? "System Deposit Desk" : (selectedUser?.fullName || "Account Owner"),
        senderAccount: selectedUser?.accountNumber || "",
        recipientName: backRecipientName || undefined,
        recipientAccount: backRecipientAccount || undefined,
        intlMethod: backTxType === 'intl_transfer' ? backIntlMethod : undefined
      };

      await dbService.createBackupTransaction(txPayload, backAdjustBalance);
      
      setBackSuccess("Historically backed-up ledger transaction created and synchronized successfully!");
      // Reset some fields
      setBackAmount(100);
      setBackFee(0);
      setBackNotes("");
      setBackRecipientName("");
      setBackRecipientAccount("");
      syncAdminState();
    } catch (err: any) {
      setBackError(err.message || "Failed to create historical backup index transaction.");
    } finally {
      setBackIsSubmitting(false);
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleBtcQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBtcIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!resp.ok) throw new Error("Upload response not successful");
      const data = await resp.json();
      if (data.url) {
        setBtcQrCodeUrl(data.url);
      }
    } catch (err: any) {
      console.error("QR Code Upload error: ", err);
      try {
        const localUrl = await readFileAsDataURL(file);
        setBtcQrCodeUrl(localUrl);
      } catch (readErr) {
        setBtcQrCodeUrl("https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&q=80&w=250");
      }
    } finally {
      setBtcIsUploading(false);
    }
  };

  const handleUsdtQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUsdtIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!resp.ok) throw new Error("Upload response not successful");
      const data = await resp.json();
      if (data.url) {
        setUsdtQrCodeUrl(data.url);
      }
    } catch (err: any) {
      console.error("QR Code Upload error: ", err);
      try {
        const localUrl = await readFileAsDataURL(file);
        setUsdtQrCodeUrl(localUrl);
      } catch (readErr) {
        setUsdtQrCodeUrl("https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=250");
      }
    } finally {
      setUsdtIsUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!resp.ok) throw new Error("Upload response not successful");
      const data = await resp.json();
      if (data.url) {
        setFaviconUrl(data.url);
      }
    } catch (err: any) {
      console.error("Favicon Upload error: ", err);
      try {
        const localUrl = await readFileAsDataURL(file);
        setFaviconUrl(localUrl);
      } catch (readErr) {
        alert("Failed to read selection.");
      }
    } finally {
      setFaviconIsUploading(false);
    }
  };

  // Handle initializing a user's security config in state
  const startSecurityEditing = (user: UserProfile) => {
    setSelectedSecurityUser(user);
    setSecurityRestrictTransfers(!!user.securityRestrictTransfers);
    setSecurityTxLimit(user.securityTxLimit ?? 2);
    setSecurityWarningTitle(user.securityWarningTitle || "Transfer Security Alert");
    setSecurityWarningMessage(user.securityWarningMessage || "Your transaction frequency has initiated our advanced review procedures. To protect assets, please verify your credentials with our support branch.");
  };

  // Save modified user security configurations
  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSecurityUser) return;

    try {
      await dbService.updateUserProfile(selectedSecurityUser.userId, {
        securityRestrictTransfers,
        securityTxLimit,
        securityWarningTitle,
        securityWarningMessage
      });
      setSecuritySuccess(true);
      setTimeout(() => {
        setSecuritySuccess(false);
        setSelectedSecurityUser(null);
      }, 1500);
      syncAdminState();
    } catch (err) {
      console.error("Failed to save security configuration settings:", err);
    }
  };

  // Admin reply Chat action
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatUserId || !adminReplyText.trim()) return;

    dbService.replyFromAdmin(selectedChatUserId, adminReplyText.trim());
    setAdminReplyText("");
    syncAdminState();
  };

  // List users with chats active
  const chatTickets = () => {
    const uids = Array.from(new Set(allMessages.filter(m => m.senderId !== 'admin' && m.senderId !== 'system').map(m => m.senderId)));
    return uids.map(uid => {
      const userObj = allUsers.find(u => u.userId === uid);
      const userMsgs = allMessages.filter(m => m.senderId === uid || (m.senderId === 'admin' && m.isReadByUser !== undefined));
      const lastMsg = userMsgs[userMsgs.length - 1];
      const unreadCount = userMsgs.filter(m => m.senderId !== 'admin' && !m.isReadByAdmin).length;

      return {
        userId: uid,
        userName: userObj?.fullName || "Unregistered Guest",
        userEmail: userObj?.email || "guest@swiftbank.com",
        lastMessageText: lastMsg?.text || "No message logged.",
        lastMessageTime: lastMsg?.createdAt || new Date().toISOString(),
        unreadCount,
        status: lastMsg?.ticketStatus || "open"
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      
      {/* Sidebar navigation */}
      {sidebarOpen && (
        <aside className="w-64 bg-slate-900 border-r border-slate-850 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="p-6 border-b border-slate-850 flex items-center space-x-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
                <FolderLock className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight font-display">SWIFT ADMIN</span>
                <span className="block text-[8px] text-red-400 uppercase tracking-widest font-bold">Operational Gate</span>
              </div>
            </div>

            {/* Menu options */}
            <nav className="p-4 space-y-1">
              {[
                { id: 'overview', icon: BarChart, label: 'Overview' },
                { id: 'users', icon: Users, label: 'Users' },
                { id: 'transfers', icon: ArrowUpRight, label: 'Transfers', badge: stats.pendingTransfersCount },
                { id: 'deposits', icon: ArrowDownLeft, label: 'Deposits', badge: stats.pendingDepositsCount },
                { id: 'cards', icon: CreditCard, label: 'Cards' },
                { id: 'chat', icon: MessageSquare, label: 'Messages' },
                { id: 'security', icon: FolderLock, label: 'Security' },
                { id: 'landing-page', icon: Layout, label: 'Landing Page' },
                { id: 'settings', icon: Settings, label: 'Settings' },
                { id: 'backup', icon: History, label: 'Backup Tx' }
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-500 font-bold text-[9px] text-white animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-850">
            <button 
              onClick={onLogout}
              className="w-full py-2.5 bg-red-650/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Admin Gate</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main container */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="p-4 border-b border-slate-900 bg-slate-900/30 flex justify-between items-center px-6">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">ADMIN DESK SIGNED AS</span>
            <span className="text-xs font-bold text-slate-200">{adminUser.fullName}</span>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 animate-fade-in-up">
          
          {/* TAB 1: ADMIN OVERVIEW PANEL */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* headline */}
              <div>
                <h2 className="text-xl font-bold text-white font-display">System Statistics</h2>
                <p className="text-xs text-slate-400">Review aggregates of Swift Bank core modules</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Total Approved Deposits", value: `$${stats.totalDepositsAmount.toLocaleString()}`, note: "Completed user deposits", icon: CheckCircle, border: "border-blue-900/30" },
                  { title: "Pending Deposits", value: stats.pendingDepositsCount, note: "Awaiting review", icon: Clock, border: "border-amber-900/30", badge: true },
                  { title: "Total Completed Transfers", value: `$${stats.totalTransfersAmount.toLocaleString()}`, note: "Completed bank transfers", icon: ArrowRightLeft, border: "border-emerald-900/30" },
                  { title: "Pending Transfers", value: stats.pendingTransfersCount, note: "Awaiting review", icon: AlertTriangle, border: "border-purple-900/30" },
                  { title: "Total Active Customers", value: stats.totalUsersCount, note: "Registered users", icon: Users, border: "border-slate-800" },
                  { title: "Active Accounts", value: stats.activeUsersCount, note: "Unrestricted accounts", icon: Check, border: "border-slate-800" },
                  { title: "Blocked Accounts", value: stats.blockedUsersCount, note: "Suspended accounts", icon: ShieldAlert, border: "border-red-900/20" }
                ].map((stat, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl bg-slate-900/40 border ${stat.border} flex justify-between items-start leading-none`}>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2.5">{stat.title}</p>
                      <p className={`text-2xl font-extrabold font-mono tracking-tight ${stat.badge ? 'text-amber-500' : 'text-white'}`}>{stat.value}</p>
                      <p className="text-[9px] text-slate-400 mt-2 font-medium">{stat.note}</p>
                    </div>
                    <stat.icon className={`w-5 h-5 ${stat.badge ? 'text-amber-500' : 'text-slate-500'}`} />
                  </div>
                ))}
              </div>

              {/* Logged clients table summary */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm uppercase text-slate-500 font-bold tracking-widest font-mono">Recent Registered Users</h3>
                  <button onClick={() => setActiveTab('users')} className="text-xs text-blue-500 hover:underline">Manage All clients</button>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-slate-900 bg-slate-905">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="bg-slate-950 uppercase font-bold text-[9px] text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Full Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Account Number</th>
                        <th className="px-6 py-4">Registration Date</th>
                        <th className="px-6 py-4 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {allUsers.slice(0, 4).map(user => (
                        <tr key={user.userId}>
                          <td className="px-6 py-3.5 font-bold text-white max-w-[150px] truncate" title={user.fullName}>{user.fullName}</td>
                          <td className="px-6 py-3.5 font-semibold text-slate-400 max-w-[180px] truncate" title={user.email}>{user.email}</td>
                          <td className="px-6 py-3.5 font-mono select-all text-slate-300">{user.accountNumber}</td>
                          <td className="px-6 py-3.5 text-slate-550">{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-3.5 text-right font-bold text-emerald-400 font-mono">${user.balance.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEPOSIT APPROVALS QUEUE */}
          {activeTab === 'deposits' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Pending Deposits</h2>
                <p className="text-xs text-slate-400">Review and approve pending deposits submitted by bank customers</p>
              </div>

              <div className="space-y-4">
                {allTransactions.filter(t => t.type === 'deposit').map(tx => {
                  const txUserObj = allUsers.find(u => u.userId === tx.userId);
                  return (
                    <div key={tx.id} className="p-5.5 bg-slate-900/60 border border-slate-900 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1 min-w-0 flex-1 w-full text-left">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider truncate">CODE: <span className="text-white font-mono select-all">{tx.id}</span></p>
                        <p className="text-sm font-bold text-white tracking-tight uppercase truncate" title={`${txUserObj?.fullName || "Unregistered"} (${txUserObj?.email})`}>
                          User: {txUserObj?.fullName || "Unregistered"} ({txUserObj?.email})
                        </p>
                        <p className="text-xs text-slate-400 font-medium font-semibold text-slate-400 font-medium truncate" title={tx.notes || "None supplied"}>
                          Notes: "{tx.notes || "None supplied"}" • {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {tx.status === 'pending' ? (
                        <div className="flex space-x-2.5">
                          <button 
                            onClick={() => { dbService.approveDeposit(tx.id); syncAdminState(); }}
                            className="px-3.5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                          <button 
                            onClick={() => { dbService.rejectDeposit(tx.id); syncAdminState(); }}
                            className="px-3.5 py-2 rounded-lg bg-red-650 hover:bg-red-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-xl uppercase text-[10px] font-bold ${tx.status === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-500'}`}>
                          {tx.status}
                        </span>
                      )}
                    </div>
                  );
                })}
                {allTransactions.filter(t => t.type === 'deposit').length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-10">No pending deposit requests.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WIRE TRANSFER QUEUE */}
          {activeTab === 'transfers' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Pending Transfers</h2>
                <p className="text-xs text-slate-400">Review and approve bank transfers</p>
              </div>

              <div className="space-y-4">
                {allTransactions.filter(t => t.type === 'intl_transfer').map(tx => {
                  const txUserObj = allUsers.find(u => u.userId === tx.userId);
                  return (
                    <div key={tx.id} className="p-5 bg-slate-900/60 border border-slate-900 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1 min-w-0 flex-1 w-full text-left">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-500 text-[9px] uppercase font-bold tracking-widest shrink-0">{tx.intlMethod}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-bold select-all uppercase truncate">ID: {tx.id}</span>
                        </div>
                        <p className="text-sm font-bold text-white uppercase mt-1 truncate" title={`Recipient: "${tx.recipientName}" • Customer: ${txUserObj?.fullName}`}>
                          Recipient: "{tx.recipientName}" • Customer: {txUserObj?.fullName}
                        </p>
                        <p className="text-xs text-slate-400 font-semibold truncate" title={`Amount: $${tx.amount.toFixed(2)} • Memo: "${tx.notes || "None"}"`}>
                          Amount: <span className="text-white font-semibold font-mono">${tx.amount.toFixed(2)}</span> • Memo: "{tx.notes || "None"}" • {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {tx.status === 'pending' ? (
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => { dbService.approveTransfer(tx.id); syncAdminState(); }}
                            className="px-3.5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                          <button 
                            onClick={() => { dbService.rejectTransfer(tx.id); syncAdminState(); }}
                            className="px-3.5 py-2 rounded-lg bg-red-650 hover:bg-red-500 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-xl uppercase text-[10px] font-bold ${tx.status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                          {tx.status}
                        </span>
                      )}
                    </div>
                  );
                })}
                {allTransactions.filter(t => t.type === 'intl_transfer').length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-10">No pending wire transfers.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: USERS MANAGEMENT & PORTFOLIOS ACTION */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white font-display">Users Directory</h2>
                  <p className="text-xs text-slate-400">Search user profiles, update account balances, or change user access</p>
                </div>
              </div>

              {/* Input search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Enter name, email address, or account numbers..." 
                  value={userSearchText}
                  onChange={(e) => setUserSearchText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded-2xl py-3 pl-11 pr-4 text-xs select-all text-white focus:outline-none"
                />
              </div>

              {/* User management cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {allUsers.filter(u => u.fullName.toLowerCase().includes(userSearchText.toLowerCase()) || u.email.toLowerCase().includes(userSearchText.toLowerCase()) || u.accountNumber.includes(userSearchText)).map(user => {
                  const isBlocked = user.status === 'blocked';
                  return (
                    <div key={user.userId} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 flex flex-col justify-between">
                      <div>
                        {/* Avatar and Info */}
                        <div className="flex items-center space-x-4 mb-4">
                          <img src={user.profileImage} alt="profile" className="w-12 h-12 rounded-xl object-cover border border-slate-850" />
                          <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-tight">{user.fullName} {user.isAdmin && <span className="text-[8px] bg-red-600 px-1 rounded uppercase tracking-widest text-[#fff]">Admin</span>}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                            <p className="text-[10px] text-slate-500">Acc No: <span className="text-slate-300 font-mono">{user.accountNumber}</span></p>
                          </div>
                        </div>

                        {/* Balance display and state */}
                        <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl flex justify-between items-center mb-4">
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Verified Balance:</span>
                          <span className="text-sm font-mono font-bold text-white">${user.balance.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-900">
                        {/* Edit Balances / Name details button */}
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="flex-1 py-2 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                        >
                          Modify Profile
                        </button>

                        {/* Block unblock safety switch */}
                        <button 
                          onClick={() => toggleBlockUser(user)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isBlocked 
                              ? 'bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white' 
                              : 'bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white'
                          }`}
                        >
                          {isBlocked ? "Lift Hold" : "Enforce Hold"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: SLIDES / CARDS QUEUE APPLICATIONS */}
          {activeTab === 'cards' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Card Requests</h2>
                <p className="text-xs text-slate-400">Review and approve virtual credit and debit card requests</p>
              </div>

              <div className="space-y-4">
                {allCards.map(card => {
                  const cardUserObj = allUsers.find(u => u.userId === card.userId);
                  return (
                    <div key={card.id} className="p-5.5 bg-slate-900/60 border border-slate-900 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-2 min-w-0 flex-1 w-full text-left">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-500 text-[9px] uppercase font-bold tracking-widest shrink-0">{card.brand}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase font-mono truncate">CODE: {card.id}</span>
                        </div>
                        <p className="text-sm font-bold text-white uppercase truncate" title={`Applicant: ${cardUserObj?.fullName} • Address: "${card.billingAddress}, ${card.city}, ${card.zipCode}"`}>
                          Applicant: {cardUserObj?.fullName} • Address: "{card.billingAddress}, {card.city}, {card.zipCode}"
                        </p>
                        <p className="text-xs text-slate-400 font-semibold truncate" title={`Max Daily Limit: $${card.dailyLimit.toLocaleString()} USD • Status: ${card.status}`}>
                          Max Daily Limit: <span className="text-white font-mono">${card.dailyLimit.toLocaleString()} USD</span> • Status: <span className="uppercase text-slate-350">{card.status}</span> • Request Date: {new Date(card.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {card.status === 'pending' ? (
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => approveCard(card.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => rejectCard(card.id)}
                            className="px-4 py-2 bg-red-650 hover:bg-red-550 text-white rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-xl uppercase text-[10px] font-bold ${card.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-500'}`}>
                          {card.status}
                        </span>
                      )}
                    </div>
                  );
                })}
                {allCards.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-10">No pending cards.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: BRANDING AND LANDING PAGE MANAGEMENT */}
          {activeTab === 'landing-page' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Landing Page Content Modulator</h2>
                <p className="text-xs text-slate-400">Instantly update visual slogans, contacts, or answers displayed on the landing view</p>
              </div>

              {showBrandingSuccess && (
                <div className="p-3 bg-green-950/40 border border-green-900/30 text-green-400 rounded-xl text-xs font-semibold animate-bounce">
                  Branding settings applied successfully! System cache updated instantly.
                </div>
              )}

              <form onSubmit={handleBrandingSubmit} className="space-y-6 max-w-2xl bg-slate-900/30 border border-slate-900 p-6 sm:p-8 rounded-3xl">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-450 font-bold uppercase tracking-wider mb-2">Landing Slogan Headline</label>
                    <input 
                      type="text" 
                      required
                      value={heroTitle}
                      onChange={(e) => setHeroTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-450 font-bold uppercase tracking-wider mb-2">Slogan Narrative Subheading</label>
                    <textarea 
                      rows={3}
                      required
                      value={heroSub}
                      onChange={(e) => setHeroSub(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-450 font-bold uppercase tracking-wider mb-2">Company Phone Number</label>
                      <input 
                        type="text" 
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-450 font-bold uppercase tracking-wider mb-2">Company Email</label>
                      <input 
                        type="text" 
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-450 font-bold uppercase tracking-wider mb-2">Headquarters Address</label>
                    <input 
                      type="text" 
                      required
                      value={contactAddress}
                      onChange={(e) => setContactAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-450 font-bold uppercase tracking-wider mb-2">Footer Slogan Narrative</label>
                    <textarea 
                      rows={2}
                      required
                      value={footerAbout}
                      onChange={(e) => setFooterAbout(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-450 font-bold uppercase tracking-wider mb-1.5">Configure FAQs (Separate questions with Q: and answers with A: )</label>
                    <textarea 
                      rows={8}
                      value={faqsRawText}
                      onChange={(e) => setFaqsRawText(e.target.value)}
                      placeholder="Q: Question text here\nA: Answer explanations..."
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-300 font-mono leading-relaxed focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-slate-900 pt-4 mt-2 space-y-2">
                    <label className="block text-xs text-slate-450 font-bold uppercase tracking-wider mb-2">Favicon Icon (32x32px)</label>
                    <div className="flex items-center space-x-4">
                      {faviconUrl ? (
                        <img 
                          src={faviconUrl} 
                          alt="Favicon" 
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 object-cover rounded-md border border-slate-800 bg-slate-950" 
                        />
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center rounded-md border border-dashed border-slate-850 bg-slate-950 text-[10px] text-slate-500">
                          Empty
                        </div>
                      )}
                      <div className="space-y-1">
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="landing-favicon-upload"
                          className="hidden"
                          onChange={handleFaviconUpload}
                        />
                        <label 
                          htmlFor="landing-favicon-upload"
                          className="inline-block px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-xl text-xs text-white font-semibold cursor-pointer transition-all"
                        >
                          {faviconIsUploading ? "Uploading..." : "Upload Favicon Icon"}
                        </label>
                        <p className="text-[10px] text-slate-500">Supported formats: JPG, PNG, ICO, WEBP. Uploaded instantly to database cache.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-lg hover:shadow-blue-600/30 cursor-pointer"
                >
                  Publish Branding Revisions
                </button>
              </form>
            </div>
          )}

          {/* TAB 8: BANK AND CRYPTOCURRENCY DEPOSIT CREDENTIALS SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Deposit Gateway Credentials</h2>
                <p className="text-xs text-slate-400">Configure bank transfer instructions and wallet keys used for user deposit approvals</p>
              </div>

              {showSettingsSuccess && (
                <div className="p-3 bg-green-950/40 border border-green-900/30 text-green-400 rounded-xl text-xs font-semibold animate-pulse">
                  Gateway credential settings saved successfully! System cache updated instantly.
                </div>
              )}

              <form onSubmit={handleSettingsSubmit} className="space-y-6 max-w-2xl bg-slate-900/30 border border-slate-900 p-6 sm:p-8 rounded-3xl">
                {/* Bank transfer controls */}
                <div className="space-y-4">
                  <h3 className="text-xs uppercase text-blue-500 font-mono font-bold tracking-wider border-b border-slate-900 pb-2">1. Bank Transfer Credentials</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Bank Name</label>
                      <input 
                        type="text" 
                        required
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-440 font-bold uppercase tracking-wider mb-2">Account Name</label>
                      <input 
                        type="text" 
                        required
                        value={bankAccountName}
                        onChange={(e) => setBankAccountName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Account Number</label>
                      <input 
                        type="text" 
                        required
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Routing Number</label>
                      <input 
                        type="text" 
                        required
                        value={bankRoutingNumber}
                        onChange={(e) => setBankRoutingNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">SWIFT / BIC Code</label>
                      <input 
                        type="text" 
                        required
                        value={bankSwiftCode}
                        onChange={(e) => setBankSwiftCode(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-440 font-bold uppercase tracking-wider mb-2">Bank Physical Address</label>
                    <input 
                      type="text" 
                      required
                      value={bankAddress}
                      onChange={(e) => setBankAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bitcoin Configurations */}
                <div className="space-y-4 pt-4 border-t border-slate-900">
                  <h3 className="text-xs uppercase text-orange-500 font-mono font-bold tracking-wider border-b border-slate-900 pb-2">2. Bitcoin (BTC) Settings</h3>
                  
                  <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">BTC Wallet Address</label>
                    <input 
                      type="text" 
                      required
                      value={btcAddress}
                      onChange={(e) => setBtcAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">BTC QR Code Image</label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                      {btcQrCodeUrl ? (
                        <img 
                          src={btcQrCodeUrl} 
                          alt="Bitcoin QR Code" 
                          referrerPolicy="no-referrer"
                          className="w-24 h-24 object-cover rounded-xl border border-slate-800 bg-white" 
                        />
                      ) : (
                        <div className="w-24 h-24 flex items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900 text-[10px] text-slate-500">
                          No QR Code
                        </div>
                      )}
                      <div className="space-y-1">
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="btc-qr-upload"
                          className="hidden"
                          onChange={handleBtcQrUpload}
                        />
                        <label 
                          htmlFor="btc-qr-upload"
                          className="inline-block px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-white font-semibold cursor-pointer transition-all"
                        >
                          {btcIsUploading ? "Uploading to Cloudinary..." : "Upload Bitcoin QR Image"}
                        </label>
                        <p className="text-[10px] text-slate-500">Supported formats: JPG, PNG, WEBP. Uploads directly to Cloudinary.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* USDT Configurations */}
                <div className="space-y-4 pt-4 border-t border-slate-900">
                  <h3 className="text-xs uppercase text-teal-500 font-mono font-bold tracking-wider border-b border-slate-900 pb-2">3. USDT Settings</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">USDT Wallet Address</label>
                      <input 
                        type="text" 
                        required
                        value={usdtAddress}
                        onChange={(e) => setUsdtAddress(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Select Network</label>
                      <select
                        value={usdtNetwork}
                        onChange={(e) => setUsdtNetwork(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="TRC20">TRC20 (Tron)</option>
                        <option value="ERC20">ERC20 (Ethereum)</option>
                        <option value="BEP20">BEP20 (Binance Smart Chain)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">USDT QR Code Image</label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                      {usdtQrCodeUrl ? (
                        <img 
                          src={usdtQrCodeUrl} 
                          alt="USDT QR Code" 
                          referrerPolicy="no-referrer"
                          className="w-24 h-24 object-cover rounded-xl border border-slate-800 bg-white" 
                        />
                      ) : (
                        <div className="w-24 h-24 flex items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900 text-[10px] text-slate-500">
                          No QR Code
                        </div>
                      )}
                      <div className="space-y-1">
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="usdt-qr-upload"
                          className="hidden"
                          onChange={handleUsdtQrUpload}
                        />
                        <label 
                          htmlFor="usdt-qr-upload"
                          className="inline-block px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-white font-semibold cursor-pointer transition-all"
                        >
                          {usdtIsUploading ? "Uploading to Cloudinary..." : "Upload USDT QR Image"}
                        </label>
                        <p className="text-[10px] text-slate-500">Supported formats: JPG, PNG, WEBP. Uploads directly to Cloudinary.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Limits & Charges Configurations */}
                <div className="space-y-4 pt-4 border-t border-slate-900">
                  <h3 className="text-xs uppercase text-red-500 font-mono font-bold tracking-wider border-b border-slate-900 pb-2">4. Transaction Limits & Charges</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Min Local Transfer Amount</label>
                      <input 
                        type="number" 
                        required
                        min={0}
                        value={minLocalTransfer}
                        onChange={(e) => setMinLocalTransfer(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Local Transfer Fee Flat Charge (USD)</label>
                      <input 
                        type="number" 
                        required
                        min={0}
                        value={localTransferFee}
                        onChange={(e) => setLocalTransferFee(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Min International Wire Amount</label>
                      <input 
                        type="number" 
                        required
                        min={0}
                        value={minIntlTransfer}
                        onChange={(e) => setMinIntlTransfer(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">International Wire Fee Flat Charge (USD)</label>
                      <input 
                        type="number" 
                        required
                        min={0}
                        value={intlTransferFee}
                        onChange={(e) => setIntlTransferFee(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-lg hover:shadow-blue-600/30 cursor-pointer"
                >
                  Save Gateway Credentials
                </button>
              </form>
            </div>
          )}

          {/* TAB 7: LIVE HELPDESK REAL-TIME MESSAGING CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Live Advisor Assistance Hub</h2>
                <p className="text-xs text-slate-400">Coordinate and answer live financial queries submitted by portfolio holders</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch h-[500px] bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden">
                {/* Tickets list */}
                <div className="lg:col-span-5 border-r border-slate-900 flex flex-col overflow-y-auto">
                  <div className="p-4 bg-slate-950 border-b border-slate-900">
                    <span className="text-xs uppercase text-slate-500 font-bold tracking-widest">Active Conversations</span>
                  </div>
                  <div className="divide-y divide-slate-900/60">
                    {chatTickets().map((tkt) => {
                      const isActive = selectedChatUserId === tkt.userId;
                      return (
                        <div 
                          key={tkt.userId}
                          onClick={() => setSelectedChatUserId(tkt.userId)}
                          className={`p-4 flex items-start justify-between gap-3 cursor-pointer text-left transition-colors hover:bg-slate-900/25 ${isActive ? 'bg-blue-950/20' : ''}`}
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <p className="text-xs font-bold text-white uppercase truncate" title={tkt.userName}>{tkt.userName}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate" title={tkt.lastMessageText}>{tkt.lastMessageText}</p>
                          </div>
                          <div className="flex flex-col items-end space-y-1 shrink-0">
                            {tkt.unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-[9px] font-bold text-white animate-bounce">{tkt.unreadCount}</span>
                            )}
                            <span className="text-[8px] text-slate-500 font-mono">{new Date(tkt.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      );
                    })}
                    {chatTickets().length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-10">No chat logs submitted by users yet.</p>
                    )}
                  </div>
                </div>

                {/* Direct Messages logs conversation panel */}
                <div className="lg:col-span-7 flex flex-col justify-between overflow-hidden">
                  {selectedChatUserId ? (
                    <>
                      {/* Active header */}
                      <div className="p-4 bg-slate-950 border-b border-slate-900 flex justify-between items-center px-6">
                        <div>
                          <p className="text-xs font-bold text-white uppercase">{allUsers.find(u => u.userId === selectedChatUserId)?.fullName || "Swift Bank Client"}</p>
                          <span className="text-[9px] text-slate-500">Secure Live P2P Channel</span>
                        </div>
                        <button 
                          onClick={() => { dbService.closeTicket(selectedChatUserId); syncAdminState(); setSelectedChatUserId(null); }}
                          className="px-2.5 py-1 rounded bg-slate-900 border border-slate-850 text-slate-300 hover:text-white text-[9px] font-bold uppercase transition-all"
                        >
                          Close Ticket
                        </button>
                      </div>

                      {/* Messages loop */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-955">
                        {allMessages.filter(m => m.senderId === selectedChatUserId || (m.senderId === 'admin' && m.isReadByUser !== undefined)).map(mObj => {
                          const isMe = mObj.senderId === 'admin';
                          return (
                            <div key={mObj.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <span className="text-[8px] text-slate-500 mb-0.5 font-mono px-1">{mObj.senderName}</span>
                              <div className={`max-w-[80%] rounded-xl px-3 py-1.5 text-xs break-words whitespace-pre-wrap ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none'}`}>
                                {mObj.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Sender box input */}
                      <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-900 flex items-center space-x-2.5">
                        <input 
                          type="text" 
                          placeholder="Type administrative reply..."
                          value={adminReplyText}
                          onChange={(e) => setAdminReplyText(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                        />
                        <button 
                          type="submit"
                          disabled={!adminReplyText.trim()}
                          className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-colors cursor-pointer disabled:opacity-45"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500">
                      <MessageSquare className="w-12 h-12 mb-2 stroke-1.5 animate-pulse text-slate-650" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-600">No client selected</p>
                      <p className="text-[10px] text-slate-650 text-center mt-1">Select an active conversation on the left list to begin replying in real time.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: BACKUP TRANSACTIONS PANEL */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Historical Ledger Backup Engine</h2>
                <p className="text-xs text-slate-400">Back-office utility to forcefully register past statements, deposit logs, wire transfers, and credit card transits into member portfolios.</p>
              </div>

              {backSuccess && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-900 text-emerald-400 rounded-2xl text-xs font-semibold animate-fade-in">
                  {backSuccess}
                </div>
              )}

              {backError && (
                <div className="p-4 bg-red-950/40 border border-red-900 text-red-400 rounded-2xl text-xs font-semibold animate-fade-in">
                  {backError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* BACKUP FORM PANEL */}
                <form onSubmit={handleBackupSubmit} className="lg:col-span-8 bg-slate-900/30 border border-slate-900 p-6 sm:p-8 rounded-3xl space-y-6">
                  <div className="border-b border-slate-900 pb-4 flex items-center justify-between">
                    <span className="text-xs uppercase text-teal-500 font-mono font-bold tracking-wider">Initialize Historical Ledger Ticket</span>
                    <span className="bg-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-500">ADMINISTRATIVE ACCESS CLIENT</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Select Portfolio Context */}
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Customer Portfolio Registry</label>
                      <select
                        required
                        value={backSelectedUserId}
                        onChange={(e) => setBackSelectedUserId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">-- Select Member Account --</option>
                        {allUsers.filter(u => !u.isAdmin).map((u) => (
                          <option key={u.userId} value={u.userId}>
                            {u.fullName.toUpperCase()} ({u.accountNumber}) — Bal: ${u.balance?.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Transaction Entry Type */}
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Transaction Ledger Type</label>
                      <select
                        value={backTxType}
                        onChange={(e) => {
                          setBackTxType(e.target.value as any);
                          // Suggest realistic fees based on type
                          if (e.target.value === 'intl_transfer') setBackFee(landingSettings.intlTransferFee ?? 25);
                          else if (e.target.value === 'local_transfer') setBackFee(landingSettings.localTransferFee ?? 0);
                          else setBackFee(0);
                        }}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="deposit">Deposit / Top-up (Credit)</option>
                        <option value="withdrawal">Alternative Withdrawal (Debit)</option>
                        <option value="local_transfer">Local Wire Remittance (Debit)</option>
                        <option value="intl_transfer">International Remittance (Debit)</option>
                        <option value="card_payment">Credit / Debit Card Transaction (Debit)</option>
                      </select>
                    </div>

                    {/* Financial Amount */}
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Ledger Amount ($ USD)</label>
                      <input 
                        type="number" 
                        required
                        min="0.01"
                        step="0.01"
                        value={backAmount}
                        onChange={(e) => setBackAmount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g. 2500.00"
                      />
                    </div>

                    {/* Financial Fee */}
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Processing Surcharges / Fee ($)</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        step="0.01"
                        value={backFee}
                        onChange={(e) => setBackFee(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Custom DateTime Picker */}
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Historical Settled Timestamp</label>
                      <input 
                        type="datetime-local" 
                        required
                        value={backDateTime}
                        onChange={(e) => setBackDateTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500">Allows back-dating statements to represent former months or specific schedules.</p>
                    </div>

                    {/* Ledger Status */}
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Ledger Status</label>
                      <select
                        value={backStatus}
                        onChange={(e) => setBackStatus(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="approved">Success / Approved (Settled)</option>
                        <option value="pending">Processing / Pending Audit</option>
                        <option value="rejected">Declined / Failed / Void</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Fields Section based on selected Type */}
                  {(backTxType === 'local_transfer' || backTxType === 'intl_transfer' || backTxType === 'card_payment') && (
                    <div className="p-5 bg-slate-950/40 rounded-2xl border border-slate-900 space-y-4 animate-fade-in">
                      <h4 className="text-[10px] text-blue-500 uppercase font-mono font-bold tracking-wider">
                        {backTxType === 'card_payment' ? "Card Merchant & Narrative Ledger" : "Wire Beneficiary Ledger Info"}
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">
                            {backTxType === 'card_payment' ? "Merchant Name / Outlet" : "Beneficiary / Account Name"}
                          </label>
                          <input 
                            type="text" 
                            required
                            value={backRecipientName}
                            onChange={(e) => setBackRecipientName(e.target.value)}
                            placeholder={backTxType === 'card_payment' ? "e.g. AMZN Prime Membership" : "e.g. John Doe Holdings Ltd"}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        {backTxType !== 'card_payment' && (
                          <div className="space-y-2">
                            <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Beneficiary Bank Account Number</label>
                            <input 
                              type="text" 
                              required
                              value={backRecipientAccount}
                              onChange={(e) => setBackRecipientAccount(e.target.value)}
                              placeholder="e.g. US9912048921"
                              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        )}

                        {backTxType === 'intl_transfer' && (
                          <div className="space-y-2">
                            <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">International Delivery Method</label>
                            <select
                              value={backIntlMethod}
                              onChange={(e) => setBackIntlMethod(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            >
                              <option value="wire">SWIFT/Wire transfer</option>
                              <option value="crypto">Crypto Wallet Delivery</option>
                              <option value="wise">Wise (TransferWise)</option>
                              <option value="paypal">PayPal Escrow</option>
                              <option value="cashapp">CashApp Direct Link</option>
                              <option value="zelle">Zelle Transit Code</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transaction notes & Statement Description */}
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Statement Narrative Description (Visible to User)</label>
                    <textarea 
                      required
                      rows={3}
                      value={backNotes}
                      onChange={(e) => setBackNotes(e.target.value)}
                      placeholder="e.g. Monthly cloud computing service premium authorization, or corporate payout wire index."
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none font-medium"
                    />
                  </div>

                  {/* Balanced Ledger check option */}
                  <div className="p-4 bg-blue-955/10 border border-blue-900/30 rounded-2xl flex items-start space-x-3">
                    <input 
                      type="checkbox" 
                      id="adjustBalance" 
                      checked={backAdjustBalance}
                      onChange={(e) => setBackAdjustBalance(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 bg-slate-950 border-slate-850 rounded focus:ring-blue-500 focus:ring-offset-slate-900 focus:ring-2 pointer-events-auto"
                    />
                    <div className="space-y-1">
                      <label htmlFor="adjustBalance" className="block text-xs font-bold text-white cursor-pointer select-none">
                        Adjust Customer Portfolio Balance Account
                      </label>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        If checked and status is "Approved", this entry will automatically increment (deposits) or debit (transfers, withdrawals, card payments) the user's active wallet balance matching accounting principles. Turn off to insert passive statement lines.
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <button 
                    type="submit" 
                    disabled={backIsSubmitting}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 rounded-xl text-xs font-bold font-mono tracking-wider transition-all disabled:opacity-50 disabled:pointer-events-none uppercase cursor-pointer"
                  >
                    {backIsSubmitting ? "Processing Ledger Injection..." : "Commit Backup Entry"}
                  </button>
                </form>

                {/* TARGET USER PORTFOLIO AUDIT RAIL SUMMARY */}
                <div className="lg:col-span-4 bg-slate-900/30 border border-slate-900 p-6 rounded-3xl space-y-6 text-xs text-slate-400">
                  <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Live Member Dashboard</span>
                    <Clock className="w-4 h-4 text-slate-600" />
                  </div>

                  {backSelectedUserId ? (
                    (() => {
                      const selUser = allUsers.find(u => u.userId === backSelectedUserId);
                      const userTxs = allTransactions.filter(t => t.userId === backSelectedUserId);
                      return selUser ? (
                        <div className="space-y-5">
                          <div className="flex items-center space-x-3 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-900">
                            <img 
                              src={selUser.profileImage || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120"} 
                              alt={selUser.fullName}
                              className="w-10 h-10 rounded-full border border-slate-850 object-cover"
                            />
                            <div>
                              <h4 className="font-bold text-white uppercase">{selUser.fullName}</h4>
                              <p className="text-[10px] text-slate-500 font-mono">{selUser.email}</p>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex justify-between py-1.5 border-b border-slate-900">
                              <span className="font-semibold text-slate-500">Account Number</span>
                              <span className="font-mono text-slate-300 font-bold">{selUser.accountNumber}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-900">
                              <span className="font-semibold text-slate-500">Routing Number</span>
                              <span className="font-mono text-slate-300 font-bold">{landingSettings.bankRoutingNumber || "021000021"}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-900">
                              <span className="font-semibold text-slate-500">Standard Balance</span>
                              <span className="font-mono text-emerald-400 font-bold">${selUser.balance?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-900">
                              <span className="font-semibold text-slate-500">Total Registered Statements</span>
                              <span className="font-mono text-blue-400 font-bold">{userTxs.length} items</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-900">
                              <span className="font-semibold text-slate-500">Account Status</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${selUser.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                                {selUser.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()
                  ) : (
                    <div className="py-12 text-center text-slate-500 max-w-xs mx-auto">
                      <p className="font-semibold uppercase tracking-wider text-[10px] mb-1">Portfolio Inactive</p>
                      <p className="text-[10px] text-slate-600 leading-normal">Choose a registered customer on the form dropdown to view live accounts, balances, and statement statistics in real-time.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* AUDIT BOARD: RECENT INJECTED TRANSACTIONS */}
              <div className="bg-slate-900/30 border border-slate-900 p-6 sm:p-8 rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <span className="text-xs uppercase text-slate-400 font-bold tracking-widest font-mono">Administrative Backup & Injected Transactions Auditor</span>
                  <span className="bg-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-500 font-bold">
                    {allTransactions.filter(t => t.id.startsWith("tx_back_")).length} Custom Audit Records
                  </span>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left divide-y divide-slate-900/40">
                    <thead>
                      <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 font-bold">Member</th>
                        <th className="py-2.5 font-bold">Timestamp</th>
                        <th className="py-2.5 font-bold">Type</th>
                        <th className="py-2.5 font-bold">Amount</th>
                        <th className="py-2.5 font-bold">Fee</th>
                        <th className="py-2.5 font-bold">Particulars / Notes</th>
                        <th className="py-2.5 font-bold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/30 font-medium text-slate-300">
                      {allTransactions.filter(t => t.id.startsWith("tx_back_")).map((t) => {
                        const mUser = allUsers.find(u => u.userId === t.userId);
                        return (
                          <tr key={t.id} className="hover:bg-slate-900/10">
                            <td className="py-3 uppercase font-bold text-white truncate max-w-[150px]">
                              {mUser?.fullName || "Discovered Member"}
                            </td>
                            <td className="py-3 font-mono text-[10px] text-slate-400">
                              {new Date(t.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
                                t.type === 'deposit' 
                                  ? 'bg-green-500/10 text-green-400' 
                                  : t.type === 'card_payment'
                                    ? 'bg-purple-500/10 text-purple-400'
                                    : 'bg-red-500/10 text-red-450'
                              }`}>
                                {t.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 font-mono font-bold text-white font-semibold">
                              ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 font-mono text-slate-400">
                              ${t.fee?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
                            </td>
                            <td className="py-3 text-slate-450 max-w-[200px] truncate leading-normal italic font-semibold">
                              {t.notes}
                            </td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono ${
                                t.status === 'approved' 
                                  ? 'bg-blue-600/25 text-blue-450' 
                                  : t.status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-red-500/10 text-red-500'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {allTransactions.filter(t => t.id.startsWith("tx_back_")).length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-550 italic font-medium">
                            No backup ledger transactions injected via this console yet. Use the form above to add customized statements.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: SECURITY POLICY DECK */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Client Security Panel</h2>
                <p className="text-xs text-slate-400">Manage transaction limits, toggle systemic freezes, and configure customized alert notices for individual customer portfolios.</p>
              </div>

              {securitySuccess && (
                <div className="p-3 bg-emerald-955/40 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs font-semibold animate-pulse">
                  System updated successfully: security directives pushed to production.
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* USER TABLE GRID */}
                <div className="lg:col-span-7 bg-slate-900/40 border border-slate-900/80 p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                    <span className="text-xs uppercase text-slate-400 font-bold tracking-widest font-mono">Portfolio Holders Registry</span>
                    <span className="bg-slate-950 px-2.5 py-0.5 rounded text-[10px] font-mono text-slate-500 font-bold">{allUsers.filter(u => !u.isAdmin).length} Accounts</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs divide-y divide-slate-900/40">
                      <thead>
                        <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          <th className="py-2.5 font-bold">Profile</th>
                          <th className="py-2.5 font-bold">Details</th>
                          <th className="py-2.5 font-bold">Account</th>
                          <th className="py-2.5 font-bold">Status</th>
                          <th className="py-2.5 font-bold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/30 font-medium">
                        {allUsers.filter(u => !u.isAdmin).map((u) => (
                          <tr key={u.userId} className="hover:bg-slate-900/10">
                            <td className="py-3">
                              <img 
                                src={u.profileImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"} 
                                alt={u.fullName}
                                className="w-7 h-7 rounded-full border border-slate-800 object-cover"
                              />
                            </td>
                            <td className="py-3">
                              <p className="font-bold text-white truncate max-w-[120px] uppercase">{u.fullName}</p>
                              <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{u.email}</p>
                            </td>
                            <td className="py-3 text-[10px] font-mono text-slate-300 font-bold">
                              {u.accountNumber || "N/A"}
                            </td>
                            <td className="py-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                u.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'
                              }`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <button 
                                onClick={() => startSecurityEditing(u)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer ${
                                  selectedSecurityUser?.userId === u.userId 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-850'
                                }`}
                              >
                                {selectedSecurityUser?.userId === u.userId ? 'Modifying' : 'Modify'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* EDITING FORM FOR SELECTED USER */}
                <div className="lg:col-span-5 bg-slate-900/40 border border-slate-900 p-6 rounded-2xl">
                  {selectedSecurityUser ? (
                    <form onSubmit={handleSaveSecuritySettings} className="space-y-4">
                      <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] uppercase text-blue-500 font-bold tracking-widest font-mono">Modifying Security</p>
                          <h4 className="text-xs font-extrabold text-white uppercase">{selectedSecurityUser.fullName}</h4>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSelectedSecurityUser(null)}
                          className="p-1 hover:bg-slate-850 rounded text-slate-500 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Restrict Transfers ON/OFF */}
                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-900 rounded-xl">
                          <div className="space-y-0.5 text-left">
                            <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">Restrict Transfers</label>
                            <span className="text-[9px] text-slate-500 font-medium font-semibold">Freeze all transaction capabilities</span>
                          </div>
                          <input 
                            type="checkbox"
                            checked={securityRestrictTransfers}
                            onChange={(e) => setSecurityRestrictTransfers(e.target.checked)}
                            className="accent-red-650 h-4 w-4 bg-slate-900 rounded border-slate-850 cursor-pointer"
                          />
                        </div>

                        {/* Trigger Transfer Number */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Trigger Transfer Threshold Index</label>
                          <input 
                            type="number"
                            required
                            min={1}
                            value={securityTxLimit}
                            onChange={(e) => setSecurityTxLimit(Number(e.target.value))}
                            placeholder="e.g. 2"
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                          <p className="text-[9px] text-slate-500 mt-1 leading-relaxed font-semibold">Automatically shows alert when customer attempts Nth transfer (e.g. 2 means they can do 1 but get blocked on their 2nd attempt).</p>
                        </div>

                        {/* Security Notice Title */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Security Notice Title</label>
                          <input 
                            type="text"
                            required
                            value={securityWarningTitle}
                            onChange={(e) => setSecurityWarningTitle(e.target.value)}
                            placeholder="Headline displayed"
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                          />
                        </div>

                        {/* Security Notice Message */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Security Notice Message</label>
                          <textarea 
                            required
                            rows={4}
                            value={securityWarningMessage}
                            onChange={(e) => setSecurityWarningMessage(e.target.value)}
                            placeholder="Explaining the procedural check"
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-semibold leading-relaxed"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs active:scale-95 transition-all shadow-md hover:shadow-blue-600/10 cursor-pointer"
                      >
                        Push Security Updates
                      </button>
                    </form>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
                      <FolderLock className="w-10 h-10 stroke-1 text-slate-700 animate-pulse" />
                      <p className="text-[10px] uppercase font-mono tracking-widest font-bold text-slate-650">Select Portfolio Holder</p>
                      <p className="text-[9.5px] text-slate-650 max-w-xs text-center font-semibold leading-relaxed">Select any customer from the registry deck to modify transfer thresholds, systemic locks, and warnings.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* --- FLOATING LIGHT USER EDIT PROFILE BACKEND MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto scrollbar-none">
            <h4 className="text-xs uppercase text-blue-500 font-bold tracking-widest mb-1.5 font-display">Modify Client Parameters</h4>
            <p className="text-[10px] text-slate-400 mb-6 font-semibold">Mutate display name, email registration address, and live wallet balances instantly.</p>
            <form onSubmit={handleSaveUserRevision} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Full Legal Name</label>
                <input 
                  type="text" 
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Email Coordinates</label>
                <input 
                  type="email" 
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Authorized Balance (USD)</label>
                <input 
                  type="number" 
                  value={editingUser.balance}
                  onChange={(e) => setEditingUser({ ...editingUser, balance: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Anti-Fraud Restriction Portal */}
              <div className="border-t border-slate-800 pt-4 mt-2 space-y-3 text-left">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block font-mono">Anti-Fraud Controls</span>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="restrict-active"
                    checked={!!editingUser.restrictActive}
                    onChange={(e) => setEditingUser({ ...editingUser, restrictActive: e.target.checked })}
                    className="accent-red-600 rounded bg-slate-950 border-slate-800 h-3.5 w-3.5"
                  />
                  <label htmlFor="restrict-active" className="text-[10px] text-slate-300 font-bold uppercase tracking-wider cursor-pointer">
                    Enable Transfer restriction
                  </label>
                </div>

                {editingUser.restrictActive && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Block on Transfer Index (e.g. 2)</label>
                      <input 
                        type="number" 
                        required
                        min={1}
                        value={editingUser.restrictTransferIndex || 1}
                        onChange={(e) => setEditingUser({ ...editingUser, restrictTransferIndex: Number(e.target.value) })}
                        placeholder="Block on Nth transfer"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Transaction Not Complete Message</label>
                      <textarea 
                        required
                        rows={2}
                        value={editingUser.restrictMessage || ""}
                        onChange={(e) => setEditingUser({ ...editingUser, restrictMessage: e.target.value })}
                        placeholder="e.g. Transaction incomplete. Please contact security support."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none font-semibold text-red-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2.5 pt-2">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 hover:text-white border border-slate-850 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Commit Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
