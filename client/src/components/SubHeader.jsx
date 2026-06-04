import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronDown, FaBars, FaChevronRight } from 'react-icons/fa';
import { useGetCategoriesQuery } from '../store/slices/productsApiSlice';

const SubHeader = () => {
  // State to manage dropdown visibility
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const dropdownRef = useRef(null);
  const { data: categories = [] } = useGetCategoriesQuery();

  const categoryPath = (categoryName) => `/category/${encodeURIComponent(categoryName)}`;
  const subcategoryPath = (categoryName, subcategoryName) =>
    `/category/${encodeURIComponent(categoryName)}/${encodeURIComponent(subcategoryName)}`;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const closeDropdown = () => {
    setIsOpen(false);
    setHoveredCategory(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 hidden md:block shadow-sm transition-colors">
      <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-8">
        
        {/* Dropdown Container */}
        <div ref={dropdownRef} className="relative z-50">
          <button 
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white px-5 py-2 rounded-lg font-bold text-sm shadow-md shadow-red-200"
          >
             <FaBars /> Categories 
             <FaChevronDown size={10} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* The Dropdown Menu */}
          {isOpen && (
            <div
              role="menu"
              className="absolute top-full left-0 mt-3 flex bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-2"
            >
              <div className="w-64">
              
              {/* This is the magic "Show All Products" button! */}
              <Link 
                to="/category/all" 
                onClick={closeDropdown}
                className="block px-5 py-3 text-sm font-black text-gray-900 dark:text-white hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 border-b border-gray-100 dark:border-slate-700 transition-colors"
              >
                View All Products
              </Link>

              {/* List out the categories in the dropdown too */}
              <div className="py-2">
                {categories.map((category) => (
                  <Link 
                    key={category._id} 
                    to={categoryPath(category.name)} 
                    onClick={closeDropdown}
                    onMouseEnter={() => setHoveredCategory(category)}
                    className="flex items-center justify-between px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                  >
                    <span>{category.name}</span>
                    {category.subcategories?.length > 0 && <FaChevronRight size={10} />}
                  </Link>
                ))}
              </div>
              </div>

              {hoveredCategory?.subcategories?.length > 0 && (
                <div className="w-60 border-l border-gray-100 dark:border-slate-700 py-2">
                  <p className="px-5 py-2 text-xs font-black uppercase tracking-wider text-gray-400">
                    {hoveredCategory.name}
                  </p>
                  {hoveredCategory.subcategories.map((subcategory) => (
                    <Link
                      key={subcategory.name}
                      to={subcategoryPath(hoveredCategory.name, subcategory.name)}
                      onClick={closeDropdown}
                      className="block px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                    >
                      {subcategory.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Horizontal Scroll Categories (Quick Links) */}
        <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
          {categories.map((category) => (
            <Link 
              key={category._id} 
              to={categoryPath(category.name)} 
              className="text-sm font-bold text-gray-600 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-300 transition-colors whitespace-nowrap"
            >
              {category.name}
            </Link>
          ))}
        </div>
        
      </div>
    </div>
  );
};

export default SubHeader;
