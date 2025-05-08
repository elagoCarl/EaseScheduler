import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "../../axiosConfig";
import { X, Check, AlertCircle, Plus, Trash } from "lucide-react";

const EditRoomModal = ({ room, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        Code: room?.Code || "",
        Floor: room?.Floor || "1st",
        Building: room?.Building || "LV",
        selectedRoomTypes: [], // Array to store multiple room types
        PrimaryTypeId: "" // New field for primary room type
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [roomTypes, setRoomTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    // Options for dropdowns
    const floorOptions = [
        "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th",
        "9th", "10th", "11th", "12th", "13th", "14th", "15th"
    ];
    const buildingOptions = ["LV", "GP"];

    // Fetch room types and initialize form data when component mounts
    useEffect(() => {
        if (room) {
            fetchRoomTypes();
        }
    }, [room]);

    // Fetch room types from API
    const fetchRoomTypes = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/roomType/getAllRoomTypes");
            if (response.data.successful) {
                const allRoomTypes = response.data.data;
                setRoomTypes(allRoomTypes);

                // Initialize selectedRoomTypes and PrimaryTypeId if the room has associated room types
                if (room.TypeRooms && room.TypeRooms.length > 0) {
                    // Map room's associated types to our format
                    const initialRoomTypes = room.TypeRooms.map(type => ({
                        id: type.id,
                        Type: type.Type
                    }));
                    
                    // Find primary room type (if available)
                    let primaryTypeId = room.PrimaryTypeId || (initialRoomTypes.length > 0 ? initialRoomTypes[0].id : "");
                    
                    setFormData(prev => ({
                        ...prev,
                        selectedRoomTypes: initialRoomTypes,
                        PrimaryTypeId: primaryTypeId
                    }));
                } else if (room.RoomTypeId) {
                    // For backward compatibility with older data structure
                    const matchingType = allRoomTypes.find(
                        type => type.id === room.RoomTypeId
                    );
                    if (matchingType) {
                        setFormData(prev => ({
                            ...prev,
                            selectedRoomTypes: [{
                                id: matchingType.id,
                                Type: matchingType.Type
                            }],
                            PrimaryTypeId: matchingType.id
                        }));
                    }
                } else if (room.Type) {
                    // For older data structure where only Type name is available
                    const matchingType = allRoomTypes.find(
                        type => type.Type === room.Type
                    );
                    if (matchingType) {
                        setFormData(prev => ({
                            ...prev,
                            selectedRoomTypes: [{
                                id: matchingType.id,
                                Type: matchingType.Type
                            }],
                            PrimaryTypeId: matchingType.id
                        }));
                    }
                }
            } else {
                setErrorMessage("Failed to load room types.");
            }
        } catch (error) {
            console.error("Error fetching room types:", error);
            setErrorMessage("Failed to load room types. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Shake form animation for validation errors
    const shakeForm = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle primary room type change
    const handlePrimaryRoomTypeChange = (e) => {
        const newPrimaryTypeId = e.target.value;
        
        // Filter out the new primary type from selected room types to avoid duplication
        const updatedRoomTypes = formData.selectedRoomTypes.filter(
            type => type.id.toString() !== newPrimaryTypeId.toString()
        );
        
        setFormData({ 
            ...formData, 
            PrimaryTypeId: newPrimaryTypeId,
            selectedRoomTypes: updatedRoomTypes
        });
    };

    // Add a room type to the list
    const addRoomType = () => {
        // Check if there are available room types to add
        if (roomTypes.length === 0 ||
            formData.selectedRoomTypes.length === roomTypes.length - 1) { // -1 because primary type is excluded
            return;
        }

        // Find first room type that hasn't been selected yet and isn't the primary type
        const availableRoomTypes = roomTypes.filter(
            type => !formData.selectedRoomTypes.some(
                selectedType => selectedType.id === type.id
            ) && type.id.toString() !== formData.PrimaryTypeId.toString()
        );

        if (availableRoomTypes.length > 0) {
            const newRoomType = {
                id: availableRoomTypes[0].id,
                Type: availableRoomTypes[0].Type
            };
            
            const updatedRoomTypes = [...formData.selectedRoomTypes, newRoomType];
            
            // If this is the first room type, automatically set it as primary
            const PrimaryTypeId = formData.PrimaryTypeId || newRoomType.id;
            
            setFormData({
                ...formData,
                selectedRoomTypes: updatedRoomTypes,
                PrimaryTypeId: PrimaryTypeId
            });
        }
    };

    // Remove a room type from the list
    const removeRoomType = (index) => {
        const updatedRoomTypes = [...formData.selectedRoomTypes];
        const removedType = updatedRoomTypes[index];
        updatedRoomTypes.splice(index, 1);
        
        // Update form data
        let updatedFormData = { 
            ...formData, 
            selectedRoomTypes: updatedRoomTypes 
        };
        
        // If we're removing the primary room type, reset the primary or set to first available
        if (formData.PrimaryTypeId === removedType.id) {
            updatedFormData.PrimaryTypeId = updatedRoomTypes.length > 0 ? updatedRoomTypes[0].id : "";
        }
        
        setFormData(updatedFormData);
    };

    // Handle room type selection change
    const handleRoomTypeChange = (index, value) => {
        const selectedType = roomTypes.find(type => type.id.toString() === value.toString());

        if (!selectedType) return;

        // Check if this type is already selected in another slot or is the primary type
        const isDuplicate = formData.selectedRoomTypes.some(
            (type, idx) => idx !== index && type.id.toString() === value.toString()
        );
        
        const isPrimaryType = value.toString() === formData.PrimaryTypeId.toString();

        if (isDuplicate) {
            setErrorMessage("This room type is already selected. Please choose another one.");
            return;
        }
        
        if (isPrimaryType) {
            setErrorMessage("This room type is already set as the primary type. Please choose another one.");
            return;
        }

        const updatedRoomTypes = [...formData.selectedRoomTypes];
        const oldTypeId = updatedRoomTypes[index].id;
        updatedRoomTypes[index] = {
            id: selectedType.id,
            Type: selectedType.Type
        };

        // Update form data
        let updatedFormData = { 
            ...formData, 
            selectedRoomTypes: updatedRoomTypes 
        };
        
        // If we're changing the primary room type, update the primary
        if (formData.PrimaryTypeId === oldTypeId) {
            updatedFormData.PrimaryTypeId = selectedType.id;
        }
        
        setFormData(updatedFormData);
        setErrorMessage("");
    };

    // Form submission handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");
        setIsSubmitting(true);

        // Validate inputs
        if (!formData.PrimaryTypeId) {
            setErrorMessage("Please select a primary room type.");
            shakeForm();
            setIsSubmitting(false);
            return;
        }
        
        // We don't require additional room types anymore, as having a primary type is sufficient
        // if (formData.selectedRoomTypes.length === 0) {
        //     setErrorMessage("Please select at least one room type.");
        //     shakeForm();
        //     setIsSubmitting(false);
        //     return;
        // }

        try {
            // Create room data object
            const roomData = {
                Code: formData.Code,
                Floor: formData.Floor,
                Building: formData.Building,
                RoomTypeIds: formData.selectedRoomTypes.map(type => type.id),
                PrimaryTypeId: formData.PrimaryTypeId // Include primary room type
            };
            
            // Ensure primary type is not included in RoomTypeIds
            roomData.RoomTypeIds = roomData.RoomTypeIds.filter(
                id => id.toString() !== formData.PrimaryTypeId.toString()
            );

            // Call the API endpoint to update the room
            const response = await axios.put(
                `/room/updateRoom/${room.id}`,
                roomData,
                {
                    headers: { "Content-Type": "application/json" }
                }
            );

            if (!response.data.successful) {
                throw new Error(response.data.message || "Failed to update room");
            }

            setSuccessMessage("Room updated successfully!");

            // Pass the updated room back to parent component
            if (onUpdate) {
                onUpdate(response.data.data);
            }

            // Close the modal after a short delay
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            setErrorMessage(error.response?.data?.message || error.message || "Failed to update room.");
            shakeForm();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-11/12 md:max-w-xl overflow-hidden transform transition-all">
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl text-white font-semibold">Edit Room</h2>
                    <button
                        type="button"
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors duration-200"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form
                    className={`p-6 space-y-4 max-h-[80vh] overflow-y-auto ${isShaking ? 'animate-shake' : ''}`}
                    onSubmit={handleSubmit}
                >
                    {/* Room Code Field */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Room Code</label>
                        <input
                            type="text"
                            name="Code"
                            placeholder="Room Code (eg: 101)"
                            className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                            value={formData.Code}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Floor Field as Dropdown */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Floor</label>
                        <select
                            name="Floor"
                            className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                            value={formData.Floor}
                            onChange={handleChange}
                            required
                        >
                            {floorOptions.map((floor) => (
                                <option key={floor} value={floor}>{floor}</option>
                            ))}
                        </select>
                    </div>

                    {/* Building Field as Dropdown */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Building</label>
                        <select
                            name="Building"
                            className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                            value={formData.Building}
                            onChange={handleChange}
                            required
                        >
                            {buildingOptions.map((building) => (
                                <option key={building} value={building}>{building}</option>
                            ))}
                        </select>
                    </div>

                    {/* Primary Room Type Section */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Primary Room Type</label>
                        <select
                            name="PrimaryTypeId"
                            className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                            value={formData.PrimaryTypeId}
                            onChange={handlePrimaryRoomTypeChange}
                            required
                        >
                            <option value="">Select Primary Room Type</option>
                            {roomTypes.map((type) => (
                                <option key={type.id} value={type.id}>{type.Type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Room Types Section */}
                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-700">Room Types</label>
                            <button
                                type="button"
                                disabled={loading || roomTypes.length === 0 ||
                                    formData.selectedRoomTypes.length === roomTypes.length}
                                className={`flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors
                                          ${(loading || roomTypes.length === 0 ||
                                        formData.selectedRoomTypes.length === roomTypes.length) ?
                                        'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={addRoomType}
                            >
                                <Plus size={16} className="mr-1" /> Add Room Type
                            </button>
                        </div>

                        {formData.selectedRoomTypes.length > 0 ? (
                            formData.selectedRoomTypes.map((roomType, index) => (
                                <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                                    <div className="flex-1">
                                        <select
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={roomType.id}
                                            onChange={(e) => handleRoomTypeChange(index, e.target.value)}
                                            required
                                        >
                                            <option value="">Select Room Type</option>
                                            {roomTypes
                                                .filter(type => type.id.toString() !== formData.PrimaryTypeId.toString())
                                                .map((type) => (
                                                    <option key={type.id} value={type.id}>{type.Type}</option>
                                                ))}
                                        </select>
                                    </div>
                                    {/* Add a badge for the primary room type */}
                                    {formData.PrimaryTypeId === roomType.id && (
                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md">
                                            Primary
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        className="text-red-500 hover:text-red-700 p-1"
                                        onClick={() => removeRoomType(index)}
                                        disabled={formData.selectedRoomTypes.length === 1}
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500 italic">
                                {loading ? "Loading room types..." :
                                    roomTypes.length === 0 ? "No room types available" :
                                        "Please add at least one room type"}
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {errorMessage && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start space-x-2">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{errorMessage}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-start space-x-2">
                            <Check size={18} className="flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{successMessage}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded hover:bg-gray-200 transition duration-200"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || loading || roomTypes.length === 0}
                            className={`px-4 py-2.5 bg-blue-600 text-white font-medium rounded shadow-md hover:bg-blue-700 transition duration-200 flex items-center space-x-2 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
                        >
                            {isSubmitting ? "Updating..." : "Update Room"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

EditRoomModal.propTypes = {
    room: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
};

export default EditRoomModal;