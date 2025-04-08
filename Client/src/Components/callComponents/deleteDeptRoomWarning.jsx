const DeleteWarning = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg w-11/12 md:w-1/3">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-4">
            Are you sure you want to remove this room/s to your department?
          </h2>
          <p className="text-gray-600 text-center mb-6">
            This action cannot be undone.
          </p>
  
          <div className="flex justify-center gap-4">
            <button
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 focus:outline-none"
              onClick={onConfirm}
            >
              Yes, Delete
            </button>
            <button
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 focus:outline-none"
              onClick={onClose}
            >
              No, Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  export default DeleteWarning;