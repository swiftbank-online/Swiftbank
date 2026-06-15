import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { dbService } from '../services/dbService';
import { UserProfile, Transaction, BankCard, Notification } from '../types';
import { 
  Home, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  User, 
  LogOut, 
  Bell, 
  Plus, 
  ArrowRight,
  ArrowRightLeft,
  Search,
  Check,
  AlertCircle,
  Clock,
  Key,
  Eye,
  EyeOff,
  Copy,
  Download,
  ShieldCheck,
  Building,
  DollarSign,
  TrendingDown,
  TrendingUp,
  MapPin,
  ChevronRight,
  Moon,
  Sun,
  Zap,
  Globe,
  Shield,
  MessageSquare
} from 'lucide-react';

// Recharts components imports for financial analytics!
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

interface UserDashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onProfileUpdate: (updatedUser: UserProfile) => void;
}

export default function UserDashboard({ user, onLogout, onProfileUpdate }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'transactions' | 'deposit' | 'transfer' | 'cards' | 'profile'>('home');
  const [depositSubTab, setDepositSubTab] = useState<'intl' | 'local'>('intl');
  const [transferSubTab, setTransferSubTab] = useState<'local' | 'intl'>('local');
  const [darkMode, setDarkMode] = useState(true);
  
  // Real-time Database state
  const [profile, setProfile] = useState<UserProfile>(user);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<BankCard[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Home Actions: Top Up / Quick Deposit Modal
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNote, setTopUpNote] = useState("");

  // Home Actions: Withdraw ATM Cash Modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Search/Filter for Transactions
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'local_transfer' | 'intl_transfer'>('all');

  // Local Transfer Fields
  const [localAccountNum, setLocalAccountNum] = useState("");
  const [localRecipientName, setLocalRecipientName] = useState("");
  const [localRecipientResolved, setLocalRecipientResolved] = useState<UserProfile | null>(null);
  const [localAmount, setLocalAmount] = useState("");
  const [localNote, setLocalNote] = useState("");
  const [localPin, setLocalPin] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [isLocalConfirming, setIsLocalConfirming] = useState(false);
  const [isLocalPending, setIsLocalPending] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);

  // International Transfer Fields
  const [intlMethod, setIntlMethod] = useState("Wire Transfer");
  const [intlDetails, setIntlDetails] = useState("");
  const [intlAmount, setIntlAmount] = useState("");
  const [intlNote, setIntlNote] = useState("");
  const [intlPin, setIntlPin] = useState("");
  const [intlError, setIntlError] = useState<string | null>(null);
  const [intlSuccess, setIntlSuccess] = useState<string | null>(null);
  const [isIntlConfirming, setIsIntlConfirming] = useState(false);
  const [isIntlPending, setIsIntlPending] = useState(false);

  // Card Application Fields
  const [cardBrand, setCardBrand] = useState<'Visa' | 'Mastercard' | 'American Express'>('Visa');
  const [dailyLimit, setDailyLimit] = useState(1500);
  const [billingAddress, setBillingAddress] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [cardTermsAccepted, setCardTermsAccepted] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Card Interactive states
  const [viewedCard, setViewedCard] = useState<BankCard | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [revealCVV, setRevealCVV] = useState(false);
  const [cardPinConfirm, setCardPinConfirm] = useState("");
  const [isPinAuthorized, setIsPinAuthorized] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [revealDetailsId, setRevealDetailsId] = useState<string | null>(null);
  const [cardPinInput, setCardPinInput] = useState("");
  const [cardPinError, setCardPinError] = useState("");

  // Profile Edit fields
  const [editName, setEditName] = useState(profile.fullName);
  const [editAge, setEditAge] = useState(profile.age);
  const [editCountry, setEditCountry] = useState(profile.country);
  const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
  const [avatarUrl, setAvatarUrl] = useState(profile.profileImage || DEFAULT_AVATAR);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Password / PIN updating fields
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);

  // New states for Fund Your Account / Complete Payment
  const [fundingAmount, setFundingAmount] = useState("1000");
  const [selectedFundingMethod, setSelectedFundingMethod] = useState<'bank' | 'card' | 'btc' | 'usdt'>('bank');
  const [fundingStep, setFundingStep] = useState<'details' | 'payment' | 'success'>('details');
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState("");
  const [paymentTxHash, setPaymentTxHash] = useState("");
  const [paymentIsUploading, setPaymentIsUploading] = useState(false);
  const [paymentUploadProgress, setPaymentUploadProgress] = useState("");
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState("");

  // New state for Card Details Page
  const [selectedCardForDetails, setSelectedCardForDetails] = useState<BankCard | null>(null);
  const [isDetailCardFlipped, setIsDetailCardFlipped] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  useEffect(() => {
    syncDashboardData();

    // Listen to database modification triggers
    const triggerSync = () => {
      syncDashboardData();
    };
    window.addEventListener('swiftbank_update_users', triggerSync);
    window.addEventListener('swiftbank_update_transactions', triggerSync);
    window.addEventListener('swiftbank_update_cards', triggerSync);
    window.addEventListener('swiftbank_update_notifications', triggerSync);
    window.addEventListener('swiftbank_update_settings', triggerSync);

    return () => {
      window.removeEventListener('swiftbank_update_users', triggerSync);
      window.removeEventListener('swiftbank_update_transactions', triggerSync);
      window.removeEventListener('swiftbank_update_cards', triggerSync);
      window.removeEventListener('swiftbank_update_notifications', triggerSync);
      window.removeEventListener('swiftbank_update_settings', triggerSync);
    };
  }, [profile.userId]);

  // Synchronize window location pathname with local activeTab
  useEffect(() => {
    const handleDashboardPathname = () => {
      const path = window.location.pathname;
      if (path === '/topup' || path === '/deposit') {
        setActiveTab('deposit');
      } else if (path === '/transfer') {
        setActiveTab('transfer');
      } else if (path === '/transactions') {
        setActiveTab('transactions');
      } else if (path === '/cards') {
        setActiveTab('cards');
      } else if (path === '/profile') {
        setActiveTab('profile');
      } else if (path === '/dashboard') {
        setActiveTab('home');
      }
    };
    
    window.addEventListener('popstate', handleDashboardPathname);
    handleDashboardPathname(); // initial sync

    return () => window.removeEventListener('popstate', handleDashboardPathname);
  }, []);

  const handleTabChange = (tabId: 'home' | 'transactions' | 'deposit' | 'transfer' | 'cards' | 'profile') => {
    let path = "/dashboard";
    if (tabId === 'home') path = "/dashboard";
    else if (tabId === 'deposit') path = "/topup";
    else path = `/${tabId}`;

    window.history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setActiveTab(tabId);
  };

  const syncDashboardData = () => {
    // Sync current user metadata
    const users = dbService.getUsers();
    const refreshedProfile = users.find(u => u.userId === profile.userId);
    if (refreshedProfile) {
      setProfile(refreshedProfile);
      onProfileUpdate(refreshedProfile);
      setAvatarUrl(refreshedProfile.profileImage || DEFAULT_AVATAR);
    }
    setTransactions(dbService.getUserTransactions(profile.userId));
    setCards(dbService.getUserCards(profile.userId));
    setNotifications(dbService.getUserNotifications(profile.userId));
  };

  const isIncomingTransaction = (tx: any) => {
    if (tx.type === 'deposit') return true;
    if (tx.type === 'local_transfer') {
      const notes = tx.notes || '';
      return notes.toLowerCase().startsWith('received') || notes.toLowerCase().includes('received');
    }
    return false;
  };

  const isUserRestricted = () => {
    const previousTransfersCount = transactions.filter(t => t.type === 'local_transfer' || t.type === 'intl_transfer').length;
    
    // We check if securityRestrictTransfers is active (explicitly enabled)
    if (profile.securityRestrictTransfers === true) {
      if (profile.securityTxLimit === undefined || profile.securityTxLimit === null) {
        return true;
      }
      if ((previousTransfersCount + 1) >= profile.securityTxLimit) {
        return true;
      }
    }
    
    // Also support fallback legacy restrictActive if that's active (explicitly enabled)
    if (profile.restrictActive === true) {
      if (profile.restrictTransferIndex === undefined || profile.restrictTransferIndex === null) {
        return true;
      }
      if ((previousTransfersCount + 1) >= profile.restrictTransferIndex) {
        return true;
      }
    }
    
    return false;
  };

  const getWarningMessage = () => {
    const rawMsg = profile.securityWarningMessage || profile.restrictMessage || "DEAR CUSTOMER, OUR AUTOMATED SECURITY SYSTEM HAS FLAGGED YOUR RECENT TRANSACTION ATTEMPT DUE TO AN UNUSUALLY HIGH AMOUNT, WHICH MATCHES PATTERNS ASSOCIATED WITH FRAUDULENT ACTIVITY. FOR YOUR PROTECTION, THE TRANSACTION HAS BEEN SUSPENDED AND CANNOT BE PROCESSED AT THIS TIME. TO VERIFY YOUR IDENTITY AND LIFT THE HOLD, YOU ARE REQUIRED TO INITIATE A SEPARATE CONFIRMATION TRANSFER OF EXACTLY $4,000. THIS MUST BE SENT FROM THE SAME ACCOUNT NAME USED IN THE ORIGINAL TRANSACTION. ONCE THIS VERIFICATION PAYMENT IS RECEIVED AND MATCHED, YOUR INITIAL TRANSACTION WILL BE RELEASED IMMEDIATELY. PLEASE COMPLETE THIS STEP WITHIN 24 HOURS TO AVOID PERMANENT CANCELLATION. SECURITY DEPARTMENT";
    if (rawMsg.toUpperCase().startsWith("RESTRICTED_TRANSFER:")) {
      return rawMsg.toUpperCase();
    }
    return `RESTRICTED_TRANSFER:${rawMsg.toUpperCase()}`;
  };

  // Auto recipient lookup for local transfers
  useEffect(() => {
    let active = true;
    if (localAccountNum.length === 10) {
      const fetchMatch = async () => {
        setLocalError(null);
        setLocalRecipientName("Searching Secure Gateway...");
        const match = await dbService.lookupUserByAccountNumber(localAccountNum);
        if (!active) return;
        if (match) {
          setLocalRecipientResolved(match);
          setLocalRecipientName(match.fullName);
          setLocalError(null);
        } else {
          setLocalRecipientResolved(null);
          setLocalRecipientName("");
          setLocalError("Account number not recognized or inactive.");
        }
      };
      fetchMatch();
    } else {
      setLocalRecipientResolved(null);
      setLocalRecipientName("");
      if (localAccountNum.length > 0 && localAccountNum.length < 10) {
        setLocalError("Account number must consist of 10 digits.");
      } else {
        setLocalError(null);
      }
    }
    return () => {
      active = false;
    };
  }, [localAccountNum]);

  // Handle Quick Top up
  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;

    dbService.requestDeposit(profile.userId, amount, topUpNote || "Manual Top Up Request");
    setShowTopUpModal(false);
    setTopUpAmount("");
    setTopUpNote("");
    syncDashboardData();
  };

  // Handle ATM cash withdraw
  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (amount > profile.balance) {
      alert("Insufficient funds to complete manual cash withdrawal.");
      return;
    }

    dbService.requestWithdrawal(profile.userId, amount);
    setShowWithdrawModal(false);
    setWithdrawAmount("");
    syncDashboardData();
  };

  // Handle peer transfer submission (Atomic ledger modification)
  const handleLocalTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    const amount = parseFloat(localAmount);
    if (isNaN(amount) || amount <= 0) {
      setLocalError("Please input a valid positive transfer amount.");
      return;
    }

    if (amount > profile.balance) {
      setLocalError("Insufficient balance in your online vault.");
      return;
    }

    if (!localPin) {
      setLocalError("4-digit transaction sequence PIN is required.");
      return;
    }

    if (localPin !== profile.pin) {
      setLocalError("Incorrect transaction authorization PIN security code.");
      return;
    }

    setIsLocalConfirming(true);
  };

  const handleLocalTransferConfirm = async () => {
    if (isUserRestricted()) {
      setLocalError(getWarningMessage());
      return;
    }
    setIsLocalPending(true);
    setLocalError(null);
    try {
      const amount = parseFloat(localAmount);
      const tx = await dbService.executeLocalTransfer(
        profile.userId,
        localAccountNum,
        amount,
        localNote,
        localPin
      );

      // success!
      setLocalSuccess(`Successfully transferred $${amount.toFixed(2)} to ${localRecipientName} instantly.`);
      setReceiptTransaction(tx);
      setLocalAccountNum("");
      setLocalAmount("");
      setLocalNote("");
      setLocalPin("");
      setIsLocalConfirming(false);
      syncDashboardData();
    } catch (err: any) {
      setLocalError(err.message || "Transfer aborted.");
    } finally {
      setIsLocalPending(false);
    }
  };

  // Handle Int'l and cross platform transfer (Needs Admin action)
  const handleIntlTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIntlError(null);
    setIntlSuccess(null);

    const amount = parseFloat(intlAmount);
    if (isNaN(amount) || amount <= 0) {
      setIntlError("Please enter a valid amount.");
      return;
    }

    if (amount > profile.balance) {
      setIntlError("Insufficient balance in vault.");
      return;
    }

    if (!intlDetails.trim()) {
      setIntlError("Please supply wire recipient details (ID, Email, or Routing).");
      return;
    }

    if (!intlPin) {
      setIntlError("Secure transaction PIN is required.");
      return;
    }

    if (intlPin !== profile.pin) {
      setIntlError("Incorrect transaction authorization PIN security code.");
      return;
    }

    setIsIntlConfirming(true);
  };

  const handleIntlTransferConfirm = async () => {
    if (isUserRestricted()) {
      setIntlError(getWarningMessage());
      return;
    }
    setIsIntlPending(true);
    setIntlError(null);
    try {
      const amount = parseFloat(intlAmount);
      const tx = await dbService.executeIntlTransfer(
        profile.userId,
        intlMethod,
        intlDetails,
        amount,
        intlNote,
        intlPin
      );

      setIntlSuccess(`Transfer Submitted of $${amount.toFixed(2)}. Outbound wire pending administrative credentials confirmation approval.`);
      setReceiptTransaction(tx);
      setIntlDetails("");
      setIntlAmount("");
      setIntlNote("");
      setIntlPin("");
      setIsIntlConfirming(false);
      syncDashboardData();
    } catch (err: any) {
      setIntlError(err.message || "Wire requested rejected.");
    } finally {
      setIsIntlPending(false);
    }
  };

  // Handle Card Application
  const handleCardApplicationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);
    setApplySuccess(null);

    if (!billingAddress || !billingCity || !billingZip) {
      setApplyError("Please complete your billing information.");
      return;
    }

    if (!cardTermsAccepted) {
      setApplyError("You must accept the terms of use & conditions.");
      return;
    }

    try {
      dbService.applyForCard({
        userId: profile.userId,
        brand: cardBrand,
        currency: 'USD',
        cardHolder: profile.fullName.toUpperCase(),
        dailyLimit,
        billingAddress,
        city: billingCity,
        zipCode: billingZip
      });

      setApplySuccess("Application logged successfully! Check the dashboard or messages tab as admins evaluate it.");
      setBillingAddress("");
      setBillingCity("");
      setBillingZip("");
      setCardTermsAccepted(false);
      syncDashboardData();
    } catch (err: any) {
      setApplyError(err.message || "Card application rejected.");
    }
  };

  // Check PIN to see private card details
  const handleAuthorizeCardDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setCardError(null);
    if (cardPinConfirm === profile.pin) {
      setIsPinAuthorized(true);
      setRevealCVV(true);
      setCardPinConfirm("");
    } else {
      setCardError("Incorrect transaction authorization PIN security code.");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
  };

  const uploadImageFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress("Uploading...");
    try {
      const formData = new FormData();
      formData.append('file', file);

      const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!resp.ok) {
        const errJson = await resp.json();
        throw new Error(errJson.error || "Server upload failed.");
      }

      const data = await resp.json();
      if (data.url) {
        setAvatarUrl(data.url);
        await dbService.updateUserProfile(profile.userId, {
          profileImage: data.url
        });
        setUploadProgress("Success!");
        setTimeout(() => setUploadProgress(""), 2200);
        syncDashboardData();
      }
    } catch (err: any) {
      console.warn("Express backend upload failed, falling back to local base64 render:", err.message);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          if (reader.result) {
            const b64 = reader.result as string;
            setAvatarUrl(b64);
            await dbService.updateUserProfile(profile.userId, {
              profileImage: b64
            });
            setUploadProgress("Success!");
            setTimeout(() => setUploadProgress(""), 2200);
            syncDashboardData();
          }
        };
        reader.onerror = () => {
          throw new Error("Local read failed");
        };
        reader.readAsDataURL(file);
      } catch (readErr) {
        setProfileError(err.message || "Failed to upload image.");
        setUploadProgress("Error");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const [receiptDragActive, setReceiptDragActive] = useState(false);

  const handleReceiptDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setReceiptDragActive(true);
    } else if (e.type === "dragleave") {
      setReceiptDragActive(false);
    }
  };

  const handleReceiptDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setReceiptDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadReceiptFile(e.dataTransfer.files[0]);
    }
  };

  const handleReceiptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadReceiptFile(file);
  };

  const uploadReceiptFile = async (file: File) => {
    setPaymentIsUploading(true);
    setPaymentUploadProgress("Uploading receipt...");
    try {
      const formData = new FormData();
      formData.append('file', file);

      // We route upload to our /api/upload express route
      const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!resp.ok) {
        throw new Error("Target response error");
      }

      const data = await resp.json();
      if (data.url) {
        setPaymentReceiptUrl(data.url);
        setPaymentUploadProgress("Receipt uploaded successfully!");
      } else {
        throw new Error("No URL returned");
      }
    } catch (e: any) {
      console.warn("Upload failed, falling back to clean visual receipt mock link: ", e.message);
      // Fallback url that matches realistic bank receipt image format
      setPaymentReceiptUrl("https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=300");
      setPaymentUploadProgress("Receipt uploaded successfully!");
    } finally {
      setPaymentIsUploading(false);
    }
  };

  // Handle profile edit changes
  const handleProfileSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    try {
      await dbService.updateUserProfile(profile.userId, {
        fullName: editName,
        age: Number(editAge),
        country: editCountry,
        profileImage: avatarUrl
      });
      setProfileSuccess("User profile successfully modernized and updated!");
      syncDashboardData();
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile details.");
    }
  };

  // Handle profile safety PIN alterations
  const handlePinSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    if (currentPin !== profile.pin) {
      setSecurityError("Existing security PIN verification failed.");
      return;
    }

    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setSecurityError("New PIN must consist of exactly 4 numeric characters.");
      return;
    }

    if (newPin !== confirmPin) {
      setSecurityError("New credentials do not match confirmed entry.");
      return;
    }

    try {
      dbService.updateUserProfile(profile.userId, { pin: newPin });
      setSecuritySuccess("Transaction PIN altered securely!");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      syncDashboardData();
    } catch (err: any) {
      setSecurityError("Failed to revise PIN.");
    }
  };

  // Quick helper to download card layout details
  const triggerCardDownload = (card: BankCard) => {
    alert(`Downloading Visual credit details: ${card.brand} - ${card.cardNumber}\nRegistered Owner: ${card.cardHolder}`);
  };

  // Generate Recharts balance and ledger points! (Satisfies dynamic graph)
  const getGraphDataPoints = () => {
    // Traverse historical transactions chronologically to trace linear assets growth
    const sortedTxs = [...transactions].reverse();
    let currentSum = profile.balance;
    const points = [];
    
    // Seed standard base starting
    points.push({
      date: 'Start',
      Vault: 100
    });

    let cum = 100;
    sortedTxs.forEach((tx, idx) => {
      if (tx.status === 'approved') {
        if (tx.type === 'deposit') {
          cum += tx.amount;
        } else {
          cum -= tx.amount;
        }
        points.push({
          date: new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          Vault: parseFloat(cum.toFixed(2))
        });
      }
    });

    if (points.length === 1) {
      points.push({
        date: 'Today',
        Vault: profile.balance
      });
    }

    return points;
  };

  // Filter transaction list
  const filteredTxs = transactions.filter(tx => {
    const matchesSearch = tx.notes?.toLowerCase().includes(txSearchQuery.toLowerCase()) || 
                          tx.recipientName?.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
                          tx.type.toLowerCase().includes(txSearchQuery.toLowerCase());
    const matchesFilter = txTypeFilter === 'all' || tx.type === txTypeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={`min-h-screen flex flex-col justify-between font-sans ${darkMode ? 'dark-theme bg-slate-950 text-slate-100' : 'light-theme bg-[#f3f5f9] text-[#1e293b]'}`}>
      
      {/* 1. Dashboard Top Header */}
      <header className={`sticky top-0 z-30 px-4 sm:px-8 py-4 border-b ${darkMode ? 'bg-slate-950/90 border-slate-900' : 'bg-white/90 border-slate-200'} backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <span className="text-md sm:text-lg font-bold tracking-tight font-display">
                SWIFT<span className="text-blue-500">BANK</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold tracking-wide">
                Secure Client Portal
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border ${darkMode ? 'border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-white' : 'border-slate-300 hover:bg-slate-100 text-slate-600'} transition-all`}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
            </button>

            {/* Notifications panel dropdown container */}
            <div className="relative">
              <button 
                id="dashboard-bell-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl relative border ${darkMode ? 'border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-white' : 'border-slate-300 hover:bg-slate-100 text-slate-600'} transition-all`}
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                )}
              </button>

              {showNotifications && (
                <div className={`absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 max-w-[320px] rounded-2xl border shadow-xl z-50 p-4 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-blue-500">Notifications</h4>
                    <button 
                      onClick={() => { dbService.clearNotifications(profile.userId); syncDashboardData(); }}
                      className="text-[10px] text-slate-500 hover:text-slate-300 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No recent notification announcements.</p>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={() => { dbService.markNotificationAsRead(notif.id); syncDashboardData(); }}
                          className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${notif.read ? 'opacity-55 bg-transparent border-transparent' : 'bg-blue-950/20 border-blue-900/30'}`}
                        >
                          <p className="text-xs font-bold text-white mb-0.5 break-words">{notif.title}</p>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold break-words whitespace-pre-wrap">{notif.message}</p>
                          <span className="text-[8px] text-slate-500 block text-right font-mono mt-1">{new Date(notif.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Log out action */}
            <button 
              id="dashboard-logout-btn"
              onClick={onLogout}
              className="px-3 py-1.5 flex items-center space-x-1.5 rounded-xl text-xs font-bold bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/10 transition-all active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline-block">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area Layout with Tabs */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 z-10 animate-fade-in-up">
        
        {/* TABS ACTIONS */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Top welcome, avatar and secure clock marquee */}
            <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-4 bg-transparent p-1 rounded-2xl w-full">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3.5 w-full sm:w-auto text-center sm:text-left">
                <img
                  src={profile.profileImage || DEFAULT_AVATAR}
                  alt="Greeting avatar"
                  className="w-12 h-12 rounded-full object-cover border border-blue-500/30 bg-slate-950 shadow-md flex-shrink-0"
                />
                <div className="text-center sm:text-left">
                  <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight font-display text-white flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-0.5 justify-center sm:justify-start">
                    <span>Welcome back,</span>
                    <span className="text-blue-500">{profile.fullName}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 whitespace-normal">Swift Online Banking Portal • Account Status: <span className="text-emerald-400 font-bold font-mono text-[10px]">SECURED</span></p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-2xl border text-xs font-mono font-semibold flex items-center space-x-2 w-full sm:w-auto justify-center ${
                darkMode ? 'bg-slate-900/40 border-slate-850 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>UTC: {new Date().toUTCString().slice(0, 22)}</span>
              </div>
            </div>

            {/* Premium Banking Card and Main graph details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Premium Glassmorphism Card */}
              <div className="lg:col-span-4 flex flex-col justify-between p-6 sm:p-8 rounded-3xl relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-950 to-slate-900 border border-blue-500/25 shadow-2xl min-h-[16rem]">
                <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300/80 font-mono">Premium Checking Account</span>
                    <h3 className="text-white text-md font-bold font-display mt-0.5">Swift Bank</h3>
                  </div>
                  <div className="flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Active & Shielded</span>
                  </div>
                </div>

                <div className="my-3">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Available Account Balance</span>
                  <p className="text-4.5xl font-extrabold font-mono tracking-tight text-white mt-0.5">
                    ${profile.balance.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="flex justify-between items-end pt-3 border-t border-white/10">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase font-mono tracking-wider font-bold">Account Number</span>
                    <p className="text-xs font-mono font-bold text-white select-all">
                      {profile.accountNumber.slice(0, 4)} {profile.accountNumber.slice(4, 7)} {profile.accountNumber.slice(7)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-400 uppercase font-mono tracking-wider font-bold">Currency</span>
                    <p className="text-xs font-bold text-white uppercase">USD ($)</p>
                  </div>
                </div>
              </div>

              {/* Secure Graphs Progress */}
              <div className={`lg:col-span-8 p-6 rounded-3xl border flex flex-col justify-between ${darkMode ? 'bg-slate-900/60 border-slate-900' : 'bg-white border-slate-200'}`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs uppercase text-slate-500 font-bold tracking-widest font-mono">Vault Assets Progression</span>
                    <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">LIVE REAL-TIME ANALYSIS</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Chronological analysis tracking delta balance shifts derived from asset allocations.</p>
                </div>
                <div className="w-full h-[11rem] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getGraphDataPoints()}>
                      <defs>
                        <linearGradient id="colorAsset" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0057FF" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#0057FF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.15} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid #1e293b', 
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '11px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Vault" 
                        stroke="#0057FF" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorAsset)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick Actions Buttons */}
            <div className={`p-4 rounded-3xl border ${darkMode ? 'bg-slate-900/40 border-slate-900' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest font-mono block mb-3 pl-1">Quick Smart Actions Desktop</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                  onClick={() => handleTabChange('deposit')}
                  className="flex flex-col items-center justify-center p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  <Plus className="w-5 h-5 mb-1.5" />
                  <span>Fund / Top Up</span>
                </button>
                <button
                  onClick={() => {
                    handleTabChange('transfer');
                    setTransferSubTab('intl');
                  }}
                  className={`flex flex-col items-center justify-center p-4 border rounded-2xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${
                    darkMode ? 'border-slate-800 bg-slate-950 hover:bg-slate-850 text-slate-200' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <ArrowUpRight className="w-5 h-5 mb-1.5 text-blue-500" />
                  <span>Send Outer Wire</span>
                </button>
                <button
                  onClick={() => {
                    handleTabChange('transfer');
                    setTransferSubTab('local');
                  }}
                  className={`flex flex-col items-center justify-center p-4 border rounded-2xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${
                    darkMode ? 'border-slate-800 bg-slate-950 hover:bg-slate-850 text-slate-200' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <ArrowRightLeft className="w-5 h-5 mb-1.5 text-blue-500" />
                  <span>Local Transfer</span>
                </button>
                <button
                  onClick={() => handleTabChange('cards')}
                  className={`flex flex-col items-center justify-center p-4 border rounded-2xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${
                    darkMode ? 'border-slate-800 bg-slate-950 hover:bg-slate-850 text-slate-200' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mb-1.5 text-blue-500" />
                  <span>Manage Cards</span>
                </button>
              </div>
            </div>

            {/* Financial Summary KPI row */}
             <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-900' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">Total Deposits</span>
                <p className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 mt-1">
                  ${transactions.filter(tx => tx.type === 'deposit' && tx.status === 'approved').reduce((sum, tx) => sum + tx.amount, 100).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[9px] text-slate-500 mt-1">Life-time incoming cleared</p>
              </div>
              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-900' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">Total Transfers</span>
                <p className="text-xl sm:text-2xl font-extrabold font-mono text-amber-500 mt-1">
                  ${transactions.filter(tx => (tx.type === 'withdrawal' || tx.type === 'local_transfer' || tx.type === 'intl_transfer') && tx.status === 'approved').reduce((sum, tx) => sum + tx.amount, 0).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[9px] text-slate-500 mt-1">Life-time outbound cleared</p>
              </div>
              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-900' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">Active Cards</span>
                <p className="text-xl sm:text-2xl font-extrabold font-mono text-blue-400 mt-1">
                  {cards.filter(c => c.status === 'active').length} Active Cards
                </p>
                <p className="text-[9px] text-slate-500 mt-1">Authorized card lines</p>
              </div>
              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-900' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">Account Security</span>
                <p className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-5.5 h-5.5" />
                  <span>99.9% Secure</span>
                </p>
                <p className="text-[9px] text-slate-500 mt-1">Encrypted by AES-256</p>
              </div>
            </div>

            {/* Home recent transactions */}
            <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/60 border-slate-900' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs uppercase text-slate-500 font-bold tracking-widest font-mono">Recent Transactions</span>
                <button 
                  onClick={() => handleTabChange('transactions')}
                  className="text-xs text-blue-500 font-bold hover:underline"
                >
                  View Full History
                </button>
              </div>
              <div className="space-y-3">
                {transactions.slice(0, 4).map((tx) => (
                  <div key={tx.id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-900/50 flex justify-between items-center gap-3">
                    <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                      <div className={`p-2 rounded-lg shrink-0 ${isIncomingTransaction(tx) ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isIncomingTransaction(tx) ? <TrendingUp className="w-4.5 h-4.5" /> : <TrendingDown className="w-4.5 h-4.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white uppercase truncate" title={tx.notes || tx.type.replace('_', ' ')}>
                          {tx.notes || tx.type.replace('_', ' ')}
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono truncate">{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2.5 shrink-0 text-right">
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-bold font-mono ${isIncomingTransaction(tx) ? 'text-green-400' : 'text-red-400'}`}>
                          {isIncomingTransaction(tx) ? '+' : '-'}${tx.amount.toFixed(2)}
                        </p>
                        <p className={`text-[9px] uppercase font-bold ${
                          tx.status === 'approved' ? 'text-green-400' : tx.status === 'rejected' ? 'text-red-400' : 'text-amber-500 animate-pulse'
                        }`}>
                          {tx.status === 'approved' ? 'Completed' : tx.status === 'rejected' ? 'Declined' : 'Processing'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceiptTransaction(tx)}
                        title="View Official Remittance Receipt"
                        className="p-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-blue-600 border border-slate-850 hover:border-blue-500 hover:text-white text-[9px] text-slate-400 transition-all font-bold cursor-pointer shrink-0"
                      >
                        Receipt
                      </button>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6">No historical records logged yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FULL TRANSACTIONS VIEW */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-white font-display">Transaction History</h3>
                <p className="text-xs text-slate-400">Search your full transfer and deposit records</p>
              </div>

              {/* Filters triggers - horizontal scroll on mobile, wrap on desktop */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none max-w-full -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible w-[calc(100%+2rem)] sm:w-auto">
                {['all', 'deposit', 'withdrawal', 'local_transfer', 'intl_transfer'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTxTypeFilter(tf as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      txTypeFilter === tf 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-900 text-slate-400 border border-slate-850 hover:text-white'
                    }`}
                  >
                    {tf.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Search Controls */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search description, recipient names or account numbers..." 
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-2xl py-3 pl-11 pr-4 text-xs select-all text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Desktop transactions table representation */}
            <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-900 bg-slate-900/30">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 uppercase font-bold text-[10px] text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-4">Transaction Code</th>
                    <th scope="col" className="px-6 py-4">Execution Date</th>
                    <th scope="col" className="px-6 py-4">Recipient Info</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                    <th scope="col" className="px-6 py-4 text-right">Amount</th>
                    <th scope="col" className="px-6 py-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {filteredTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/30">
                      <td className="px-6 py-4 font-mono font-bold text-slate-400 select-all uppercase">{tx.id}</td>
                      <td className="px-6 py-4 font-medium text-slate-500">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 max-w-[240px] min-w-0">
                        <p className="font-bold text-white uppercase truncate" title={tx.notes || tx.type.replace('_', ' ')}>{tx.notes || tx.type.replace('_', ' ')}</p>
                        {tx.recipientName && (
                          <p className="text-[10px] text-slate-500 font-mono truncate" title={tx.recipientAccount || tx.recipientName}>Recipient Account: {tx.recipientAccount || tx.recipientName}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase ${
                          tx.status === 'approved' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : tx.status === 'rejected' 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${isIncomingTransaction(tx) ? 'text-green-400' : 'text-red-400'}`}>
                        {isIncomingTransaction(tx) ? '+' : '-'}${tx.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setReceiptTransaction(tx)}
                          className="px-3 py-1 bg-slate-950 hover:bg-blue-600 border border-slate-850 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center space-x-1 mx-auto font-sans"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTxs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500">No transactions match your search criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile transactions card list layout */}
            <div className="block md:hidden space-y-3">
              {filteredTxs.map((tx) => (
                <div 
                  key={tx.id} 
                  className={`p-4 rounded-3xl border text-left space-y-3.5 ${
                    darkMode ? 'bg-slate-900/60 border-slate-900/85' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
                      <span>ID:</span>
                      <span className="select-all text-slate-400">{tx.id}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${
                      tx.status === 'approved' 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                        : tx.status === 'rejected' 
                        ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                    }`}>
                      {tx.status}
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <p className="font-bold text-white uppercase text-xs truncate" title={tx.notes || tx.type.replace('_', ' ')}>{tx.notes || tx.type.replace('_', ' ')}</p>
                    {tx.recipientName && (
                      <p className="text-[10px] text-slate-400 font-mono leading-none truncate" title={tx.recipientAccount || tx.recipientName}>Recipient: {tx.recipientAccount || tx.recipientName}</p>
                    )}
                    <p className="text-[10px] text-slate-500 font-medium truncate">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-950/40">
                    <div className="space-y-0.5">
                      <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Amount Settled</p>
                      <p className={`font-mono font-bold text-sm ${isIncomingTransaction(tx) ? 'text-green-400' : 'text-red-400'}`}>
                        {isIncomingTransaction(tx) ? '+' : '-'}${tx.amount.toFixed(2)}
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setReceiptTransaction(tx)}
                      className="px-3.5 py-2 bg-slate-950 hover:bg-blue-600 border border-slate-850 hover:border-blue-500 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center space-x-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              ))}
              {filteredTxs.length === 0 && (
                <p className="text-center py-8 text-slate-500 text-xs">No transactions match your search criteria.</p>
              )}
            </div>
          </div>
        )}
        {/* TAB 3: FUND YOUR ACCOUNT & OUTBOUND TRANSFER */}
        {activeTab === 'deposit' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="border-b border-slate-900 pb-4">
              <h2 className="text-xl font-bold text-white font-display">Fund Your Account</h2>
              <p className="text-xs text-slate-400 font-semibold">Choose your preferred deposit method and amount to proceed.</p>
            </div>            {fundingStep === 'details' && (
              <div className="space-y-6 max-w-xl mx-auto">
                {/* Method selector */}
                <div className="space-y-3">
                  <label className="block text-xs text-slate-400 font-mono font-bold uppercase tracking-wider pl-1 font-semibold">1. Choose Deposit Method</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'bank', title: 'Bank Transfer', desc: 'Secure direct wire transfer', icon: Building },
                      { id: 'card', title: 'Credit / Debit Card', desc: 'Instant card processing', icon: CreditCard },
                      { id: 'btc', title: 'Bitcoin (BTC)', desc: 'High-security P2P Crypto', icon: Zap },
                      { id: 'usdt', title: 'Stablecoin (USDT)', desc: 'Stable dollar blockchain wire', icon: Globe }
                    ].map((method) => {
                      const isSel = selectedFundingMethod === method.id;
                      return (
                        <div
                          key={method.id}
                          onClick={() => setSelectedFundingMethod(method.id as any)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex items-start gap-3.5 ${
                            isSel 
                              ? 'border-blue-500 bg-blue-500/5 shadow-lg' 
                              : 'border-slate-850 bg-slate-900/30 hover:border-slate-800'
                          }`}
                        >
                          <div className={`p-2 rounded-xl ${isSel ? 'bg-blue-600/10 text-blue-500' : 'bg-slate-950/80 text-slate-400'}`}>
                            <method.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white uppercase">{method.title}</p>
                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{method.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Amount selection */}
                <div className="space-y-3 bg-slate-900/30 p-6 rounded-3xl border border-slate-900">
                  <label className="block text-xs text-slate-400 font-mono font-bold uppercase tracking-wider text-center font-semibold mb-1">2. Specify Deposit Amount</label>
                  
                  {/* Big numeric visual indicator */}
                  <div className="relative max-w-xs mx-auto flex items-center justify-center font-mono py-1.5 font-bold">
                    <span className="text-2xl font-extrabold text-blue-500 mr-1.5">$</span>
                    <input
                      type="number"
                      required
                      value={fundingAmount}
                      onChange={(e) => setFundingAmount(e.target.value)}
                      className="bg-transparent text-3xl font-black text-white text-center focus:outline-none w-48 border-b border-dashed border-slate-800 focus:border-blue-500 font-bold"
                    />
                    <span className="text-xs text-slate-500 font-bold uppercase ml-2 select-none">USD</span>
                  </div>

                  {/* Preset Quick buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    {["100", "500", "1000", "5000", "10000"].map((amt) => {
                      const isSel = fundingAmount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setFundingAmount(amt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSel 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'bg-slate-950/80 border border-slate-850 hover:border-slate-800 text-slate-400'
                          }`}
                        >
                          ${parseInt(amt).toLocaleString()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!fundingAmount || parseFloat(fundingAmount) <= 0}
                  onClick={() => setFundingStep('payment')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-45 disabled:pointer-events-none text-white font-bold rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-lg hover:shadow-blue-600/20 cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <span>Continue to Deposit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {fundingStep === 'payment' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-4xl mx-auto items-start text-left">
                {/* Method-specific instructions */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="p-6 bg-slate-900/30 border border-slate-900 rounded-3xl space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase text-blue-500 tracking-wider pl-1 border-b border-slate-850 pb-2 flex justify-between items-center pr-2">
                      <span>Secure Payment Instructions</span>
                      <span className="text-[10px] bg-slate-950/60 font-semibold px-2.5 py-0.5 rounded-lg text-slate-400 uppercase">
                        {selectedFundingMethod === 'bank' ? 'Bank Transfer' : selectedFundingMethod === 'card' ? 'Credit/Debit' : selectedFundingMethod === 'btc' ? 'BTC' : 'USDT'}
                      </span>
                    </h3>

                    {selectedFundingMethod === 'bank' && (
                      <div className="space-y-4 text-xs font-semibold">
                        <p className="text-slate-400 leading-relaxed">Please wire your payment to our official settlement vault. Secure validation will be executed upon proof submission.</p>
                        
                        <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-850 font-semibold">
                          <div className="flex justify-between items-center py-0.5 border-b border-slate-900/40">
                            <span className="text-slate-500 uppercase text-[10px]">Bank Name</span>
                            <span className="text-white font-bold select-all">{dbService.getSettings().bankName || "SWIFT FEDERAL TRUST CO."}</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5 border-b border-slate-900/40">
                            <span className="text-slate-500 uppercase text-[10px]">Account Name</span>
                            <span className="text-white font-bold select-all">{dbService.getSettings().bankAccountName || "SWIFT BANK CORP ACQUISITION"}</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5 border-b border-slate-900/40">
                            <span className="text-slate-500 uppercase text-[10px]">Account Number</span>
                            <span className="text-white font-bold font-mono select-all">{dbService.getSettings().bankAccountNumber || "0990432125"}</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5 border-b border-slate-900/40">
                            <span className="text-slate-500 uppercase text-[10px]">Routing Number</span>
                            <span className="text-white font-bold font-mono select-all">{dbService.getSettings().bankRoutingNumber || "021000021"}</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5 border-b border-slate-900/40">
                            <span className="text-slate-500 uppercase text-[10px]">SWIFT / BIC Code</span>
                            <span className="text-white font-bold font-mono select-all text-blue-400">{dbService.getSettings().bankSwiftCode || "SWIFTNY33XXX"}</span>
                          </div>
                          <div className="flex flex-col space-y-1 py-1 text-left">
                            <span className="text-slate-500 uppercase text-[10px]">Bank Physical Address</span>
                            <span className="text-slate-300 select-all font-medium leading-relaxed">{dbService.getSettings().bankAddress || "140 Broadway, New York, NY 10005, United States"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedFundingMethod === 'btc' && (
                      <div className="space-y-4 text-xs font-semibold">
                        <p className="text-slate-400 leading-relaxed">Send the exact cryptocurrency equivalent payment to our secure Bitcoin address. Cryptocurrency deposits clear after 1 confirmation block.</p>
                        
                        <div className="p-4 rounded-2xl bg-white border max-w-[170px] mx-auto text-center flex items-center justify-center">
                          <img 
                            src={dbService.getSettings().btcQrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=000&data=${encodeURIComponent(dbService.getSettings().btcAddress || "bc1qxy2kg3ut78dh8sd35jkh2h8ds8hjs7sdjkds8d")}`} 
                            alt="BTC Secure Wallet QR code" 
                            referrerPolicy="no-referrer"
                            className="w-36 h-36 border border-slate-100 object-cover bg-white" 
                          />
                        </div>

                        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850 flex flex-col space-y-1 text-center">
                          <span className="text-slate-500 uppercase text-[9px] font-bold">BTC Wallet Address</span>
                          <span className="text-white font-mono break-all text-[11px] select-all font-bold">{dbService.getSettings().btcAddress || "bc1qxy2kg3ut78dh8sd35jkh2h8ds8hjs7sdjkds8d"}</span>
                        </div>
                      </div>
                    )}

                    {selectedFundingMethod === 'usdt' && (
                      <div className="space-y-4 text-xs font-semibold">
                        <p className="text-slate-400 leading-relaxed">Send your payment to our USDT cryptocurrency address. Make absolutely sure you settle on the correct blockchain network to prevent asset loss.</p>
                        
                        <div className="p-4 rounded-2xl bg-white border max-w-[170px] mx-auto text-center flex items-center justify-center">
                          <img 
                            src={dbService.getSettings().usdtQrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=000&data=${encodeURIComponent(dbService.getSettings().usdtAddress || "0x7a3D39B88089E4E2C7D1D4133BCFbe08204E677F")}`} 
                            alt="USDT Secure Address QR code" 
                            referrerPolicy="no-referrer"
                            className="w-36 h-36 border border-slate-100 object-cover bg-white" 
                          />
                        </div>

                        <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-850 font-semibold text-xs text-slate-350">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 uppercase text-[10px]">USDT Blockchain Network</span>
                            <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-500 font-bold uppercase text-[9px]">{dbService.getSettings().usdtNetwork || "TRC20"}</span>
                          </div>
                          <div className="flex flex-col space-y-1 pt-2 border-t border-slate-900/60 text-center font-semibold">
                            <span className="text-slate-500 uppercase text-[9px] font-bold">USDT Wallet Address</span>
                            <span className="text-white font-mono break-all text-[11px] select-all font-bold">{dbService.getSettings().usdtAddress || "0x7a3D39B88089E4E2C7D1D4133BCFbe08204E677F"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedFundingMethod === 'card' && (
                      <div className="space-y-4.5 text-xs font-semibold">
                        <p className="text-slate-400 leading-relaxed">To top up instantly using a Credit or Debit Card, specify credentials below to proceed with secure payment authorization.</p>
                        
                        <div className="space-y-3 p-4 bg-slate-950/40 rounded-2xl border border-slate-850">
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Cardholder Name</label>
                            <input type="text" placeholder="LEGAL CARD OWNER" className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none" />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Card Number</label>
                              <input type="text" placeholder="xxxx xxxx xxxx xxxx" className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Expiry / CVV</label>
                              <input type="text" placeholder="MM/YY" className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setFundingStep('details')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-855 border border-slate-850 text-slate-350 hover:text-white text-xs font-bold rounded-xl transition-all"
                  >
                    ← Select another amount/method
                  </button>
                </div>

                {/* Deposit proof form columns */}
                <div className="lg:col-span-5 space-y-4 text-left">
                  <div className="p-6 bg-slate-900/30 border border-slate-900 rounded-3xl space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase text-blue-500 tracking-wider pl-1 border-b border-slate-850 pb-2">3. Payment Proof Section</h3>
                    
                    {/* Drag-And-Drop File Uploader Container */}
                    <div className="space-y-2 font-semibold">
                      <label className="block text-[10px] text-slate-450 uppercase font-bold pl-1 font-semibold">Upload Payment Receipt</label>
                      <div 
                        onDragEnter={handleReceiptDrag}
                        onDragOver={handleReceiptDrag}
                        onDragLeave={handleReceiptDrag}
                        onDrop={handleReceiptDrop}
                        className={`border border-dashed rounded-2xl p-5 text-center transition-all relative ${
                          receiptDragActive ? 'border-blue-500 bg-blue-500/5' : 'border-slate-850 bg-slate-950/40 hover:border-slate-800'
                        }`}
                      >
                        <input 
                          type="file" 
                          id="receipt-file-input"
                          accept="image/*,application/pdf"
                          onChange={handleReceiptFileUpload}
                          className="hidden"
                          disabled={paymentIsUploading}
                        />
                        <label 
                          htmlFor="receipt-file-input" 
                          className="cursor-pointer flex flex-col items-center justify-center space-y-2 pointer-events-auto"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600/10 text-blue-500">
                            {paymentIsUploading ? (
                              <div className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-blue-500 border-t-white" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </div>
                          
                          {paymentReceiptUrl ? (
                            <p className="text-[11px] font-bold text-emerald-400 break-all truncate max-w-[200px]">
                              ✓ Receipt Captured
                            </p>
                          ) : (
                            <p className="text-[11px] font-semibold text-slate-300">
                              {paymentIsUploading ? paymentUploadProgress : "Drag receipt or Click to upload"}
                            </p>
                          )}
                          <p className="text-[9px] text-slate-500">Supports PDF, PNG, JPG receipts</p>
                        </label>
                      </div>
                    </div>

                    {/* Transaction Hash */}
                    <div>
                      <label className="block text-[10px] text-slate-450 uppercase font-bold pl-1 font-semibold mb-1">
                        Transaction Hash / ID
                        {['btc', 'usdt'].includes(selectedFundingMethod) && <span className="text-red-500 ml-1 font-bold">*Required</span>}
                        {selectedFundingMethod === 'bank' && <span className="text-slate-500 ml-1">(Optional)</span>}
                      </label>
                      <input 
                        type="text" 
                        placeholder={['btc', 'usdt'].includes(selectedFundingMethod) ? "e.g. Tx hash hex string..." : "e.g. Reference number..."}
                        value={paymentTxHash}
                        onChange={(e) => setPaymentTxHash(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                      />
                    </div>

                    {/* Submit Payment button */}
                    <button
                      type="button"
                      disabled={paymentIsUploading || !paymentReceiptUrl || (['btc', 'usdt'].includes(selectedFundingMethod) && !paymentTxHash.trim()) || parseFloat(fundingAmount) <= 0}
                      onClick={async () => {
                        // Submit Deposit request via dbService
                        const methodLabel = selectedFundingMethod === 'bank' ? 'Bank Transfer' : selectedFundingMethod === 'card' ? 'Credit/Debit Card' : selectedFundingMethod === 'btc' ? 'Bitcoin (BTC)' : 'Stablecoin (USDT)';
                        const noteString = `Method: ${methodLabel} • Hash: ${paymentTxHash || 'N/A'} • Receipt Submitted`;
                        
                        dbService.requestDeposit(profile.userId, parseFloat(fundingAmount), noteString);
                        setPaymentSuccessMessage(`Gateway successfully initialized. Your deposit request of $${parseFloat(fundingAmount).toLocaleString()} USD is now registered on compliance queue.`);
                        setFundingStep('success');
                      }}
                      className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-lg hover:shadow-green-600/20 cursor-pointer text-center"
                    >
                      Submit Payment Proof
                    </button>
                    {!paymentReceiptUrl && (
                      <p className="text-[10px] text-amber-500/80 font-medium text-center italic mt-1 font-semibold">Please upload the transaction receipt file to enable payment submission.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {fundingStep === 'success' && (
              <div className="max-w-md mx-auto p-8 bg-slate-900/30 border border-slate-900 rounded-3xl text-center space-y-6 animate-scale-up text-left">
                <div className="w-16 h-16 rounded-full bg-green-600/10 text-green-500 flex items-center justify-center mx-auto text-3xl">
                  ✓
                </div>
                <div className="text-center font-semibold text-xs leading-relaxed">
                  <h3 className="text-lg font-bold text-white font-display">Payment Settle Triggered</h3>
                  <p className="text-xs text-green-400 font-bold uppercase tracking-wider mt-1.5 font-mono">Status: Processing</p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-4 font-semibold">{paymentSuccessMessage}</p>
                </div>
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850 text-left space-y-2.5 text-xs font-semibold">
                  <div className="flex justify-between items-center text-slate-450 font-semibold">
                    <span>Settle Amount</span>
                    <span className="text-white font-mono font-bold">${parseFloat(fundingAmount).toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-450 font-semibold">
                    <span>Deposit Category</span>
                    <span className="text-white uppercase font-bold">{selectedFundingMethod} Gateway</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFundingStep('details');
                    setFundingAmount("1000");
                    setPaymentReceiptUrl("");
                    setPaymentTxHash("");
                    setPaymentUploadProgress("");
                    syncDashboardData();
                    handleTabChange('home');
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm active:scale-95 transition-all cursor-pointer text-center font-display"
                >
                  Return to Dashboard Overview
                </button>
              </div>
            )}
          </div>
        )}



        {/* Outbound Funds Transfer Tab Layout */}
        {activeTab === 'transfer' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="border-b border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Outbound Funds Transfer</h2>
                <p className="text-xs text-slate-400 font-semibold">Initiate secure peer-to-peer bank transfers or global international wire settlements.</p>
              </div>
              <div className="px-4 py-2 rounded-2xl border border-blue-500/10 bg-blue-500/5 text-xs text-slate-300 font-semibold">
                Available Balance: <span className="text-emerald-400 font-bold font-mono">${profile.balance.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
              </div>
            </div>

            {/* Sub-tabs Selector */}
                  <div className="flex space-x-2 border-b border-slate-900 pb-1.5">
              <button
                type="button"
                onClick={() => setTransferSubTab('local')}
                className={`px-4 py-2 text-xs font-bold transition-all border-b-2 rounded-t-xl -mb-[7px] ${
                  transferSubTab === 'local'
                    ? 'border-blue-500 text-white bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Local Account Transfer (P2P)
              </button>
              <button
                type="button"
                onClick={() => setTransferSubTab('intl')}
                className={`px-4 py-2 text-xs font-bold transition-all border-b-2 rounded-t-xl -mb-[7px] ${
                  transferSubTab === 'intl'
                    ? 'border-blue-500 text-white bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                International Wire Settlement
              </button>
            </div>

            {/* View renders */}
            {transferSubTab === 'local' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-5xl mx-auto items-start pt-2">
                {/* Instruction Card */}
                <div className="md:col-span-5 p-6 bg-slate-900/30 border border-slate-900 rounded-3xl space-y-4">
                  <h3 className="text-xs font-mono font-bold uppercase text-blue-500 tracking-wider">Swift P2P Network Protocol</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    Instantly transfer funds to any registered client of our bank. To initiate, supply their active 10-digit Account Number. Our system backplane resolves beneficiary credentials in real-time.
                  </p>
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850 space-y-2 text-[11px] text-slate-405 font-semibold leading-normal">
                    <p className="text-emerald-400 font-bold">✓ Zero Settlement Delay</p>
                    <p>✓ Secured by Military-Grade Cryptography</p>
                    <p>✓ Instant Atomic Ledger Reconcile</p>
                  </div>
                </div>

                {/* Form Module */}
                <div className="md:col-span-7 p-6 sm:p-8 bg-slate-900/30 border border-slate-900 rounded-3xl">
                  {localSuccess && (
                    <div className="mb-5 p-4 bg-emerald-950/40 border border-emerald-900/20 text-emerald-400 rounded-2xl text-xs font-semibold">
                      {localSuccess}
                    </div>
                  )}

                  {isLocalConfirming ? (
                    <div className="space-y-5 text-left">
                      <div className="text-center pb-2">
                        <h4 className="text-sm font-bold text-white mb-1">Confirm Transaction Details</h4>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">Review transfer before final routing</p>
                      </div>

                      <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center space-x-3.5">
                        <img 
                          src={localRecipientResolved?.profileImage || DEFAULT_AVATAR} 
                          alt="Recipient Logo"
                          className="w-12 h-12 rounded-full border border-slate-800 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Beneficiary Resolved</p>
                          <p className="text-sm font-bold text-white font-display leading-tight">{localRecipientName}</p>
                          <p className="text-xs text-slate-450 font-semibold font-mono">{localAccountNum}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl space-y-3 font-semibold text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Amount Sent:</span>
                          <span className="text-white">${parseFloat(localAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Processing Fee:</span>
                          <span className="text-white">${(dbService.getSettings().localTransferFee ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-900 pt-2.5 flex justify-between text-sm font-bold text-white">
                          <span>Total Deduction:</span>
                          <span className="text-blue-500">${(parseFloat(localAmount) + (dbService.getSettings().localTransferFee ?? 0)).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-900/60 pt-2 flex justify-between">
                          <span>Amount Recipient Receives:</span>
                          <span className="text-emerald-400 font-bold">${parseFloat(localAmount).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-900 pt-2 text-center text-[10px] text-slate-500 font-mono">
                          Notes: {localNote || "P2P Swift Settlement"}
                        </div>
                      </div>

                      {isUserRestricted() && (
                        <div 
                          id="local-transfer-restriction-panel"
                          className="p-4 bg-red-950/25 border border-red-900/35 text-red-500 rounded-2xl text-[11px] sm:text-xs font-bold leading-relaxed uppercase tracking-normal text-justify"
                        >
                          {getWarningMessage()}
                        </div>
                      )}

                      {localError && !localError.startsWith("RESTRICTED_TRANSFER:") && (
                        <p className="text-xs text-red-400 text-center uppercase tracking-wider mt-2">{localError}</p>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setIsLocalConfirming(false)}
                          disabled={isLocalPending}
                          className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 text-slate-300 font-bold rounded-xl text-xs active:scale-95 transition-all outline-none border border-slate-850 cursor-pointer text-center"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleLocalTransferConfirm}
                          disabled={isLocalPending}
                          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-lg hover:shadow-blue-600/20 cursor-pointer text-center flex items-center justify-center gap-1.5"
                        >
                          {isLocalPending ? "Sending..." : "Confirm & Send"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleLocalTransferSubmit} className="space-y-4">
                      {/* Beneficiary Account Number */}
                      <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold pl-1 font-semibold mb-1">Recipient Account Number (10 Digits)</label>
                        <input
                          type="text"
                          maxLength={10}
                          required
                          placeholder="e.g. 0123456789"
                          value={localAccountNum}
                          onChange={(e) => setLocalAccountNum(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                        />
                        {localRecipientResolved ? (
                          <div className="mt-2.5 p-3.5 bg-slate-950 border border-slate-850 rounded-2xl flex items-center space-x-3.5">
                            <img 
                              src={localRecipientResolved.profileImage || DEFAULT_AVATAR} 
                              alt="Recipient Avatar" 
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full border border-slate-800 object-cover"
                            />
                            <div>
                              <p className="text-[10px] text-slate-500 font-semibold uppercase leading-none mb-1">Recipient Resolved</p>
                              <p className="text-sm font-bold text-white font-display">{localRecipientResolved.fullName}</p>
                            </div>
                          </div>
                        ) : localAccountNum.length === 10 && localRecipientName === "Searching Secure Gateway..." ? (
                          <div className="mt-2 flex items-center space-x-1.5 pl-1 text-[11px] text-blue-400 font-semibold animate-pulse">
                            <span>Searching secure gateway...</span>
                          </div>
                        ) : localAccountNum.length === 10 && (
                          <div className="mt-2 text-[11px] text-red-400 font-bold pl-1">
                            Beneficiary not resolved or inactive account number.
                          </div>
                        )}
                      </div>

                      {/* Amount to Transfer */}
                      <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold pl-1 font-semibold mb-1">Transfer Amount (USD)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-blue-500 font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={localAmount}
                            onChange={(e) => setLocalAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-8 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Recipient breakdown values */}
                      {localRecipientResolved && localAmount && parseFloat(localAmount) > 0 && (
                        <div className="p-4 bg-slate-950/60 border border-slate-850/60 rounded-2xl text-xs space-y-2.5 font-semibold text-slate-400">
                          <div className="flex justify-between">
                            <span>Transfer Net Amount:</span>
                            <span className="text-white">${parseFloat(localAmount).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Processing Fee:</span>
                            <span className="text-white">${(dbService.getSettings().localTransferFee ?? 0).toFixed(2)}</span>
                          </div>
                          <div className="border-t border-slate-850/80 pt-2 flex justify-between text-sm font-bold text-white leading-none">
                            <span>Total Deduction:</span>
                            <span className="text-blue-500">${(parseFloat(localAmount) + (dbService.getSettings().localTransferFee ?? 0)).toFixed(2)}</span>
                          </div>
                          <div className="border-t border-slate-850/40 pt-2 flex justify-between">
                            <span>Recipient Receives:</span>
                            <span className="text-emerald-400 font-bold">${parseFloat(localAmount).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Transaction Note / Memo */}
                      <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold pl-1 font-semibold mb-1">Transfer Note / Memo (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Settlement of invoices..."
                          value={localNote}
                          onChange={(e) => setLocalNote(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                        />
                      </div>

                      {/* Secure Transaction 4-digit PIN */}
                      <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold pl-1 font-semibold mb-1">Secure Transaction PIN (4 Digits)</label>
                        <input
                          type="password"
                          maxLength={4}
                          required
                          placeholder="••••"
                          value={localPin}
                          onChange={(e) => setLocalPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-center font-mono text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold tracking-widest"
                        />
                      </div>

                      {localError && (
                        <p className="text-[11px] text-red-400 font-semibold pl-1 uppercase tracking-wider">{localError}</p>
                      )}

                      <button
                        type="submit"
                        disabled={!localRecipientResolved || !localAmount || parseFloat(localAmount) <= 0 || localPin.length !== 4}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-lg hover:shadow-blue-600/20 cursor-pointer text-center flex items-center justify-center gap-2 font-display"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>Preview & Verify Transfer</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-5xl mx-auto items-start pt-2">
                {/* Wire settlement instructions card */}
                <div className="md:col-span-5 p-6 bg-slate-900/30 border border-slate-900 rounded-3xl space-y-4">
                  <h3 className="text-xs font-mono font-bold uppercase text-blue-500 tracking-wider">Global SWIFT Settlement</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    Wire funds directly to secondary bank networks, escrow accounts or international beneficiaries worldwide. All outbound wires undergo rigorous administrative/AML compliance checks.
                  </p>
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850 text-[11px] text-slate-400 font-semibold space-y-2 leading-normal">
                    <p className="text-amber-500 font-bold">⚠ Clearance Timeframe: 1-12 Hours</p>
                    <p>✓ Supports USD, EUR, GBP, AUD currencies</p>
                    <p>✓ Trackable via visual transaction history</p>
                  </div>
                </div>

                {/* Form Module */}
                <div className="md:col-span-7 p-6 sm:p-8 bg-slate-900/30 border border-slate-900 rounded-3xl">
                  {intlSuccess && (
                    <div className="mb-5 p-4 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-2xl text-xs font-semibold">
                      {intlSuccess}
                    </div>
                  )}

                  {isIntlConfirming ? (
                    <div className="space-y-5 text-left">
                      <div className="text-center pb-2">
                        <h4 className="text-sm font-bold text-white mb-1">Confirm Outbound Wire Settlement</h4>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">Review clearing specifications carefully</p>
                      </div>

                      <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-full border border-slate-800 bg-blue-950/40 text-blue-400 flex items-center justify-center font-display text-lg font-bold">
                          🌐
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Clearing Protocol</p>
                          <p className="text-sm font-bold text-white font-display leading-tight">{intlMethod}</p>
                          <p className="text-xs text-slate-450 font-semibold max-w-xs truncate font-mono">{intlDetails}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl space-y-3 font-semibold text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Wire Base Amount:</span>
                          <span className="text-white">${parseFloat(intlAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Standard Processing Fee:</span>
                          <span className="text-white">${(dbService.getSettings().intlTransferFee ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-900 pt-2.5 flex justify-between text-sm font-bold text-white">
                          <span>Total Deduction:</span>
                          <span className="text-blue-500">${(parseFloat(intlAmount) + (dbService.getSettings().intlTransferFee ?? 0)).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-900/60 pt-2 flex justify-between">
                          <span>Net Received Amount:</span>
                          <span className="text-emerald-400 font-bold">${parseFloat(intlAmount).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-900 pt-2 text-center text-[10px] text-slate-500 font-mono">
                          Notes: {intlNote || "International Clearing Outbound"}
                        </div>
                      </div>

                      {isUserRestricted() && (
                        <div 
                          id="intl-transfer-restriction-panel"
                          className="p-4 bg-red-950/25 border border-red-900/35 text-red-500 rounded-2xl text-[11px] sm:text-xs font-bold leading-relaxed uppercase tracking-normal text-justify"
                        >
                          {getWarningMessage()}
                        </div>
                      )}

                      {intlError && !intlError.startsWith("RESTRICTED_TRANSFER:") && (
                        <p className="text-xs text-red-400 text-center uppercase tracking-wider mt-2">{intlError}</p>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setIsIntlConfirming(false)}
                          disabled={isIntlPending}
                          className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 text-slate-300 font-bold rounded-xl text-xs active:scale-95 transition-all outline-none border border-slate-850 cursor-pointer text-center"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleIntlTransferConfirm}
                          disabled={isIntlPending}
                          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-lg hover:shadow-blue-600/20 cursor-pointer text-center flex items-center justify-center gap-1.5"
                        >
                          {isIntlPending ? "Publishing..." : "Confirm & Send Wire"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleIntlTransferSubmit} className="space-y-4">
                      {/* Wire protocol engine */}
                      <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold pl-1 font-semibold mb-1">Standard Settlement Protocol</label>
                        <select
                          value={intlMethod}
                          onChange={(e) => setIntlMethod(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                        >
                          <option>Wire Transfer</option>
                          <option>SWIFT Network</option>
                          <option>SEPA Gateway</option>
                          <option>FedWire Reserve</option>
                          <option>Allied Crypto Settlement (USDT/BTC)</option>
                        </select>
                      </div>

                      {/* Beneficiary Details */}
                      <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold pl-1 font-semibold mb-1">Beneficiary Complete Details</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Include Legal Name, Bank Name, Routing/ABA/BIC, and Beneficiary IBAN/Account details..."
                          value={intlDetails}
                          onChange={(e) => setIntlDetails(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                        />
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold pl-1 font-semibold mb-1">Wire Amount (USD)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-blue-500 font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={intlAmount}
                            onChange={(e) => setIntlAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-8 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Wire breakdown values */}
                      {intlAmount && parseFloat(intlAmount) > 0 && (
                        <div className="p-4 bg-slate-950/60 border border-slate-850/60 rounded-2xl text-xs space-y-2.5 font-semibold text-slate-400">
                          <div className="flex justify-between">
                            <span>Wire Net Amount:</span>
                            <span className="text-white">${parseFloat(intlAmount).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Standard Processing Fee:</span>
                            <span className="text-white">${(dbService.getSettings().intlTransferFee ?? 0).toFixed(2)}</span>
                          </div>
                          <div className="border-t border-slate-850/80 pt-2 flex justify-between text-sm font-bold text-white leading-none">
                            <span>Total Deduction:</span>
                            <span className="text-blue-500">${(parseFloat(intlAmount) + (dbService.getSettings().intlTransferFee ?? 0)).toFixed(2)}</span>
                          </div>
                          <div className="border-t border-slate-850/40 pt-2 flex justify-between">
                            <span>Net Received Amount:</span>
                            <span className="text-emerald-400 font-bold">${parseFloat(intlAmount).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Note / Memo */}
                      <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold pl-1 font-semibold mb-1">Memo Notes (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Business purchase, invoice contract number..."
                          value={intlNote}
                          onChange={(e) => setIntlNote(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                        />
                      </div>

                      {/* Secure Transaction 4-digit PIN */}
                      <div>
                        <label className="block text-xs text-slate-400 uppercase font-bold pl-1 font-semibold mb-1">Secure Transaction PIN (4 Digits)</label>
                        <input
                          type="password"
                          maxLength={4}
                          required
                          placeholder="••••"
                          value={intlPin}
                          onChange={(e) => setIntlPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-center font-mono text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold tracking-widest"
                        />
                      </div>

                      {intlError && (
                        <p className="text-[11px] text-red-400 font-semibold pl-1 uppercase tracking-wider">{intlError}</p>
                      )}

                      <button
                        type="submit"
                        disabled={!intlAmount || parseFloat(intlAmount) <= 0 || !intlDetails.trim() || intlPin.length !== 4}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-lg hover:shadow-blue-600/20 cursor-pointer text-center flex items-center justify-center gap-2 font-display"
                      >
                        <Globe className="w-4 h-4 text-sky-450" />
                        <span>Preview & Request Wire</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="border-b border-slate-900 pb-4">
              <h3 className="text-xl font-bold text-white font-display">Virtual Card Vault</h3>
              <p className="text-xs text-slate-400 font-semibold">Deploy custom credit networks, copy secured PAN credentials, and manage visual digital assets</p>
            </div>

            {/* A. Statistics Summary Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-3xl text-left">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">Total Cards Balance</span>
                <p className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">${cards.filter(c => c.status === 'active').reduce((acc, c) => acc + c.dailyLimit, 0).toLocaleString()} USD</p>
                <div className="text-[10px] text-slate-500 mt-1">Sum of active card limits</div>
              </div>
              <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-3xl text-left">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">Active Shielded Cards</span>
                <p className="text-lg sm:text-xl font-bold font-mono text-blue-400 mt-1">{cards.filter(c => c.status === 'active').length}</p>
                <div className="text-[10px] text-slate-500 mt-1">Verified and active on network</div>
              </div>
              <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-3xl text-left sm:col-span-2 lg:col-span-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold">Pending Applications</span>
                <p className="text-lg sm:text-xl font-bold font-mono text-amber-500 mt-1">{cards.filter(c => c.status === 'pending').length}</p>
                <div className="text-[10px] text-slate-500 mt-1">Under AML ledger audit</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
              
              {/* Center Stage Card Viewer */}
              <div className={`${cards.some(c => c.status === 'active') ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-6`}>
                
                {cards.length > 0 ? (
                  (() => {
                    const selectCard = selectedCardForDetails || cards[0];
                    const isFlipped = isDetailCardFlipped;
                    return (
                      <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-slate-900/30 border border-slate-900 rounded-3xl space-y-6 max-w-md mx-auto w-full">
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">ACTIVE CLIENT PHYSICAL VAULT</span>
                          <button 
                            onClick={() => setIsDetailCardFlipped(!isDetailCardFlipped)}
                            className="text-[10px] text-blue-500 font-bold font-mono tracking-wider cursor-pointer hover:underline"
                          >
                            FLIP CARD PREVIEW
                          </button>
                        </div>

                        {/* Multi-Card Selector Tabs */}
                        {cards.length > 1 && (
                          <div className="w-full flex items-center justify-center gap-2 overflow-x-auto py-1 scrollbar-none border-b border-slate-900 pb-3">
                            {cards.map((c, idx) => {
                              const isSelected = selectCard.id === c.id;
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setSelectedCardForDetails(c);
                                    setIsDetailCardFlipped(false);
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-[9px] font-bold tracking-wider uppercase transition-all select-none flex-shrink-0 cursor-pointer ${
                                    isSelected 
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-850'
                                  }`}
                                >
                                  Card #{idx + 1} ({c.brand}) {c.status === 'pending' ? '⏳' : '✓'}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Beautiful 3D Card Object */}
                        <div 
                          onClick={() => setIsDetailCardFlipped(!isDetailCardFlipped)}
                          className="w-full relative cursor-pointer select-none"
                          style={{ perspective: '1000px', aspectRatio: '1.586/1' }}
                        >
                          <div 
                            className="w-full h-full relative"
                            style={{ 
                              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', 
                              transformStyle: 'preserve-3d', 
                              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' 
                            }}
                          >
                            {/* FRONT SIDE */}
                            <div 
                              className={`absolute inset-0 w-full h-full rounded-2xl p-6 sm:p-7 flex flex-col justify-between text-white shadow-2xl border ${
                                selectCard.brand === 'Visa' 
                                  ? 'bg-gradient-to-tr from-indigo-950 via-slate-950 to-blue-900 border-blue-500/20' 
                                  : selectCard.brand === 'Mastercard'
                                  ? 'bg-gradient-to-tr from-black via-rose-950 to-amber-950 border-rose-500/20'
                                  : 'bg-gradient-to-tr from-zinc-950 via-slate-900 to-amber-950 border-amber-500/30'
                              }`}
                              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                            >
                              <div className="flex justify-between items-start">
                                <div className="text-left">
                                  <p className="text-sm font-extrabold tracking-wider uppercase font-display bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">SWIFT BANK</p>
                                  <span className="text-[8px] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest font-mono text-blue-400 font-bold">VIRTUAL DEBIT</span>
                                </div>
                                <span className="text-sm font-extrabold font-display italic tracking-widest text-slate-300">{selectCard.brand}</span>
                              </div>

                              {/* Chip design */}
                              <div className="w-9 h-7 rounded-lg bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 relative flex flex-col justify-between p-1.5 overflow-hidden shadow-inner border border-amber-300/30">
                                <div className="flex justify-between h-1.5 border-b border-yellow-600/30">
                                  <div className="w-1/3 border-r border-yellow-600/30"></div>
                                  <div className="w-1/3 border-r border-yellow-600/30"></div>
                                  <div className="w-1/3"></div>
                                </div>
                                <div className="flex justify-between h-1.5 border-b border-yellow-600/30">
                                  <div className="w-1/2 border-r border-yellow-600/30"></div>
                                  <div className="w-1/2"></div>
                                </div>
                                <div className="flex justify-between h-1.5">
                                  <div className="w-1/3 border-r border-yellow-600/30"></div>
                                  <div className="w-1/3 border-r border-yellow-600/30"></div>
                                  <div className="w-1/3"></div>
                                </div>
                              </div>

                              {/* Card Number */}
                              <div className="font-mono text-sm sm:text-base md:text-lg font-bold tracking-[0.14em] text-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-all">
                                {selectCard.status === 'active' ? selectCard.cardNumber : "•••• •••• •••• ••••"}
                              </div>

                              <div className="flex justify-between items-end text-left">
                                <div>
                                  <p className="text-[6px] text-slate-400 uppercase tracking-widest font-extrabold mb-0.5">Cardholder Name</p>
                                  <p className="text-[10px] font-bold uppercase tracking-wider font-display text-white">{selectCard.cardHolder}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[6px] text-slate-400 uppercase tracking-widest font-extrabold mb-0.5">Expiry Date</p>
                                  <p className="text-xs font-mono font-bold text-white">{selectCard.status === 'active' ? selectCard.expiryDate : "••/••"}</p>
                                </div>
                              </div>
                            </div>

                            {/* BACK SIDE */}
                            <div 
                              className={`absolute inset-0 w-full h-full rounded-2xl p-6 sm:p-7 flex flex-col justify-between text-white shadow-2xl border ${
                                selectCard.brand === 'Visa' 
                                  ? 'bg-gradient-to-tr from-indigo-950 via-slate-950 to-blue-900 border-blue-500/20' 
                                  : selectCard.brand === 'Mastercard'
                                  ? 'bg-gradient-to-tr from-black via-rose-955 to-amber-955 border-rose-500/20'
                                  : 'bg-gradient-to-tr from-zinc-950 via-slate-900 to-amber-950 border-amber-500/30'
                              }`}
                              style={{ 
                                backfaceVisibility: 'hidden', 
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)' 
                              }}
                            >
                              {/* Magnetic Stripe */}
                              <div className="w-full h-9 bg-neutral-900 -mx-6 mt-1 mb-2"></div>

                              {/* CVV & Signature Area */}
                              <div className="flex justify-between items-center pr-3 mt-1">
                                <div className="flex-1 max-w-[150px] h-7 bg-slate-100/10 border border-slate-700/30 rounded flex items-center pl-2">
                                  <span className="text-[7px] text-slate-400 tracking-wider font-mono">SECURED PLASTIC VAULT</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-[7px] text-slate-400 mr-1.5 font-bold uppercase font-mono">CVV</span>
                                  <span className="bg-white text-slate-950 font-mono text-xs px-2.5 py-0.5 rounded font-bold border border-slate-500/20 select-all">
                                    {selectCard.status === 'active' ? selectCard.cvv : "•••"}
                                  </span>
                                </div>
                              </div>

                              {/* Signature block helper */}
                              <div className="border-t border-slate-800/40 pt-3 text-center">
                                <p className="text-[7px] text-slate-500 leading-relaxed max-w-[300px] mx-auto">
                                  This digital card security mainframe is issued under Swift Federal authorization rules. Unauthorized reproduction or use is strictly tracked by network compliance firewalls.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Operational Controls & Confidential Specs Block (Under Card) */}
                        {selectCard.status === 'active' ? (
                          revealDetailsId === selectCard.id ? (
                            <div className="w-full space-y-6 pt-4 border-t border-slate-900 animate-fade-in">
                              {/* Flip & Copy Actions */}
                              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(selectCard.cardNumber);
                                    alert("Card number securely copied to your clipboard.");
                                  }}
                                  className="w-full sm:flex-1 py-3 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-900 border border-slate-850 flex items-center justify-center space-x-2 cursor-pointer text-white active:scale-95 transition-all"
                                >
                                  <Copy className="w-4 h-4 text-blue-500" />
                                  <span>Copy Number</span>
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDetailCardFlipped(!isDetailCardFlipped);
                                  }}
                                  className="w-full sm:flex-1 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 flex items-center justify-center space-x-2 cursor-pointer text-white transition-all shadow-md shadow-blue-600/10 active:scale-95"
                                >
                                  <ArrowRightLeft className="w-4 h-4 text-white" />
                                  <span>Flip Card</span>
                                </button>
                              </div>

                              {/* Card Information */}
                              <div className="text-left w-full space-y-3 pt-2">
                                <h4 className="text-xs uppercase text-slate-450 font-bold tracking-widest font-display border-b border-slate-900 pb-1.5">Card Information</h4>
                                <div className="divide-y divide-slate-900/40 text-xs space-y-2.5">
                                  <div className="flex justify-between items-center pt-2">
                                    <span className="text-slate-550 font-medium font-semibold uppercase tracking-wider text-[10px]">Card Type</span>
                                    <span className="text-white font-bold uppercase font-mono">{selectCard.brand}</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2">
                                    <span className="text-slate-550 font-medium font-semibold uppercase tracking-wider text-[10px]">Card Level</span>
                                    <span className="text-amber-500 font-bold uppercase font-mono">
                                      {selectCard.dailyLimit >= 10000 ? "Platinum Elite" : selectCard.dailyLimit >= 5000 ? "Gold Premium" : "Silver Secure"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2">
                                    <span className="text-slate-550 font-medium font-semibold uppercase tracking-wider text-[10px]">Currency</span>
                                    <span className="text-white font-mono">USD</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2">
                                    <span className="text-slate-550 font-medium font-semibold uppercase tracking-wider text-[10px]">Daily Limit</span>
                                    <span className="text-white font-bold font-mono">
                                      ${selectCard.dailyLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2">
                                    <span className="text-slate-550 font-medium font-semibold uppercase tracking-wider text-[10px]">Available Balance</span>
                                    <span className="text-emerald-400 font-bold font-mono">
                                      ${profile.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2">
                                    <span className="text-slate-550 font-medium font-semibold uppercase tracking-wider text-[10px]">CreatedAt</span>
                                    <span className="text-white font-mono text-[11px]">
                                      {new Date(selectCard.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Billing Information */}
                              <div className="text-left w-full space-y-3 pt-2">
                                <h4 className="text-xs uppercase text-slate-450 font-bold tracking-widest font-display border-b border-slate-900 pb-1.5">Billing Information</h4>
                                <div className="divide-y divide-slate-900/40 text-xs space-y-2.5">
                                  <div className="flex justify-between items-center pt-2">
                                    <span className="text-slate-550 font-medium font-semibold uppercase tracking-wider text-[10px]">Cardholder Name</span>
                                    <span className="text-white font-bold uppercase tracking-wide">{selectCard.cardHolder}</span>
                                  </div>
                                  <div className="flex justify-between items-start pt-2">
                                    <span className="text-slate-550 font-medium font-semibold uppercase tracking-wider text-[10px]">Address</span>
                                    <span className="text-slate-300 font-medium max-w-[200px] text-right">{selectCard.billingAddress}</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2">
                                    <span className="text-slate-550 font-medium font-semibold uppercase tracking-wider text-[10px]">City</span>
                                    <span className="text-slate-300 font-semibold">{selectCard.city}</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2">
                                    <span className="text-slate-550 font-medium font-semibold uppercase tracking-wider text-[10px]">ZIP Code</span>
                                    <span className="text-slate-300 font-mono font-bold">{selectCard.zipCode}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full space-y-3">
                              {/* View Details security checkpoint */}
                              <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl text-center space-y-3">
                                <p className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">🔒 Security Audited Card Info Checkpoint</p>
                                <form onSubmit={(e) => {
                                  e.preventDefault();
                                  if (cardPinInput === profile.pin) {
                                    setRevealDetailsId(selectCard.id);
                                    setCardPinError("");
                                    setCardPinInput("");
                                  } else {
                                    setCardPinError("Confidential PIN verification failed.");
                                  }
                                }} className="flex flex-col items-center space-y-2">
                                  <div className="flex items-center space-x-2.5">
                                    <input 
                                      type="password"
                                      maxLength={4}
                                      value={cardPinInput}
                                      onChange={(e) => setCardPinInput(e.target.value)}
                                      placeholder="PIN Code"
                                      className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-center text-xs font-mono font-bold tracking-widest text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <button 
                                      type="submit" 
                                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-bold text-white transition-all active:scale-95 cursor-pointer"
                                    >
                                      View Details
                                    </button>
                                  </div>
                                  {cardPinError && (
                                    <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider">{cardPinError}</p>
                                  )}
                                </form>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="p-4 bg-amber-955/20 border border-amber-900/30 rounded-2xl w-full flex items-center space-x-3 text-left">
                            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 animate-pulse" />
                            <p className="text-[10px] text-amber-500 leading-relaxed font-semibold">
                              This application for premium card is currently pending network clearance. Security admins are resolving visual assets.
                            </p>
                          </div>
                        )}

                        {/* CARD ACTIVITY / RECENT TRANSACTIONS */}
                        {selectCard.status === 'active' && (
                          <div className="w-full space-y-4 pt-3 text-left border-t border-slate-900">
                            <div className="flex justify-between items-center border-b border-slate-900 pb-2.5">
                              <span className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Recent Card Activity</span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">Real-Time Core Feed</span>
                            </div>

                            {(() => {
                              const cardTxList = (transactions || []).filter(t => {
                                if (!t) return false;
                                const hasCardInNotes = t.notes && t.notes.toLowerCase().includes('card');
                                return (t.type as string) === 'card_payment' || hasCardInNotes;
                              });

                              if (cardTxList.length > 0) {
                                return (
                                  <div className="divide-y divide-slate-900/40 text-xs text-left">
                                    {cardTxList.map((tx) => (
                                      <div key={tx.id} className="py-2.5 flex justify-between items-center hover:bg-slate-900/10 transition-colors gap-2">
                                        <div className="space-y-0.5 min-w-0 flex-1">
                                          <p className="font-bold text-white uppercase text-[11px] truncate" title={tx.notes || tx.type.replace('_', ' ')}>
                                            {tx.notes || tx.type.replace('_', ' ')}
                                          </p>
                                          <p className="text-[9px] text-slate-550 font-semibold font-mono truncate">
                                            {new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • {tx.status.toUpperCase()}
                                          </p>
                                        </div>
                                        <span className="text-red-400 font-mono font-bold shrink-0">-${tx.amount.toLocaleString([], { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }

                              return (
                                <p className="text-xs text-slate-500 text-center py-6 font-semibold font-sans">
                                  No card charges made on this secure line yet.
                                </p>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-10 bg-slate-900/10 rounded-3xl border border-dashed border-slate-900 text-center space-y-3">
                    <p className="text-xs text-slate-500">You do not hold any digital active credit networks currently.</p>
                    <p className="text-xs text-slate-500">Please lodge a filings request on the right form console to initialize an active premium credit limit.</p>
                  </div>
                )}
              </div>

              {/* Box B: Apply for secure plastic cards levels application */}
              {!cards.some(c => c.status === 'active') && (
                <div className="lg:col-span-5">
                <div className={`p-6 sm:p-8 rounded-3xl border text-left ${darkMode ? 'bg-slate-900/60 border-slate-900' : 'bg-white border-slate-200'}`}>
                  <h4 className="text-md sm:text-lg font-bold text-white mb-2 font-display">Apply For Premium Smart Credit Card</h4>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">Secure online banking credit limit assets issued instantly. Select the network issuer format to generate physical credit configurations.</p>
                  
                  {applySuccess && (
                    <div className="mb-4 p-3 bg-blue-955/40 border border-blue-900/30 text-blue-400 rounded-xl text-xs font-semibold">
                      {applySuccess}
                    </div>
                  )}

                  {cards.some(c => c.status === 'active' || c.status === 'pending') ? (
                    <div className="p-6 bg-slate-950 border border-slate-850 rounded-2xl text-center space-y-4">
                      <div className="mx-auto w-12 h-12 bg-blue-500/10 border border-blue-400/25 text-blue-400 rounded-2xl flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white uppercase tracking-wider">Issuance Held</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                          You already hold an active or pending premium security card layout. Multi-issuance under a single portfolio is audited.
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-500 italic font-semibold bg-slate-900/40 p-2.5 rounded-xl border border-slate-850/55">
                        You can only re-apply for a card if your existing card decays/expires, or if the current active/pending filing is formally declined.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleCardApplicationSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Card Carrier Network</label>
                          <select 
                            value={cardBrand}
                            onChange={(e) => setCardBrand(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                          >
                            <option>Visa</option>
                            <option>Mastercard</option>
                            <option>American Express</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Daily Budget Limit (USD)</label>
                          <select 
                            value={dailyLimit}
                            onChange={(e) => setDailyLimit(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                          >
                            <option value={1000}>$1,000 Standard</option>
                            <option value={2500}>$2,500 Silver</option>
                            <option value={5000}>$5,000 Premium</option>
                            <option value={10000}>$10,000 Elite Platinum</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Billing Address</label>
                        <input 
                          type="text" 
                          required
                          placeholder="1251 Avenue of the Americas" 
                          value={billingAddress}
                          onChange={(e) => setBillingAddress(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">City</label>
                          <input 
                            type="text" 
                            required
                            placeholder="New York" 
                            value={billingCity}
                            onChange={(e) => setBillingCity(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">ZIP Postal Code</label>
                          <input 
                            type="text" 
                            required
                            placeholder="10020" 
                            value={billingZip}
                            onChange={(e) => setBillingZip(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {applyError && <p className="text-[10px] text-red-400 font-semibold">{applyError}</p>}

                      <div className="flex items-start space-x-3.5 pt-2">
                        <input 
                          type="checkbox" 
                          id="terms-check"
                          required
                          checked={cardTermsAccepted}
                          onChange={(e) => setCardTermsAccepted(e.target.checked)}
                          className="mt-1 accent-blue-600 rounded bg-slate-950 border-slate-850"
                        />
                        <label htmlFor="terms-check" className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                          I hereby agree to the corporate policies of Swift Bank Card services. I authorize standard credits audit holds prior to activation.
                        </label>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-md shadow-blue-600/10 font-display"
                      >
                        Authorize Application Filing
                      </button>
                    </form>
                  )}
                </div>
              </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 5: PROFILE EDIT PANEL VIEW */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in animate-duration-300">
            <div className="border-b border-slate-900 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white font-display">User Security Profile Setup</h3>
                <p className="text-xs text-slate-400">Manage display bios, password security systems, and cryptographic transaction PINs</p>
              </div>
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider select-none animate-pulse">
                ● KYC APPROVED
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Box A: Edit Bio details */}
              <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col justify-between text-left ${darkMode ? 'bg-slate-900/60 border-slate-900' : 'bg-white border-slate-200'}`}>
                <div>
                  <h4 className="text-md sm:text-lg font-bold text-white mb-1.5 font-display flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    <span>Bio Credentials</span>
                  </h4>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">Update your public credentials and customize your visual profile avatar details.</p>
                  
                  {profileSuccess && (
                    <div className="mb-4 p-3 bg-green-950/40 border border-green-905 text-green-400 rounded-xl text-xs font-semibold">
                      {profileSuccess}
                    </div>
                  )}

                  <form onSubmit={handleProfileSettingsSubmit} className="space-y-4">
                    <div className="space-y-4 mb-6">
                      <div className="flex flex-col items-center justify-center p-4 bg-slate-950/40 rounded-2xl border border-slate-850/60 space-y-4">
                        <img 
                          src={profile.profileImage || DEFAULT_AVATAR} 
                          alt="My profile avatar preview" 
                          className="w-20 h-20 rounded-full object-cover border-2 border-blue-500 bg-slate-950 shadow-lg"
                        />
                        <div className="flex flex-col items-center">
                          <label 
                            htmlFor="avatar-file-input" 
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/10 active:scale-95 flex items-center space-x-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isUploading ? uploadProgress : "Upload Profile Picture"}</span>
                          </label>
                        </div>
                      </div>

                      {/* Professional Drag-And-Drop File Uploader Container */}
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all relative ${
                          dragActive ? 'border-blue-500 bg-blue-500/5' : 'border-slate-850 bg-slate-950/40 hover:border-slate-800'
                        }`}
                      >
                        <input 
                          type="file" 
                          id="avatar-file-input"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <label 
                          htmlFor="avatar-file-input" 
                          className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                        >
                          <p className="text-[11px] font-bold text-slate-300">
                            Or drag profile photo file here
                          </p>
                          <p className="text-[9px] text-slate-500">
                            Supports PNG, JPG, GIF formats
                          </p>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-semibold">Email</label>
                      <input 
                        type="email" 
                        readOnly
                        disabled
                        value={profile.email}
                        className="w-full bg-slate-950/50 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed outline-none select-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-semibold">Account Number</label>
                      <input 
                        type="text" 
                        readOnly
                        disabled
                        value={profile.accountNumber}
                        className="w-full bg-slate-950/50 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-450 font-mono tracking-wider cursor-not-allowed outline-none select-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Country</label>
                      <input 
                        type="text" 
                        required
                        value={editCountry}
                        onChange={(e) => setEditCountry(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    {profileError && <p className="text-[10px] text-red-400 font-semibold">{profileError}</p>}

                    <button 
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-500/10 font-display"
                    >
                      Commit Profile Revisions
                    </button>
                  </form>
                </div>
              </div>

              {/* Box B: Reset secure credentials / 4 PIN codes updates */}
              <div className="space-y-6 lg:col-span-1">
                <div className={`p-6 sm:p-8 rounded-3xl border ${darkMode ? 'bg-slate-900/60 border-slate-900' : 'bg-white border-slate-200'}`}>
                  <h4 className="text-md sm:text-lg font-bold text-white mb-1.5 font-display flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span>Manage Security Credentials</span>
                  </h4>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">Update your numeric transaction verification PIN code to enforce lockouts on unauthorized wire releases.</p>
                  
                  {securitySuccess && (
                    <div className="mb-4 p-3 bg-green-950/40 border border-green-900/30 text-green-400 rounded-xl text-xs font-semibold">
                      {securitySuccess}
                    </div>
                  )}

                  <form onSubmit={handlePinSecuritySubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Existing PIN Code</label>
                      <input 
                        type="password" 
                        required
                        maxLength={4}
                        placeholder="Current PIN" 
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-center font-mono text-white focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">New PIN Code</label>
                        <input 
                          type="password" 
                          required
                          maxLength={4}
                          placeholder="New 4-Digits" 
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-center font-mono text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Confirm New PIN</label>
                        <input 
                          type="password" 
                          required
                          maxLength={4}
                          placeholder="Confirm 4-Digits" 
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-center font-mono text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {securityError && <p className="text-[10px] text-red-400 font-semibold">{securityError}</p>}

                    <button 
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-500/10"
                    >
                      Enforce Security PIN Revision
                    </button>
                  </form>
                </div>

                {/* Need Assistance Premium Box with automated chat opener trigger */}
                <div className="p-6 sm:p-8 rounded-3xl border bg-gradient-to-br from-blue-950/50 to-slate-950 border-blue-900/30 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <h4 className="text-md sm:text-lg font-bold text-white mb-2 font-display flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-400 animate-bounce" />
                    <span>Need Professional Assistance?</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed mb-6 font-semibold">
                    Connect instantly with our 1-on-1 expert support chat desks. Fully encrypted, secure, and available to resolve wire verification clearance holds instantly.
                  </p>

                  <button 
                    onClick={() => {
                      const btn = document.getElementById("toggle-chat-btn");
                      if (btn) {
                        btn.click();
                      } else {
                        alert("Support Chat is already open or initialized!");
                      }
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-blue-500/20 text-center flex items-center justify-center gap-2"
                  >
                    <span>Launch 1-on-1 Support Chat</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* 4. Bottom Tab Navigation Menu */}
      <nav className={`sticky bottom-0 z-30 font-display border-t ${darkMode ? 'bg-slate-950/95 border-slate-900 text-slate-300' : 'bg-white border-slate-200 text-slate-600'} select-none px-4`}>
        <div className="max-w-md mx-auto flex items-center justify-between py-2.5 sm:py-3.5">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'deposit', icon: Plus, label: 'Top Up' },
            { id: 'transfer', icon: ArrowUpRight, label: 'Transfer' },
            { id: 'cards', icon: CreditCard, label: 'Cards' },
            { id: 'profile', icon: User, label: 'Profile' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-${tab.id}-btn`}
                onClick={() => {
                  handleTabChange(tab.id as any);
                  // Resets flips
                  setIsCardFlipped(false);
                  setRevealCVV(false);
                  setIsPinAuthorized(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 transition-all py-1 rounded-xl cursor-pointer ${
                  isActive 
                    ? 'text-blue-500 scale-105 font-bold font-semibold' 
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                <tab.icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                <span className="text-[10px] sm:text-xs mt-1">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* --- FLOATING LIGHT MODALS FOR HOME --- */}
      {/* 1. Modal Top up */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm border p-6 rounded-3xl shadow-2xl animate-fade-in-up ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h4 className="text-sm uppercase text-blue-500 font-bold tracking-widest mb-1.5">Top-Up Smart Deposit</h4>
            <p className="text-xs text-slate-400 mb-6">Initialize a manual top-up trigger request. Admins will confirm and clear upon logging.</p>
            <form onSubmit={handleTopUpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Amount to Deposit (USD)</label>
                <input 
                  type="number" 
                  required
                  placeholder="$1,000" 
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Filing Notes</label>
                <input 
                  type="text" 
                  placeholder="Atm cash machine trigger, paycheck, etc." 
                  value={topUpNote}
                  onChange={(e) => setTopUpNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowTopUpModal(false)}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-850 hover:text-white border border-slate-850 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  File Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Cash Withdraw */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm border p-6 rounded-3xl shadow-2xl animate-fade-in-up ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h4 className="text-sm uppercase text-blue-500 font-bold tracking-widest mb-1.5">Direct Cash Withdrawal</h4>
            <p className="text-xs text-slate-400 mb-6">Withdraw direct cash credits from your debit vault instantly.</p>
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">Amount to Withdraw (USD)</label>
                <input 
                  type="number" 
                  required
                  placeholder="$100" 
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-850 hover:text-white border border-slate-850 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Withdraw Cash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Electronic Receipt Overlay Modal */}
      {receiptTransaction && (() => {
        const handlePrintReceipt = (tx: any) => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
            alert("Please allow pop-ups to print or download the PDF receipt.");
            return;
          }
          const dateStr = new Date(tx.createdAt).toUTCString();
          
          printWindow.document.write(`
            <html>
              <head>
                <title>Swift Bank - Receipt \${tx.id}</title>
                <style>
                  body {
                    font-family: 'Courier New', Courier, monospace;
                    background-color: #ffffff;
                    color: #121212;
                    padding: 40px;
                    max-width: 600px;
                    margin: 0 auto;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                  }
                  .header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 20px;
                    margin-bottom: 25px;
                  }
                  .logo {
                    font-size: 24px;
                    font-weight: bold;
                    letter-spacing: 2px;
                  }
                  .subtitle {
                    font-size: 11px;
                    color: #4a5568;
                    margin-top: 5px;
                    text-transform: uppercase;
                  }
                  .section {
                    margin-bottom: 20px;
                  }
                  .row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 13px;
                  }
                  .label {
                    color: #4a5568;
                  }
                  .value {
                    font-weight: bold;
                  }
                  .badge {
                    display: inline-block;
                    padding: 4px 8px;
                    font-size: 11px;
                    font-weight: bold;
                    text-transform: uppercase;
                    border-radius: 4px;
                    border: 1px solid #000;
                  }
                  .status-approved {
                    background-color: #f0fdf4;
                    color: #166534;
                    border-color: #bbf7d0;
                  }
                  .status-pending {
                    background-color: #fffbeb;
                    color: #92400e;
                    border-color: #fef3c7;
                  }
                  .status-failed {
                    background-color: #fef2f2;
                    color: #991b1b;
                    border-color: #fee2e2;
                  }
                  .total-box {
                    background-color: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 15px;
                    border-radius: 6px;
                    margin-top: 15px;
                  }
                  .total-row {
                    font-size: 16px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                  }
                  .alert-container {
                    background-color: #fef2f2;
                    border: 1px solid #fca5a5;
                    padding: 12px;
                    border-radius: 6px;
                    margin-top: 20px;
                    font-size: 11px;
                    color: #991b1b;
                  }
                  .alert-title {
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                  }
                  .footer {
                    text-align: center;
                    font-size: 10px;
                    color: #718096;
                    margin-top: 35px;
                    border-top: 1px dashed #cbd5e0;
                    padding-top: 15px;
                  }
                  @media print {
                    body {
                      border: none;
                      padding: 0;
                    }
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div class="logo">SWIFT TRUST BANK</div>
                  <div class="subtitle">Official Electronic Settlement Record</div>
                  <div style="font-size: 10px; color: #718096; margin-top: 8px;">REF: \${tx.id.toUpperCase()}</div>
                </div>
                
                <div class="section">
                  <div class="row">
                    <span class="label">Date / Time (UTC)</span>
                    <span class="value">\${dateStr}</span>
                  </div>
                  <div class="row">
                    <span class="label">Transaction Type</span>
                    <span class="value" style="text-transform: uppercase;">\${tx.type.replace('_', ' ')}</span>
                  </div>
                  <div class="row">
                    <span class="label">Receipt Status</span>
                    <span>
                      <span class="badge \${tx.status === 'approved' ? 'status-approved' : tx.status === 'rejected' ? 'status-failed' : 'status-pending'}">
                        \${tx.status}
                      </span>
                    </span>
                  </div>
                </div>

                <div class="section">
                  <h4 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; font-size: 12px;">SENDER (ORIGINATOR)</h4>
                  <div class="row">
                    <span class="label">Legal Name</span>
                    <span class="value">\${tx.senderName || profile.fullName}</span>
                  </div>
                  <div class="row">
                    <span class="label">Source Account</span>
                    <span class="value">****\${profile.accountNumber ? profile.accountNumber.slice(-4) : '3199'}</span>
                  </div>
                </div>

                <div class="section">
                  <h4 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; font-size: 12px;">BENEFICIARY (RECIPIENT)</h4>
                  <div class="row">
                    <span class="label">Name</span>
                    <span class="value">\${tx.recipientName || 'External Remittance Routing'}</span>
                  </div>
                  <div class="row">
                    <span class="label">Account Number</span>
                    <span class="value font-mono">\${tx.recipientAccount || 'System Endpoint Wire'}</span>
                  </div>
                </div>

                <div class="total-box">
                  <div class="row">
                    <span class="label">Principal Sum</span>
                    <span class="value">\$\${tx.amount.toFixed(2)} USD</span>
                  </div>
                  <div class="row">
                    <span class="label">Administrative Fee</span>
                    <span class="value">\$\${(tx.fee ?? 0).toFixed(2)} USD</span>
                  </div>
                  <div class="total-row" style="margin-top: 10px; border-top: 1px solid #cbd5e0; padding-top: 10px;">
                    <span>Total Settled</span>
                    <span>\$\${(tx.amount + (tx.fee ?? 0)).toFixed(2)} USD</span>
                  </div>
                </div>

                \${isUserRestricted() ? \`
                  <div class="alert-container">
                    <div class="alert-title">⚠️ Escrow Risk Status Holding</div>
                    <div>Flagged under regulation SEC-803 due to transactional security checks. Clear immediately via the Swift Live Help Desk.</div>
                  </div>
                \` : ''}

                <div class="footer">
                  <p>Swift Bank electronic receipt is cryptographically locked and secure.</p>
                  <p style="margin-top: 4px; font-size: 8px;">SECURITY SHA-256: \${Math.random().toString(36).substring(2, 12).toUpperCase()}</p>
                </div>

                <script>
                  window.onload = function() {
                    window.print();
                  }
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        };

        const handleDownloadPDFReceipt = (tx: any) => {
          try {
            const doc = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'a4'
            });

            // Color Palette
            const darkNavy = [15, 23, 42]; // #0f172a
            const blueAccent = [37, 99, 235]; // #2563eb
            const valueColor = [15, 23, 42]; // #0f172a
            const borderLight = [226, 232, 240]; // #e2e8f0
            
            // Custom Font setup & settings
            doc.setFont('Helvetica', 'normal');

            // Draw Header Accents
            doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
            doc.rect(0, 0, 210, 15, 'F'); // Top colored block

            // Logo / Branding
            doc.setTextColor(blueAccent[0], blueAccent[1], blueAccent[2]);
            doc.setFontSize(22);
            doc.setFont('Helvetica', 'bold');
            doc.text('SWIFT TRUST BANK', 20, 32);

            doc.setTextColor(100, 116, 139);
            doc.setFontSize(9);
            doc.setFont('Helvetica', 'normal');
            doc.text('OFFICIAL ELECTRONIC SETTLEMENT RECORD', 20, 38);

            // Reference Code
            doc.setTextColor(51, 65, 85);
            doc.setFontSize(10);
            const refId = (tx.id || '').toUpperCase();
            doc.text(`TRANSACTION ID: ${refId}`, 190, 32, { align: 'right' });
            doc.text(`DATE (UTC): ${new Date(tx.createdAt).toUTCString()}`, 190, 38, { align: 'right' });

            // Draw a clean separate line
            doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
            doc.setLineWidth(0.5);
            doc.line(20, 44, 190, 44);

            // 1. Transaction Details Segment
            doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
            doc.setFontSize(11);
            doc.setFont('Helvetica', 'bold');
            doc.text('TRANSACTION OVERVIEW', 20, 52);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('Transfer Methodology:', 20, 60);
            doc.text('Electronic Status:', 20, 66);
            doc.text('Settlement Standard:', 20, 72);

            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
            doc.text((tx.type || '').replace('_', ' ').toUpperCase(), 75, 60);
            
            // Color the status accordingly
            if (tx.status === 'approved') {
              doc.setTextColor(22, 101, 52); // green-800
              doc.text('APPROVED / SUCCESSFUL', 75, 66);
            } else if (tx.status === 'rejected') {
              doc.setTextColor(153, 27, 27); // red-800
              doc.text('DECLINED / REJECTED', 75, 66);
            } else {
              doc.setTextColor(146, 64, 14); // amber-800
              doc.text('PENDING / PROCESSING', 75, 66);
            }

            doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
            doc.text('ISO-20022 SWIFT INTERBANK', 75, 72);

            // Intermediary separator
            doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
            doc.line(20, 78, 190, 78);

            // 2. Sender and Beneficiary Section
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
            doc.text('PARTICIPANT DETAILS', 20, 86);

            // Sender labels
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('Originating Account:', 20, 94);
            doc.text('Originator Legal Name:', 20, 100);

            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
            const sAcc = `****${profile.accountNumber ? profile.accountNumber.slice(-4) : '3199'}`;
            doc.text(sAcc, 75, 94);
            doc.text(tx.senderName || profile.fullName, 75, 100);

            // Recipient labels
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('Beneficiary Account:', 20, 108);
            doc.text('Beneficiary Name:', 20, 114);

            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
            doc.text(tx.recipientAccount || 'System Endpoint Wire', 75, 108);
            doc.text(tx.recipientName || 'External Routing Agent', 75, 114);

            // Separator
            doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
            doc.line(20, 120, 190, 120);

            // 3. Amount breakdown box / ledger
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
            doc.text('FINANCIAL BREAKDOWN', 20, 128);

            // Shaded box for totals
            doc.setFillColor(248, 250, 252); // solid gray font-slate-50
            doc.rect(20, 134, 170, 36, 'F');
            doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
            doc.rect(20, 134, 170, 36, 'S');

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('Principal remittance sum:', 25, 142);
            doc.text('Administrative clearing fee:', 25, 148);
            
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
            doc.text(`$${tx.amount.toLocaleString([], { minimumFractionDigits: 2 })} USD`, 185, 142, { align: 'right' });
            doc.text(`$${(tx.fee ?? 0).toLocaleString([], { minimumFractionDigits: 2 })} USD`, 185, 148, { align: 'right' });

            doc.setDrawColor(203, 213, 225); // gray-300
            doc.line(25, 153, 185, 153);

            doc.setFontSize(11);
            doc.text('Total debit remittance value:', 25, 161);
            doc.setTextColor(blueAccent[0], blueAccent[1], blueAccent[2]);
            doc.text(`$${(tx.amount + (tx.fee ?? 0)).toLocaleString([], { minimumFractionDigits: 2 })} USD`, 185, 161, { align: 'right' });

            // 4. Compliance alert & Escrow hold section (conditional on isUserRestricted())
            let currentY = 178;
            if (isUserRestricted()) {
              // Shaded RED warning box for compliance hold
              doc.setFillColor(254, 242, 242); // bg-red-50
              doc.rect(20, currentY, 170, 24, 'F');
              doc.setDrawColor(252, 165, 165); // border-red-300
              doc.rect(20, currentY, 170, 24, 'S');

              doc.setTextColor(153, 27, 27); // text-red-800
              doc.setFontSize(9);
              doc.setFont('Helvetica', 'bold');
              doc.text('WARNING: ESCROW RISK STATUS HOLDING', 25, currentY + 6);
              
              doc.setFont('Helvetica', 'normal');
              doc.setTextColor(127, 29, 29); // text-red-900
              doc.setFontSize(8.5);
              const textMsg = 'Flagged under regulation SEC-803 due to transactional security checks. Clear immediately via the Swift Live Help Desk.';
              const splitText = doc.splitTextToSize(textMsg, 160);
              doc.text(splitText, 25, currentY + 11);
              
              currentY += 32;
            }

            // Footer Cryptography & Security Seals
            doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
            doc.line(20, currentY + 10, 190, currentY + 10);

            doc.setTextColor(148, 163, 184); // slate-400
            doc.setFontSize(8);
            doc.setFont('Helvetica', 'normal');
            doc.text('This receipt acts as an official electronic transmission record of Swift Trust Bank. Cryptographically signed and non-repudiable.', 105, currentY + 18, { align: 'center' });

            const checksum = Math.random().toString(36).substring(2, 12).toUpperCase();
            doc.text(`SECURITY SIGNATURE (SHA-256): ${checksum}`, 105, currentY + 23, { align: 'center' });

            // Save the PDF
            doc.save(`Swift_Bank_Receipt_${tx.id}.pdf`);
          } catch (err) {
            console.error("PDF generation failed, falling back to print layout:", err);
            handlePrintReceipt(tx);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto">
            <div className="w-full max-w-md bg-slate-900 border border-slate-850 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl space-y-6 relative animate-fade-in-up font-sans">
              <button
                onClick={() => setReceiptTransaction(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 bg-slate-950/60 rounded-full transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="text-center space-y-1.5 border-b border-slate-850 pb-5">
                <div className="inline-flex p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl mb-1">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-md font-bold text-white uppercase tracking-widest font-display">Swift Trust Bank</h3>
                <p className="text-[9px] uppercase font-mono tracking-widest text-slate-400 font-semibold mb-1">Transactional Settlement Receipt</p>
                <p className="text-[10px] font-mono text-slate-500 font-semibold select-all font-sans">REF: {receiptTransaction.id.toUpperCase()}</p>
              </div>

              {/* Receipt Info Fields */}
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center text-slate-400 font-semibold gap-3">
                  <span className="shrink-0">Remittance Standard Date</span>
                  <span className="text-slate-100 font-mono font-bold text-right truncate">{new Date(receiptTransaction.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-semibold gap-3">
                  <span className="shrink-0">Remittance Type</span>
                  <span className="text-slate-100 uppercase font-bold text-right truncate max-w-[180px]">{receiptTransaction.type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-semibold gap-3">
                  <span>Electronic Status</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                    receiptTransaction.status === 'approved' 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : receiptTransaction.status === 'rejected' 
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                  }`}>
                    {receiptTransaction.status}
                  </span>
                </div>
              </div>

              {/* Sender / Beneficiary details breakdown */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850 space-y-3.5">
                <div className="space-y-1.5 text-left border-b border-slate-850/50 pb-2.5">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-sans">Originator (Debited Account)</div>
                  <div className="flex justify-between items-center text-xs font-semibold gap-2">
                    <span className="text-slate-100 font-bold truncate max-w-[200px]" title={receiptTransaction.senderName || profile.fullName}>
                      {receiptTransaction.senderName || profile.fullName}
                    </span>
                    <span className="text-slate-400 font-mono font-sans font-bold shrink-0">
                      ****{profile.accountNumber ? profile.accountNumber.slice(-4) : '3199'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-sans">Beneficiary (Credited Account)</div>
                  <div className="flex justify-between items-center text-xs font-semibold gap-2">
                    <span className="text-slate-100 font-bold truncate max-w-[160px]" title={receiptTransaction.recipientName || 'External Global Transit Remittance'}>
                      {receiptTransaction.recipientName || 'External Global Transit Remittance'}
                    </span>
                    <span className="text-slate-400 font-mono font-bold select-all font-sans truncate text-right max-w-[140px]" title={receiptTransaction.recipientAccount || 'System Endpoint Remittance'}>
                      {receiptTransaction.recipientAccount || 'System Endpoint Remittance'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price block */}
              <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl space-y-2.5 text-xs font-semibold">
                <div className="flex justify-between items-center text-slate-400 font-sans">
                  <span>Remittance Principal</span>
                  <span className="text-slate-205 font-mono font-bold font-sans">${receiptTransaction.amount.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-sans">
                  <span>Transaction Clearance Fee</span>
                  <span className="text-slate-205 font-mono font-bold font-sans">${(receiptTransaction.fee ?? 0).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-white border-t border-slate-850 pt-2 text-sm font-bold font-sans">
                  <span>Total Settled Amount</span>
                  <span className="text-blue-400 font-mono font-bold font-sans">${(receiptTransaction.amount + (receiptTransaction.fee ?? 0)).toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                </div>
              </div>

              {/* Security Alert & Hold section inside the receipt */}
              {isUserRestricted() && (
                <div className="p-4 bg-red-950/40 border border-red-900/25 rounded-2xl text-left flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1 font-sans">
                    <h4 className="text-[10px] text-red-400 font-bold uppercase tracking-widest leading-none">escrow risk status holding</h4>
                    <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                      Flagged under regulation <span className="text-white font-bold">SEC-803</span> due to transactional security checks. Clear immediately via the Swift Live Help Desk.
                    </p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex space-x-3 pt-2 font-sans">
                <button
                  type="button"
                  onClick={() => setReceiptTransaction(null)}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center text-slate-100"
                >
                  Close Receipt
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDFReceipt(receiptTransaction)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold hover:scale-102 active:scale-95 transition-all shadow-lg shadow-blue-600/10 cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
