import { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { LandingPageSettings } from '../types';
import { 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  Globe, 
  CreditCard, 
  Clock, 
  Phone, 
  Mail, 
  MapPin,
  HelpCircle,
  Plus,
  Minus,
  CheckCircle,
  TrendingUp,
  ChevronRight
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'login' | 'register') => void;
  onNavigateAdmin: () => void;
}

export default function LandingPage({ onNavigate, onNavigateAdmin }: LandingPageProps) {
  const [settings, setSettings] = useState<LandingPageSettings>(dbService.getSettings());
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    // Keep settings in sync
    const handleSync = () => {
      setSettings(dbService.getSettings());
    };
    window.addEventListener('swiftbank_update_settings', handleSync);
    return () => {
      window.removeEventListener('swiftbank_update_settings', handleSync);
    };
  }, []);

  const parsedFaqs = () => {
    try {
      return JSON.parse(settings.faqs);
    } catch (e) {
      return [
        { q: "How secure is Swift Bank?", a: "We protect all transactions with AES-256 bank-level encryption and strict multi-factor PIN authentications." }
      ];
    }
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white flex flex-col font-sans">
      
      {/* 1. Header Navigation */}
      <nav id="landing-navbar" className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-900/80 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 shadow-[0_0_20px_rgba(0,87,255,0.3)]">
              <Zap className="w-5.5 h-5.5 text-white fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight font-display text-white">
              SWIFT<span className="text-blue-500">BANK</span>
            </span>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-3.5">
            <button 
              id="landing-login-nav-btn"
              onClick={() => onNavigate('login')} 
              className="px-2 sm:px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Sign In
            </button>
            <button 
              id="landing-register-nav-btn"
              onClick={() => onNavigate('register')} 
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              Open Account
            </button>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section id="hero" className="relative px-4 sm:px-8 pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Background Visual Artifacts */}
        <div className="absolute top-1/4 left-1/3 w-[35rem] h-[35rem] rounded-full bg-blue-600/10 blur-[130px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute right-0 bottom-0 w-96 h-96 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          <div className="lg:col-span-7 flex flex-col space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold w-fit uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Federal Deposit Insurance Corporation standard</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] font-display">
              {settings.heroTitle}
            </h1>
            
            <p className="text-base sm:text-lg text-slate-400 max-w-xl font-medium leading-relaxed">
              {settings.heroSub}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                id="hero-register-btn"
                onClick={() => onNavigate('register')}
                className="flex items-center justify-center space-x-2 px-7 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xl shadow-blue-600/35 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                id="hero-login-btn"
                onClick={() => onNavigate('login')}
                className="flex items-center justify-center space-x-2 px-7 py-4 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <span>Access Online Vault</span>
              </button>
            </div>

            {/* Microstats banner */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-900 max-w-lg">
              <div>
                <div className="text-2xl font-bold font-display text-white">4.9s</div>
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Transfer speed</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-blue-500">0%</div>
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Monthly Fees</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-white">256-bit</div>
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Encrypted standard</div>
              </div>
            </div>
          </div>

          {/* Premium Visual Dashboard & floating info card elements mock */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-blue-600/5 overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest font-mono">SWIFT SECURE VAULT</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>

              {/* Realistic Card Mock */}
              <div className="w-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <p className="text-[10px] text-blue-200 uppercase tracking-widest font-bold mb-1">Total Assets</p>
                    <p className="text-3xl font-extrabold font-mono tracking-tight">$14,840.50</p>
                  </div>
                  <Zap className="w-8 h-8 opacity-75 fill-white" />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] text-blue-200 uppercase tracking-wider font-bold">Account Holder</p>
                    <p className="text-xs font-semibold uppercase tracking-widest">James Swift</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-blue-200 uppercase tracking-wider font-bold">Card Level</p>
                    <p className="text-xs font-bold font-display bg-white/20 px-2 py-0.5 rounded text-[10px]">BLACK AMEX</p>
                  </div>
                </div>
              </div>

              {/* Mock Transfer Feed */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-900">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Deposit Confirmed</p>
                      <p className="text-[10px] text-slate-500 font-mono">Instant P2P Vault</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-400 font-mono">+$2,450.00</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wide">Finished</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-900">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">International Wire Request</p>
                      <p className="text-[10px] text-slate-500 font-mono">Awaiting admin node</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-400 font-mono">-$500.00</p>
                    <p className="text-[9px] text-amber-500 font-semibold uppercase tracking-wide">Awaiting Approval</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Features Grid Section */}
      <section id="features" className="px-4 sm:px-8 py-20 bg-slate-950/50 border-t border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase text-blue-500 font-extrabold tracking-widest">Next-Gen Controls</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 text-white font-display">
              Unrivalled Features Engineered For Wealth Management
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-4 leading-relaxed">
              No long queues or endless bureaucratic forms. Swift Bank leverages real-time digital capabilities to secure, invest, and coordinate cash.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Features list */}
            {[
              { icon: ShieldCheck, title: "Secure Banking", desc: "Simple PIN setup combined with instant security keeps your account locked and safe." },
              { icon: Zap, title: "Fast Transfers", desc: "Send and receive funds instantly. Safe and secure account transfers prevent any delay or errors." },
              { icon: CreditCard, title: "Virtual Cards", desc: "Instantly get digital Visa, Mastercard, or American Express cards with customizable daily spending limits." },
              { icon: Globe, title: "International Payments", desc: "Send USD funds smoothly through multiple payment options like Wise, PayPal, and more." },
              { icon: Clock, title: "24/7 Live Support", desc: "Access real-time conversation from your device. Support is active around the clock." },
              { icon: CheckCircle, title: "Real-Time Transactions", desc: "Review complete details of deposits, transfers, and balances immediately with high contrast." }
            ].map((feat, index) => (
              <div key={index} className="p-6 bg-slate-900/40 border border-slate-900 hover:border-blue-600/30 rounded-2xl transition-all duration-300 hover:scale-[1.02] group">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <feat.icon className="w-5.5 h-5.5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 font-display">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 tracking-wide leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Why Choose Swift Bank section */}
      <section id="why-choose-us" className="px-4 sm:px-8 py-20 bg-slate-950 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs uppercase text-blue-500 font-extrabold tracking-widest">Ultimate Standard</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2 text-white font-display">
              A Premium Experience Designed Around Financial Peace
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-4 leading-relaxed">
              Managing money shouldn't feel old and slow. Why continue paying old traditional banks when you can access transparent, rapid, and secure transfers instantly?
            </p>

            <ul className="space-y-4 mt-8">
              {[
                { title: "Bank-level Security", text: "Secure 4-digit PIN codes protect all your payments." },
                { title: "Instant Transfers", text: "Immediate account updates guarantee zero delays between people." },
                { title: "Global Access", text: "Send money using Wise, Cash App, Zelle, and other global options." },
                { title: "Modern Mobile Experience", text: "Exquisite visual formatting optimized for handheld touch screens and desktop dashboards." }
              ].map((item, id) => (
                <li key={id} className="flex space-x-3.5">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mt-0.5">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white font-display">{item.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-tr from-slate-900 to-slate-950 p-8 rounded-3xl border border-slate-900 shadow-xl relative overflow-hidden flex flex-col items-center">
            {/* Dynamic graphical element generated with clean SVG styling */}
            <div className="w-full text-slate-400 font-mono text-center mb-6 py-4 bg-slate-950 rounded-xl border border-slate-900">
              <span className="text-xs text-blue-500 block uppercase mb-1 font-bold">Live Transfer Stream</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Live API Channel Valid - TLS 1.3</span>
            </div>
            
            <div className="w-full space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-950/70 border-l-2 border-blue-500 rounded-lg">
                <span className="text-xs text-slate-300">BANK TRANSFER COMPLETED • USA</span>
                <span className="text-xs font-mono font-bold text-white">$12,400.00</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-950/70 border-l-2 border-emerald-500 rounded-lg">
                <span className="text-xs text-slate-300">ATM DEPOSIT COMPLETED • NY</span>
                <span className="text-xs font-mono font-bold text-white">$4,000.00</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-950/70 border-l-2 border-indigo-500 rounded-lg">
                <span className="text-xs text-slate-300">CARD INSTANT ACTIVATION</span>
                <span className="text-xs font-mono font-bold text-slate-400">SUCCESS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQs Interactive section */}
      <section id="faqs" className="px-4 sm:px-8 py-20 bg-slate-950/50 border-t border-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs uppercase text-blue-500 font-extrabold tracking-widest">Got Questions?</span>
            <h2 className="text-3xl font-bold tracking-tight mt-1 text-white font-display">Frequently Answered Queries</h2>
          </div>

          <div className="space-y-4">
            {parsedFaqs().map((faq: { q: string; a: string }, idx: number) => (
              <div 
                key={idx} 
                className="bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-5 flex justify-between items-center focus:outline-none cursor-pointer"
                >
                  <span className="font-semibold text-white text-xs sm:text-sm font-display flex items-center space-x-2.5">
                    <HelpCircle className="w-4.5 h-4.5 text-blue-500" />
                    <span>{faq.q}</span>
                  </span>
                  {activeFaq === idx ? (
                    <Minus className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Plus className="w-4 h-4 text-blue-500" />
                  )}
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-400 border-t border-slate-900/60 leading-relaxed font-medium">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer id="landing-footer" className="px-4 sm:px-8 py-16 bg-slate-950 border-t border-slate-900/80 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
          
          <div className="md:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white font-display">SWIFT BANK</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm font-medium leading-relaxed">
              {settings.footerAbout}
            </p>
            <p className="text-[10px] text-slate-500">
              © 2026 Swift Bank Corp. Licensed and regulated.
            </p>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-xs xl:text-sm uppercase font-bold text-white tracking-widest mb-4 font-display">Company Solutions</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><button className="hover:text-blue-500 cursor-pointer">About Swift Wealth</button></li>
              <li><button className="hover:text-blue-500 cursor-pointer">High Yield Savings</button></li>
              <li><button className="hover:text-blue-500 cursor-pointer">Checking Smart Vaults</button></li>
            </ul>
          </div>

          <div className="md:col-span-4 flex flex-col space-y-4">
            <h4 className="text-xs xl:text-sm uppercase font-bold text-white tracking-widest mb-2 font-display">Contact Expert Support</h4>
            <div className="space-y-3 text-xs text-slate-400 font-medium">
              <div className="flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>{settings.contactAddress}</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>{settings.contactPhone}</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>{settings.contactEmail}</span>
              </div>
            </div>

            {/* Hidden door for Admin Panel Login triggers */}
            <div className="pt-2">
              <button 
                id="hidden-admin-btn"
                onClick={onNavigateAdmin}
                className="text-[10px] text-slate-700 hover:text-slate-500 underline transition-colors uppercase tracking-widest font-mono"
              >
                Operational Gate
              </button>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
