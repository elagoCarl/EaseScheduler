import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "../../axiosConfig";

const AddRoomModal = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        Code: "",
        Floor: "1st",
        Building: "LV",
        Type: "",
        RoomTypeId: "",
        NumberOfSeats: ""
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [roomTypes, setRoomTypes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Options for dropdowns
    const floorOptions = [
        "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th",
        "9th", "10th", "11th", "12th", "13th", "14th", "15th"
    ];
    const buildingOptions = ["LV", "GP"];

    // Fetch room types from API
    const fetchRoomTypes = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/roomType/getAllRoomTypes");
            if (response.data.successful) {
                setRoomTypes(response.data.data);
                // Set default value to first room type if available
                if (response.data.data.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        RoomTypeId: response.data.data[0].id,
                        Type: response.data.data[0].Type // Also set the Type field
                    }));
                }
            }
        } catch (error) {
            console.error("Error fetching room types:", error);
            setErrorMessage("Failed to load room types.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchRoomTypes();
            setFormData({
                Code: "",
                Floor: "1st",
                Building: "LV",
                Type: "",
                RoomTypeId: "",
                NumberOfSeats: ""
            });
            setErrorMessage("");
            setSuccessMessage("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        // Validate numeric input for NumberOfSeats
        const seats = parseInt(formData.NumberOfSeats);
        if (isNaN(seats) || seats < 1) {
            setErrorMessage("Number of seats must be a positive number.");
            return;
        }

        try {
            // Send both Type and RoomTypeId, but the backend will use Type
            const response = await axios.post("/room/addRoom", {
                Code: formData.Code,
                Floor: formData.Floor,
                Building: formData.Building,
                Type: formData.Type,
                RoomTypeId: formData.RoomTypeId,
                NumberOfSeats: seats
            }, {
                headers: { "Content-Type": "application/json" }
            });

            setSuccessMessage("Room added successfully!");

            // Get the complete room data with the RoomType relationship
            try {
                const roomResponse = await axios.get(`/room/getRoom/${response.data.data?.id || response.data.id}`);
                if (roomResponse.data.successful && roomResponse.data.data) {
                    if (onAdd) onAdd(roomResponse.data.data);
                }
            } catch (error) {
                console.error("Error fetching new room details:", error);
                // Fall back to the original response data if we can't get the complete data
                if (onAdd) onAdd(response.data.data || response.data);
            }

            // Don't close the modal immediately so the user can see the success message
            setTimeout(onClose, 2000);
        } catch (error) {
            setErrorMessage(error.response?.data?.message || error.message || "Failed to add room.");
        }
    };

    const handleRoomTypeChange = (e) => {
        const selectedId = e.target.value;
        const selectedType = roomTypes.find(type => type.id.toString() === selectedId.toString());

        setFormData({
            ...formData,
            RoomTypeId: selectedId,
            Type: selectedType ? selectedType.Type : ""
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-semibold mx-auto">Add Room</h2>
                    <button className="text-xl text-white hover:text-black" onClick={onClose}>&times;</button>
                </div>
                <form className="space-y-6 px-4" onSubmit={handleSubmit}>
                    {/* Code Field */}
                    <div>
                        <label className="block font-semibold text-white">Code</label>
                        <input
                            type="text"
                            name="Code"
                            placeholder="Room Code (eg: 101)"
                            className="w-full p-2 border rounded bg-customWhite"
                            value={formData.Code}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Floor Field as Dropdown */}
                    <div>
                        <label className="block font-semibold text-white">Floor</label>
                        <select
                            name="Floor"
                            className="w-full p-2 border rounded bg-customWhite"
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
                    <div>
                        <label className="block font-semibold text-white">Building</label>
                        <select
                            name="Building"
                            className="w-full p-2 border rounded bg-customWhite"
                            value={formData.Building}
                            onChange={handleChange}
                            required
                        >
                            {buildingOptions.map((building) => (
                                <option key={building} value={building}>{building}</option>
                            ))}
                        </select>
                    </div>

                    {/* Room Type Field as Dropdown - Now populated from API */}
                    <div>
                        <label className="block font-semibold text-white">Room Type</label>
                        <select
                            name="RoomTypeId"
                            className="w-full p-2 border rounded bg-customWhite"
                            value={formData.RoomTypeId}
                            onChange={handleRoomTypeChange}
                            required
                            disabled={loading || roomTypes.length === 0}
                        >
                            {loading ? (
                                <option value="">Loading room types...</option>
                            ) : roomTypes.length === 0 ? (
                                <option value="">No room types available</option>
                            ) : (
                                roomTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.Type}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* NumberOfSeats Field */}
                    <div>
                        <label className="block font-semibold text-white">Number of Seats</label>
                        <input
                            type="number"
                            name="NumberOfSeats"
                            placeholder="Number of Seats"
                            className="w-full p-2 border rounded bg-customWhite"
                            value={formData.NumberOfSeats}
                            onChange={handleChange}
                            min="1"
                            required
                        />
                    </div>

                    {/* Success/Error Messages - Enhanced styling */}
                    {errorMessage && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                            <span className="block sm:inline">{errorMessage}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                            <span className="block sm:inline">{successMessage}</span>
                        </div>
                    )}

                    <div className="flex justify-center mt-4 gap-4">
                        <button
                            type="submit"
                            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
                            disabled={loading || roomTypes.length === 0}
                        >
                            Add
                        </button>
                        <button
                            type="button"
                            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                            onClick={onClose}
                        >
                            Cancel
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