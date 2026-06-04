import React from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight, FaCheckCircle } from 'react-icons/fa';

const CheckoutSteps = ({ step1, step2, step3, step4 }) => {
  const steps = [
    { name: 'Sign In', link: '/login', active: step1 },
    { name: 'Shipping', link: '/shipping', active: step2 },
    { name: 'Payment', link: '/payment', active: step3 },
    { name: 'Place Order', link: '/placeorder', active: step4 },
  ];

  return (
    <div className="flex items-center justify-center mb-8 space-x-2 md:space-x-4">
      {steps.map((step, index) => (
        <div key={step.name} className="flex items-center">
          {step.active ? (
            <Link to={step.link} className="flex items-center gap-2 text-green-600 font-bold text-xs md:text-sm hover:underline">
              <FaCheckCircle /> {step.name}
            </Link>
          ) : (
            <span className="text-gray-400 font-bold text-xs md:text-sm cursor-not-allowed">
              {step.name}
            </span>
          )}
          {index < steps.length - 1 && (
            <FaChevronRight className="text-gray-300 ml-2 md:ml-4 w-3 h-3" />
          )}
        </div>
      ))}
    </div>
  );
};

export default CheckoutSteps;