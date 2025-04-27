const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-30 z-50">
      <div className="rounded-md h-50 w-50 border-4 border-t-4 border-blue-500 animate-spin"></div>
    </div>
  );
};

export default LoadingSpinner;