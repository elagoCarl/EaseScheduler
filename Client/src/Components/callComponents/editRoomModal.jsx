import { useState, useEffect } from 'react'
import axios from '../../axiosConfig';

const EditRoomModal = ({ room, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        Code: room.Code,
        Floor: room.Floor,
        Building: room.Building,
        Type: room.Type,
        RoomTypeId: room.RoomTypeId || '',
        NumberOfSeats: room.NumberOfSeats || ''
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [roomTypes, setRoomTypes] = useState([]);
    const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);

    // Options for dropdowns
    const floorOptions = [
        "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th",
        "9th", "10th", "11th", "12th", "13th", "14th", "15th"
    ];
    const buildingOptions = ["LV", "GP"];

    // Fetch room types from API
    const fetchRoomTypes = async () => {
        try {
            setLoadingRoomTypes(true);
            const response = await axios.get("/roomType/getAllRoomTypes");
            if (response.data.successful) {
                setRoomTypes(response.data.data);

                // If we have room types and the room has a RoomType but no RoomTypeId
                if (response.data.data.length > 0 && room.Type && !formData.RoomTypeId) {
                    // Find the matching room type
                    const matchingType = response.data.data.find(
                        type => type.Type === room.Type
                    );

                    if (matchingType) {
                        setFormData(prev => ({
                            ...prev,
                            RoomTypeId: matchingType.id
                        }));
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching room types:", error);
            setError("Failed to load room types.");
        } finally {
            setLoadingRoomTypes(false);
        }
    };

    useEffect(() => {
        fetchRoomTypes();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.Code || !formData.Building || !formData.Floor || !formData.RoomTypeId) {
            setError('Please fill out all required fields.');
            return;
        }

        // Validate numeric input for NumberOfSeats
        const seats = parseInt(formData.NumberOfSeats);
        if (isNaN(seats) || seats < 1) {
            setError("Number of seats must be a positive number.");
            return;
        }

        try {
            setSuccessMessage('Updating room... Please wait.');
            setError('');
            setIsLoading(true);

            const response = await axios.put(
                `/room/updateRoom/${room.id}`,
                {
                    ...formData,
                    NumberOfSeats: seats
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            // Update the parent component with the new data
            if (response.data.successful) {
                onUpdate(response.data.data);

                // Show success message
                setSuccessMessage('Room updated successfully!');

                // Close the modal after a short delay
                setTimeout(() => {
                    onClose();
                }, 1000);
            } else {
                setError(response.data.message || 'Failed to update room');
                setSuccessMessage('');
            }

        } catch (error) {
            setError(error.response?.data?.message || 'An error occurred');
            setSuccessMessage('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-customBlue1 p-8 rounded-lg w-11/12 md:w-1/3">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-semibold mx-auto">Edit Room</h2>
                    <button className="text-xl text-white hover:text-black" onClick={onClose}>&times;</button>
                </div>
                <form className="space-y-6 px-4" onSubmit={handleSubmit}>
                    {/* Code Field */}
                    <div>
                        <label className="block font-semibold text-white" htmlFor="Code">
                            Code
                        </label>
                        <input
                            type="text"
                            id="Code"
                            name="Code"
                            value={formData.Code}
                            onChange={handleChange}
                            className="w-full p-2 border rounded bg-customWhite"
                            required
                        />
                    </div>

                    {/* Floor Field as Dropdown */}
                    <div>
                        <label className="block font-semibold text-white" htmlFor="Floor">
                            Floor
                        </label>
                        <select
                            id="Floor"
                            name="Floor"
                            value={formData.Floor}
                            onChange={handleChange}
                            className="w-full p-2 border rounded bg-customWhite"
                            required
                        >
                            {floorOptions.map((floor) => (
                                <option key={floor} value={floor}>{floor}</option>
                            ))}
                        </select>
                    </div>

                    {/* Building Field as Dropdown */}
                    <div>
                        <label className="block font-semibold text-white" htmlFor="Building">
                            Building
                        </label>
                        <select
                            id="Building"
                            name="Building"
                            value={formData.Building}
                            onChange={handleChange}
                            className="w-full p-2 border rounded bg-customWhite"
                            required
                        >
                            {buildingOptions.map((building) => (
                                <option key={building} value={building}>{building}</option>
                            ))}
                        </select>
                    </div>

                    {/* Room Type Field as Dropdown */}
                    <div>
                        <label className="block font-semibold text-white" htmlFor="RoomTypeId">
                            Room Type
                        </label>
                        <select
                            id="RoomTypeId"
                            name="RoomTypeId"
                            value={formData.RoomTypeId}
                            onChange={handleRoomTypeChange}
                            className="w-full p-2 border rounded bg-customWhite"
                            required
                            disabled={loadingRoomTypes || roomTypes.length === 0}
                        >
                            {loadingRoomTypes ? (
                                <option value="">Loading room types...</option>
                            ) : roomTypes.length === 0 ? (
                                <option value="">No room types available</option>
                            ) : (
                                <>
                                    <option value="">Select a room type</option>
                                    {roomTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.Type}
                                        </option>
                                    ))}
                                </>
                            )}
                        </select>
                    </div>

                    {/* NumberOfSeats Field */}
                    <div>
                        <label className="block font-semibold text-white" htmlFor="NumberOfSeats">
                            Number of Seats
                        </label>
                        <input
                            type="number"
                            id="NumberOfSeats"
                            name="NumberOfSeats"
                            value={formData.NumberOfSeats}
                            onChange={handleChange}
                            className="w-full p-2 border rounded bg-customWhite"
                            min="1"
                            required
                        />
                    </div>

                    {/* Error and Success Messages */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                            <span className="block sm:inline">{successMessage}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-4">
                        <button
                            type="submit"
                            disabled={isLoading || loadingRoomTypes}
                            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
                        >
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditRoomModal;