const Loader = () => {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
      <p className="text-green-600 font-black text-xs uppercase tracking-widest animate-pulse">Loading Gulit...</p>
    </div>
  );
};

export default Loader;