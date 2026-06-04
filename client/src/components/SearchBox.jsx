import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';

const SearchBox = () => {
  const navigate = useNavigate();
  const { keyword: urlKeyword } = useParams(); // Get keyword from URL if it exists
  const [keyword, setKeyword] = useState(urlKeyword || '');

  const submitHandler = (e) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/search/${keyword}`);
    } else {
      navigate('/'); // Go back to home if they search for nothing
    }
  };

  return (
    <form onSubmit={submitHandler} className="relative w-full">
      <input 
        type="text" 
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="Search for items..." 
        className="w-full bg-gray-50 border border-gray-200 rounded-full pl-5 pr-12 py-2.5 focus:border-green-400 focus:bg-white transition-all outline-none text-sm font-medium"
      />
      <button 
        type="submit" 
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
      >
        <FaSearch size={12} />
      </button>
    </form>
  );
};

export default SearchBox;