export type ViewType = 'landing' | 'login' | 'register' | 'dashboard' | 'admin';
export type DashboardTab = 'home' | 'transactions' | 'withdraw' | 'cards' | 'profile';
export type AdminTab = 'overview' | 'deposits' | 'transfers' | 'users' | 'landing-page' | 'cards' | 'chat' | 'settings';

export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  age: number;
  country: string;
  accountNumber: string;
  balance: number;
  pin: string; // 4-digit PIN
  status: 'active' | 'blocked';
  profileImage: string;
  createdAt: string;
  isAdmin: boolean;
  restrictTransferIndex?: number;
  restrictMessage?: string;
  restrictActive?: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'local_transfer' | 'intl_transfer';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  recipientName?: string;
  recipientAccount?: string;
  intlMethod?: string; // wire, crypto, paypal, wise, cashapp, zelle, venmo, revolut
  notes?: string;
  createdAt: string;
}

export interface BankCard {
  id: string;
  userId: string;
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  brand: 'Visa' | 'Mastercard' | 'American Express';
  currency: string; // USD
  dailyLimit: number;
  status: 'active' | 'pending' | 'rejected';
  billingAddress: string;
  city: string;
  zipCode: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isReadByAdmin: boolean;
  isReadByUser: boolean;
  ticketStatus: 'open' | 'closed';
  userId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface LandingPageSettings {
  heroTitle: string;
  heroSub: string;
  logoUrl: string;
  faviconUrl: string;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  faqs: string; // JSON or newline string of question/answer pairs
  footerAbout: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankRoutingNumber?: string;
  bankSwiftCode?: string;
  bankAddress?: string;
  btcAddress?: string;
  btcQrCodeUrl?: string;
  usdtAddress?: string;
  usdtNetwork?: string;
  usdtQrCodeUrl?: string;
  minLocalTransfer?: number;
  localTransferFee?: number;
  minIntlTransfer?: number;
  intlTransferFee?: number;
}
