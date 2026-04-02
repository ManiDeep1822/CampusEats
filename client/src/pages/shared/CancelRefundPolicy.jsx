import React from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiRefreshCw, FiXCircle, FiClock } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const CancelRefundPolicy = () => {
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
            Cancellation & <span className="text-primary">Refund Policy</span>
          </h1>
          <p className="text-textSecondary mb-8 text-lg">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-gray-600 leading-relaxed">
            <section className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
              <div className="flex items-center gap-3 mb-4 text-primary">
                <FiXCircle size={24} />
                <h2 className="text-2xl font-bold text-gray-800">1. Cancellation Policy</h2>
              </div>
              <p className="mb-4">We understand that plans change. However, once an order is placed, the following rules apply:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Orders can be cancelled <strong>only within 60 seconds</strong> of placement without any charge.</li>
                <li>Once a vendor has &quot;Accepted&quot; the order or started preparation, cancellations are <strong>not permitted</strong>.</li>
                <li>If an order is cancelled by the vendor due to unavailability, you will not be charged.</li>
              </ul>
            </section>

            <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-3 mb-4 text-blue-600">
                <FiRefreshCw size={24} />
                <h2 className="text-2xl font-bold text-gray-800">2. Refund Eligibility</h2>
              </div>
              <p className="mb-4">Refunds are issued in the following scenarios:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The vendor cancels the order due to item unavailability.</li>
                <li>The order is not delivered within the maximum delivery timeframe (over 90 minutes).</li>
                <li>The delivered items are incorrect or significantly different from the description.</li>
              </ul>
            </section>

            <section className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-3 mb-4 text-emerald-600">
                <FiClock size={24} />
                <h2 className="text-2xl font-bold text-gray-800">3. Processing Time</h2>
              </div>
              <p>Refunds are initiated immediately upon approval but may take <strong>3-7 business days</strong> to reflect in your original payment method (Bank/UPI/Wallet) depending on your financial institution.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Non-Refundable Scenarios</h2>
              <p className="mb-4">Refunds will not be provided if:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The delivery address provided was incorrect or incomplete.</li>
                <li>The user was unreachable at the time of delivery.</li>
                <li>User changed their mind after the food was already being prepared.</li>
              </ul>
            </section>

            <section className="border-t pt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Contact Support</h2>
              <p>If you have any questions regarding your refund status or need to report an issue, please reach out via our <strong>Help Center</strong> or contact your Campus Coordinator.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CancelRefundPolicy;
