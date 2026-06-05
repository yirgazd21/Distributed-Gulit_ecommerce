import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaLinkedin, 
  FaMapMarkerAlt, 
  FaPhoneAlt, 
  FaEnvelope 
} from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 pt-16 pb-8 border-t-4 border-green-500 mt-auto transition-colors">
      <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          {/* Column 1: Brand & About */}
          <div className="space-y-4">
            <Link to="/" className="flex flex-col justify-center">
              <span className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                GULIT<span className="text-green-500">.</span>
              </span>
              <span className="text-[10px] tracking-[0.2em] font-bold text-gray-500 dark:text-gray-500 uppercase mt-1">
                Modern Market
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Your premium destination for quality products. Bridging the gap between traditional markets and modern e-commerce.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"><FaFacebook size={14} /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"><FaTwitter size={14} /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"><FaInstagram size={14} /></a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"><FaLinkedin size={14} /></a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-gray-900 dark:text-white font-bold mb-6 uppercase tracking-wider text-sm">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className="hover:text-green-400 transition-colors">Home</Link></li>
              <li><Link to="/cart" className="hover:text-green-400 transition-colors">Shopping Cart</Link></li>
              <li><Link to="/profile" className="hover:text-green-400 transition-colors">My Account</Link></li>
              <li><Link to="/profile?tab=orders" className="hover:text-green-400 transition-colors">Order History</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Service */}
          <div>
            <h4 className="text-gray-900 dark:text-white font-bold mb-6 uppercase tracking-wider text-sm">Customer Service</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="#" className="hover:text-green-400 transition-colors">Help Center</Link></li>
              <li><Link to="#" className="hover:text-green-400 transition-colors">Returns & Refunds</Link></li>
              <li><Link to="#" className="hover:text-green-400 transition-colors">Shipping Info</Link></li>
              <li><Link to="#" className="hover:text-green-400 transition-colors">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div>
            <h4 className="text-gray-900 dark:text-white font-bold mb-6 uppercase tracking-wider text-sm">Contact Us</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <FaMapMarkerAlt className="text-green-500 mt-1 flex-shrink-0" />
                <span>Debre Berhan, Kebele 06<br />Debre Berhan, Ethiopia</span>
              </li>
              <li className="flex items-center gap-3">
                <FaPhoneAlt className="text-green-500 flex-shrink-0" />
                <span>+251 911 234 567</span>
              </li>
              <li className="flex items-center gap-3">
                <FaEnvelope className="text-green-500 flex-shrink-0" />
                <span>gulitecommerce.noreplay@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-300 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} Gulit E-Commerce. All rights reserved.
          </p>
          <div className="flex gap-3">
            <div className="h-8 px-3 bg-gray-200 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider hover:border-gray-500 transition-colors cursor-pointer">CBE</div>
            <div className="h-8 px-3 bg-gray-200 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider hover:border-gray-500 transition-colors cursor-pointer">CHAPA</div>
            <div className="h-8 px-3 bg-gray-200 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider hover:border-gray-500 transition-colors cursor-pointer">VISA</div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
