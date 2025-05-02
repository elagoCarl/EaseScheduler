import { X } from 'lucide-react';

const DeleteTypeRoomWarning = ({ isOpen, onClose, onConfirm, roomTypeName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Confirm Removal</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-gray-600">
                        Are you sure you want to remove the room type
                        <span className="font-semibold"> {roomTypeName}</span>?
                        This action cannot be undone.
                    </p>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteTypeRoomWarning;