import { useState, useEffect } from "react";
import axios from "../../axiosConfig";
import { useAuth } from '../authContext';
import { X, AlertCircle, Check } from "lucide-react";

const AddDeptRoomModal = ({ isOpen, onClose, onSelect }) => {
    const { user } = useAuth();
    const departmentId = user.DepartmentId;
    const [departmentName, setDepartmentName] = useState("");
    const [rooms, setRooms] = useState([]);
    const [filteredRooms, setFilteredRooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [addingRoom, setAddingRoom] = useState(false);
    const [validationError, setValidationError] = useState("");
    const [isShaking, setIsShaking] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset form when modal opens
            setSelectedRoom(null);
            setSearchTerm("");
            setErrorMessage("");
            setSuccessMessage("");
            setValidationError("");
            fetchRooms();
            fetchDepartmentName();
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = rooms.filter(room => {
                // Add null checks for each property before using toLowerCase()
                const codeMatch = room.Code && typeof room.Code === 'string'
                    ? room.Code.toLowerCase().includes(searchTerm.toLowerCase())
                    : false;

                const buildingMatch = room.Building && typeof room.Building === 'string'
                    ? room.Building.toLowerCase().includes(searchTerm.toLowerCase())
                    : false;

                const floorMatch = room.Floor && typeof room.Floor === 'string'
                    ? room.Floor.toLowerCase().includes(searchTerm.toLowerCase())
                    : false;

                const typeMatch = room.RoomType && room.RoomType.Type && typeof room.RoomType.Type === 'string'
                    ? room.RoomType.Type.toLowerCase().includes(searchTerm.toLowerCase())
                    : false;

                return codeMatch || buildingMatch || floorMatch || typeMatch;
            });
            setFilteredRooms(filtered);
        } else {
            setFilteredRooms(rooms);
        }
    }, [searchTerm, rooms]);

    const fetchDepartmentName = async () => {
        try {
            const response = await axios.get(`/dept/getDept/${departmentId}`);
            if (response.data.successful && response.data.data) {
                setDepartmentName(response.data.data.Name);
            } else {
                setDepartmentName("Unknown Department");
            }
        } catch (error) {
            console.error("Failed to fetch department:", error);
            setDepartmentName("Unknown Department");
        }
    };

    const fetchRooms = async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const response = await axios.get("/room/getAllRoom");

            if (response.data.successful && response.data.data) {
                // Make sure we have valid room data
                const validRooms = response.data.data.filter(room =>
                    room && room.id && room.Code && room.Building && room.Floor);

                // Map room data to ensure consistent structure
                const formattedRooms = validRooms.map(room => ({
                    id: room.id,
                    Code: room.Code || 'Unknown',
                    Building: room.Building || 'Unknown',
                    Floor: room.Floor || 'Unknown',
                    Type: room.RoomType ? room.RoomType.Type : 'Unknown'
                }));

                setRooms(formattedRooms);
                setFilteredRooms(formattedRooms);
            } else {
                setRooms([]);
                setFilteredRooms([]);
            }
        } catch (error) {
            setErrorMessage(error.response?.data?.message || error.message || "Failed to fetch rooms");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setIsDropdownOpen(true);
        // Clear validation error when user starts typing
        setValidationError("");
    };

    const handleSelectRoom = (room) => {
        setSelectedRoom(room);
        setSearchTerm(`${room.Code} - ${room.Building}, Floor ${room.Floor}`);
        setIsDropdownOpen(false);
        // Clear validation error when room is selected
        setValidationError("");
    };

    // Shake form animation for validation errors
    const shakeForm = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Clear previous errors
        setErrorMessage("");
        setValidationError("");
        setSuccessMessage("");

        if (!selectedRoom) {
            setValidationError("Please select a room before adding");
            // Focus on the search input to draw attention
            document.getElementById("room-search").focus();
            shakeForm();
            return;
        }

        setAddingRoom(true);

        try {
            // Call the API to add department room
            const response = await axios.post("/room/addDeptRoom", {
                roomId: selectedRoom.id,
                deptId: departmentId
            });

            if (response.data.successful) {
                setSuccessMessage("Room added to department successfully!");
                // Pass the selected room back to the parent component
                if (typeof onSelect === 'function') {
                    onSelect(selectedRoom);
                }
                // Wait for a moment to show success message before closing
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setErrorMessage(response.data.message || "Failed to add room to department");
                shakeForm();
            }
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ||
                error.message ||
                "Failed to add room to department"
            );
            shakeForm();
        } finally {
            setAddingRoom(false);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isDropdownOpen && !event.target.closest('.dropdown-container')) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    // Handle click outside to close modal
    useEffect(() => {
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape' && !addingRoom) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscapeKey);
        return () => {
            window.removeEventListener('keydown', handleEscapeKey);
        };
    }, [onClose, addingRoom]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-11/12 md:max-w-xl overflow-hidden transform transition-all">
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl text-white font-semibold">Add Department Room</h2>
                    <button
                        type="button"
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors duration-200"
                        onClick={onClose}
                        disabled={addingRoom}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form
                    className={`p-6 space-y-4 h-350 overflow-y-auto ${isShaking ? 'animate-shake' : ''}`}
                    onSubmit={handleSubmit}
                >
                    {/* Department Name Display Field */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Department</label>
                        <input
                            type="text"
                            value={departmentName}
                            className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-gray-50"
                            disabled
                            readOnly
                        />
                    </div>

                    {/* Room Search Field */}
                    <div className="space-y-1.5 relative dropdown-container">
                        <label className="block text-sm font-medium text-gray-700">
                            Search and select room to add to your Department
                            {validationError && (
                                <span className="ml-2 text-red-500">*</span>
                            )}
                        </label>
                        <input
                            id="room-search"
                            type="text"
                            placeholder="Search for a room by code, building, floor, or type..."
                            className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                            value={searchTerm}
                            onChange={handleSearch}
                            onClick={() => setIsDropdownOpen(true)}
                        />

                        {validationError && (
                            <p className="text-red-500 text-sm mt-1">
                                {validationError}
                            </p>
                        )}

                        {isDropdownOpen && (
                            <div
                                className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg z-50"
                                style={{ maxHeight: "250px" }}
                            >
                                {loading ? (
                                    <div className="p-3 text-center text-gray-500">
                                        Loading rooms...
                                    </div>
                                ) : filteredRooms.length > 0 ? (
                                    filteredRooms.map((room) => (
                                        <div
                                            key={room.id}
                                            className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
                                            onClick={() => handleSelectRoom(room)}
                                        >
                                            <div className="font-medium">{room.Code}</div>
                                            <div className="text-sm text-gray-600">
                                                {room.Building}, {room.Floor} Floor
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-gray-500">
                                        No rooms found matching your search.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Loading indicator */}
                    {loading && (
                        <div className="text-center text-gray-500 py-2">
                            <p>Loading rooms...</p>
                        </div>
                    )}

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
                            disabled={addingRoom}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`px-4 py-2.5 bg-blue-600 text-white font-medium rounded shadow-md hover:bg-blue-700 transition duration-200 flex items-center space-x-2 ${addingRoom ? "opacity-75 cursor-not-allowed" : ""}`}
                            disabled={!selectedRoom || addingRoom}
                        >
                            {addingRoom ? "Adding..." : "Add Room"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDeptRoomModal;