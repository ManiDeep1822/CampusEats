import React from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const TermsConditions = () => {
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
            Terms & <span className="text-primary">Conditions</span>
          </h1>
          <p className="text-textSecondary mb-8 text-lg">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Agreement to Terms</h2>
              <p>By accessing or using the CampusEats application, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, please do not use our services.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Use of Service</h2>
              <p>CampusEats provides a platform for students to order food from campus vendors. You agree to use this service only for lawful purposes and in accordance with these Terms.</p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>You must provide accurate and complete information when creating an account.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You agree not to disrupt or interfere with the security or operation of the application.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Ordering and Payment</h2>
              <p>All orders placed through CampusEats are subject to availability and acceptance by the respective vendor. Prices are subject to change without notice. By providing a payment method, you represent and warrant that you are authorized to use it.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Cancellations and Refunds</h2>
              <p>Orders may only be cancelled prior to the vendor starting preparation. Refunds will be processed according to our refund policy and may take 3-5 business days to reflect in your account.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">5. User Conduct</h2>
              <p>You agree not to engage in any prohibited conduct, including but not limited to submitting false orders, harassing vendors or delivery personnel, or using the platform for unauthorized commercial purposes.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Limitation of Liability</h2>
              <p>CampusEats serves only as a facilitator between users and vendors. We are not liable for the quality, safety, or exactness of the food provided by vendors. Our liability is limited to the maximum extent permitted by applicable law.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">7. Changes to Terms</h2>
              <p>We reserve the right to modify these terms at any time. We will notify users of any significant changes via email or through the application. Continued use of the service constitutes acceptance of the new terms.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsConditions;
