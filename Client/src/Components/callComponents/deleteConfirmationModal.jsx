import React from 'react';

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-blue-600 px-4 py-3">
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
        
        <div className="p-8">
          <div className="mb-6">
            <p className="text-gray-700">{message}</p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;