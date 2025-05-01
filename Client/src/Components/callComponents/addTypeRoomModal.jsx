import { useState, useEffect } from "react";
import axios from "../../axiosConfig.js";
import { X } from 'lucide-react';
import { toast } from 'react-toastify';

const AddTypeRoomModal = ({ isOpen, onClose, roomId, onAdd, currentRoomTypes = [] }) => {
    const [roomTypes, setRoomTypes] = useState([]);
    const [selectedRoomTypeId, setSelectedRoomTypeId] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRoomTypes = async () => {
            try {
                setLoading(true);
                const response = await axios.get('/roomType/getAllRoomTypes');
                if (response.data.successful) {
                    // Filter out room types that are already associated with this room
                    const currentTypeIds = currentRoomTypes.map(type => type.id);
                    const availableTypes = response.data.data.filter(type => !currentTypeIds.includes(type.id));
                    setRoomTypes(availableTypes);
                }
            } catch (error) {
                toast.error("Error fetching room types");
                console.error("Error fetching room types:", error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchRoomTypes();
            setSelectedRoomTypeId("");
        }
    }, [isOpen, currentRoomTypes]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedRoomTypeId) {
            toast.warning("Please select a room type");
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post('/room/addTypeRoom', {
                RoomId: roomId,
                RoomTypeId: selectedRoomTypeId
            });

            if (response.data.successful) {
                toast.success("Room type added successfully");
                onAdd();
                onClose();
            } else {
                toast.error(response.data.message || "Failed to add room type");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error adding room type";
            toast.error(errorMessage);
            console.error("Error adding room type:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-blue-600 text-white">
                    <h2 className="text-lg font-semibold">Add Room Type</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-blue-700 focus:outline-none"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">
                            Room Type
                        </label>
                        {roomTypes.length > 0 ? (
                            <select
                                value={selectedRoomTypeId}
                                onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            >
                                <option value="">Select a room type</option>
                                {roomTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.Type}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-gray-500 italic">
                                No available room types to add. All room types may already be associated with this room.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                            disabled={loading || !selectedRoomTypeId}
                        >
                            {loading ? "Adding..." : "Add Room Type"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTypeRoomModal;