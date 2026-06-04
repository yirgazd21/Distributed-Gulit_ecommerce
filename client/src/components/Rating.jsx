import React from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

const Rating = ({ value, text }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((index) => (
        <span key={index} className="text-yellow-400 text-sm">
          {value >= index ? (
            <FaStar />
          ) : value >= index - 0.5 ? (
            <FaStarHalfAlt />
          ) : (
            <FaRegStar />
          )}
        </span>
      ))}
      <span className="ml-2 text-sm text-gray-500 font-medium">{text && text}</span>
    </div>
  );
};

export default Rating;