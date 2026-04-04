import React, { useState, useEffect } from 'react';
import { FiDownload, FiArrowRight } from 'react-icons/fi';

const InstallPWA = ({ className, containerClass, buttonStyle = 'navbar', showOnDesktop = true }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    // Capture the early event if it fired before the component mounted
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      window.deferredPrompt = e; // Sync back to global just in case
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  // Don't render if already installed or if the prompt is not available
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  let button = null;

  // Navbar Style (Sleek button)
  if (buttonStyle === 'navbar') {
    button = (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-2 group px-4 py-2 bg-orange-50 text-primary rounded-xl font-bold border border-orange-100 hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95 ${className}`}
        title="Download Web App"
      >
        <FiDownload className="text-lg group-hover:scale-110 transition-transform" />
        <span className="hidden lg:inline text-sm whitespace-nowrap">Install App</span>
      </button>
    );
  }

  // Hero Style (Large CTA)
  else if (buttonStyle === 'hero') {
    button = (
      <button
        onClick={handleInstallClick}
        className={`flex items-center justify-center gap-3 px-8 py-4 bg-white text-primary rounded-2xl font-black text-lg shadow-xl shadow-orange-500/10 hover:shadow-orange-500/20 hover:-translate-y-1 transition-all active:scale-95 border-2 border-primary/5 ${className}`}
      >
        <div className="p-2 bg-orange-100 rounded-xl text-primary">
          <FiDownload size={24} />
        </div>
        <div className="text-left">
          <span className="block text-xs uppercase tracking-widest font-black opacity-50 leading-none mb-1">Get the App</span>
          <span className="block leading-none">Install CampusEats</span>
        </div>
        <FiArrowRight className="ml-2 opacity-30" />
      </button>
    );
  }

  // Profile Style (List item)
  else if (buttonStyle === 'profile') {
    button = (
      <button
        onClick={handleInstallClick}
        className={`w-full flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-gray-100 hover:bg-orange-50 hover:border-orange-200 transition-all group ${className}`}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm text-primary group-hover:bg-primary group-hover:text-white transition-all">
            <FiDownload />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800">Download Official App</p>
            <p className="text-xs text-slate-500">Install shortcut on your home screen or desktop</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
          <FiArrowRight />
        </div>
      </button>
    );
  }

  if (button && containerClass) {
    return <div className={containerClass}>{button}</div>;
  }

  return button;
};

export default InstallPWA;
