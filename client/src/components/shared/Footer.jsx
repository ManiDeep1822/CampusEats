import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-white/80 backdrop-blur-xl border-t border-gray-100 py-12 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <Link to="/" className="text-2xl font-black font-heading tracking-tight text-primary">
            Campus<span className="text-textPrimary">Eats</span>
          </Link>
          <p className="text-sm text-textSecondary mt-2">© {new Date().getFullYear()} CampusEats. All rights reserved.</p>
        </div>
        
        <div className="flex gap-6 text-sm font-medium text-textSecondary">
          <Link to="/terms" className="hover:text-primary transition-colors">
            Terms & Conditions
          </Link>
          <Link to="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link to="/contact" className="hover:text-primary transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
