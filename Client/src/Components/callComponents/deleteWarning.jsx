import { motion } from 'framer-motion';

const DeleteWarning = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full mx-4"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Confirm deletion
            </h2>
            <p className="mt-2 text-gray-600 text-sm">
              This action cannot be undone. Are you sure?
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              className="w-full bg-white text-gray-700 border border-gray-200 py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="w-full bg-red-500 text-white py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium text-sm"
              onClick={onConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DeleteWarning;