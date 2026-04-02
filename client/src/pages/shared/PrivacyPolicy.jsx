import React from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-textPrimary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-textSecondary hover:text-primary transition-colors mb-8 group bg-white/50 px-4 py-2 rounded-full w-fit backdrop-blur-sm border border-gray-100"
        >
          <FiChevronLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-gray-100"
        >
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-gray-900 mb-6">
            Privacy <span className="text-primary">Policy</span>
          </h1>
          <p className="text-textSecondary mb-8 text-lg">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Information We Collect</h2>
              <p>We collect information you provide directly to us when you create an account, place an order, or contact customer support. This may include:</p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Personal identifiers (Name, Email Address, Phone Number)</li>
                <li>Campus location details (Building, Room number)</li>
                <li>Payment information (processed securely by our payment partners)</li>
                <li>Order history and preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">2. How We Use Your Information</h2>
              <p>We use the information we collect to operate, maintain, and improve CampusEats, including to:</p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Process your orders and coordinate delivery</li>
                <li>Communicate with you regarding orders, support, and updates</li>
                <li>Personalize your experience and recommend relevant vendors</li>
                <li>Ensure the security and integrity of our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Information Sharing</h2>
              <p>We do not sell your personal information. We may share necessary details with:</p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Vendors to fulfill your food orders</li>
                <li>Delivery personnel to bring orders to your location</li>
                <li>Service providers who assist in operating our application</li>
                <li>Law enforcement when required by legal processes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Data Security</h2>
              <p>We implement robust industry-standard security measures to protect your personal information from unauthorized access, alteration, or disclosure. However, no electronic transmission or storage is entirely secure, and we cannot guarantee absolute security.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Your Rights</h2>
              <p>You have the right to access, correct, or delete your personal information. You can manage your profile settings within the app or contact our support team to exercise these rights.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Cookies and Tracking</h2>
              <p>We use cookies and similar technologies to enhance your experience, analyze usage patterns, and securely manage your sessions. You can configure your browser to reject cookies, though some features of the app may not function properly.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">7. Contact Us</h2>
              <p>If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at privacy@campuseats.com or via the Contact Us page.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
