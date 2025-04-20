import { useState, useEffect } from "react";
import axios from "../../axiosConfig";

const RoomTypesModal = ({ isOpen, onClose }) => {
    const [roomTypes, setRoomTypes] = useState([]);
    const [formData, setFormData] = useState({
        Type: ""
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState("list");

    // Delete confirmation state
    const [deleteConfirmation, setDeleteConfirmation] = useState({
        isOpen: false,
        typeId: null,
        typeName: ""
    });

    useEffect(() => {
        if (isOpen) {
            fetchRoomTypes();
        }
    }, [isOpen]);

    const fetchRoomTypes = async () => {
        try {
            const response = await axios.get('/roomType/getAllRoomTypes');
            if (response.data.successful) {
                setRoomTypes(response.data.data || []);
            } else {
                setRoomTypes([]);
            }
        } catch (error) {
            console.error("Error fetching room types:", error);
            setRoomTypes([]);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            let response;
            if (isEditing) {
                response = await axios.put(
                    `/roomType/updateRoomType/${editingId}`,
                    formData
                );
            } else {
                response = await axios.post(
                    "/roomType/addRoomType",
                    formData
                );
            }

            setMessage({
                type: "success",
                text: response.data.message || (isEditing ? "Room type updated successfully." : "Room type created successfully."),
            });

            resetForm();
            fetchRoomTypes();
            setActiveTab("list");
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to process room type.",
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            Type: ""
        });
        setIsEditing(false);
        setEditingId(null);
    };

    const handleEdit = (roomType) => {
        setFormData({
            Type: roomType.Type
        });
        setIsEditing(true);
        setEditingId(roomType.id);
        setActiveTab("form");
    };

    const handleCancel = () => {
        resetForm();
        setActiveTab("list");
    };

    const openDeleteConfirmation = (roomType) => {
        setDeleteConfirmation({
            isOpen: true,
            typeId: roomType.id,
            typeName: roomType.Type
        });
    };

    const closeDeleteConfirmation = () => {
        setDeleteConfirmation({
            isOpen: false,
            typeId: null,
            typeName: ""
        });
    };

    const confirmDelete = async () => {
        try {
            const response = await axios.delete(`/roomType/deleteRoomType/${deleteConfirmation.typeId}`);
            setMessage({
                type: "success",
                text: response.data.message || "Room type deleted successfully.",
            });
            fetchRoomTypes();
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to delete room type. It may be in use by existing rooms.",
            });
        } finally {
            closeDeleteConfirmation();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 md:mx-auto max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-blue-600 p-4 rounded-t-xl flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Room Types Management</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 focus:outline-none"
                    >
                        <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 flex-grow overflow-y-auto">
                    {message && (
                        <div className={`mb-4 p-3 text-center rounded-lg text-white font-medium ${message.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Mobile Tab Navigation */}
                    <div className="md:hidden mb-4 border-b">
                        <div className="flex">
                            <button
                                className={`w-1/2 py-2 text-center ${activeTab === 'form' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}
                                onClick={() => setActiveTab("form")}
                            >
                                {isEditing ? "Edit Room Type" : "Create Room Type"}
                            </button>
                            <button
                                className={`w-1/2 py-2 text-center ${activeTab === 'list' ? 'border-b-2 border-purple-600 text-purple-600 font-medium' : 'text-gray-500'}`}
                                onClick={() => setActiveTab("list")}
                            >
                                Room Types List
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                        {/* Form */}
                        <div className={`w-full md:w-1/3 bg-gray-50 p-4 rounded-lg shadow ${activeTab !== 'form' && 'hidden md:block'}`}>
                            <h3 className="text-lg font-bold mb-4 border-b pb-2">
                                {isEditing ? "Edit Room Type" : "Create Room Type"}
                            </h3>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label htmlFor="type" className="block font-medium text-gray-700 mb-2">Room Type</label>
                                    <input
                                        id="type"
                                        name="Type"
                                        type="text"
                                        placeholder="Enter room type (e.g., Lab, Lecture)"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                        value={formData.Type}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="flex justify-end mt-6 space-x-3">
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            className="px-3 sm:px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 sm:px-6 py-2 bg-blue-600 text-white font-medium rounded shadow hover:bg-blue-700 transition"
                                    >
                                        {loading ? "Processing..." : isEditing ? "Update" : "Create"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* List */}
                        <div className={`w-full md:w-2/3 ${activeTab !== 'list' && 'hidden md:block'}`}>
                            <div className="bg-white rounded-lg shadow p-4">
                                <h3 className="text-lg font-bold mb-4 border-b pb-2">Room Types List</h3>
                                {roomTypes.length === 0 ? (
                                    <div className="text-center py-6">
                                        <p className="text-gray-500">No room types found. Create one to get started.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {roomTypes.map((roomType) => (
                                                    <tr key={roomType.id} className="border-b hover:bg-gray-50 transition">
                                                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{roomType.Type}</td>
                                                        <td className="px-4 py-2 text-sm text-center">
                                                            <button
                                                                className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded mr-2 hover:bg-blue-200"
                                                                onClick={() => handleEdit(roomType)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                                                onClick={() => openDeleteConfirmation(roomType)}
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold mb-4">Confirm Deletion</h3>
                        <p className="mb-6 text-gray-700">
                            Are you sure you want to delete the room type <span className="font-semibold">{deleteConfirmation.typeName}</span>?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={closeDeleteConfirmation}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomTypesModal;