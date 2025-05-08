import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "../../axiosConfig";
import { X, Check, AlertCircle, Plus, Trash } from "lucide-react";

const AddRoomModal = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        Code: "",
        Floor: "1st",
        Building: "LV",
        NumberOfSeats: "",
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

    // Reset form and fetch room types when modal opens
    useEffect(() => {
        if (isOpen) {
            resetForm();
            fetchRoomTypes();
        }
    }, [isOpen]);

    // Reset form to initial state
    const resetForm = () => {
        setFormData({
            Code: "",
            Floor: "1st",
            Building: "LV",
            NumberOfSeats: "",
            selectedRoomTypes: [],
            PrimaryTypeId: "" // Reset primary room type
        });
        setErrorMessage("");
        setSuccessMessage("");
        setIsSubmitting(false);
    };

    // Fetch room types from API
    const fetchRoomTypes = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/roomType/getAllRoomTypes");
            if (response.data.successful) {
                setRoomTypes(response.data.data);
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

    if (!isOpen) return null;

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
        setFormData({ ...formData, PrimaryTypeId: e.target.value });
    };

    // Add a room type to the list
    const addRoomType = () => {
        // Check if there are available room types to add
        if (roomTypes.length === 0 ||
            formData.selectedRoomTypes.length === roomTypes.length) {
            return;
        }

        // Find first room type that hasn't been selected yet
        const availableRoomTypes = roomTypes.filter(
            type => !formData.selectedRoomTypes.some(
                selectedType => selectedType.id === type.id
            )
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

        // Check if this type is already selected in another slot
        const isDuplicate = formData.selectedRoomTypes.some(
            (type, idx) => idx !== index && type.id.toString() === value.toString()
        );

        if (isDuplicate) {
            setErrorMessage("This room type is already selected. Please choose another one.");
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
        const seats = parseInt(formData.NumberOfSeats);
        if (isNaN(seats) || seats < 1) {
            setErrorMessage("Number of seats must be a positive number.");
            shakeForm();
            setIsSubmitting(false);
            return;
        }

        if (!formData.PrimaryTypeId) {
            setErrorMessage("Please select a primary room type.");
            shakeForm();
            setIsSubmitting(false);
            return;
        }

        try {
            // Create room data object
            const roomData = {
                Code: formData.Code,
                Floor: formData.Floor,
                Building: formData.Building,
                NumberOfSeats: seats,
                RoomTypeIds: formData.selectedRoomTypes.map(type => type.id),
                PrimaryTypeId: formData.PrimaryTypeId // Include primary room type
            };

            // Call the new combined API endpoint
            const response = await axios.post("/room/addRoomWithTypes", {
                rooms: [roomData]  // API supports array of rooms
            }, {
                headers: { "Content-Type": "application/json" }
            });

            if (!response.data.successful) {
                throw new Error(response.data.message || "Failed to add room");
            }

            setSuccessMessage("Room added successfully!");

            // Pass the newly created room back to parent component
            if (onAdd && response.data.data && response.data.data.length > 0) {
                onAdd(response.data.data[0]);
            }

            // Don't close the modal immediately so user can see success message
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            setErrorMessage(error.response?.data?.message || error.message || "Failed to add room.");
            shakeForm();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-11/12 md:max-w-xl overflow-hidden transform transition-all">
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl text-white font-semibold">Add Room</h2>
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

                    {/* NumberOfSeats Field */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Number of Seats</label>
                        <input
                            type="number"
                            name="NumberOfSeats"
                            placeholder="Number of Seats"
                            className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                            value={formData.NumberOfSeats}
                            onChange={handleChange}
                            min="1"
                            required
                        />
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
                                            {roomTypes.map((type) => (
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
                            {isSubmitting ? "Adding..." : "Add Room"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

AddRoomModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onAdd: PropTypes.func,
};

export default AddRoomModal;    