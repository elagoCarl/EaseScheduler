import { useState, useEffect } from "react";
import axios from "../../axiosConfig";
import { useAuth } from '../authContext';

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
    const [loading, setLoading] = useState(false);
    const [addingRoom, setAddingRoom] = useState(false);

    useEffect(() => {
        if (isOpen) {
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
    };

    const handleSelectRoom = (room) => {
        setSelectedRoom(room);
        setSearchTerm(`${room.Code} - ${room.Building}, Floor ${room.Floor} (${room.Type})`);
        setIsDropdownOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedRoom) {
            setErrorMessage("Please select a room");
            return;
        }

        setAddingRoom(true);
        setErrorMessage("");

        try {
            // Call the API to add department room
            const response = await axios.post("/room/addDeptRoom", {
                roomId: selectedRoom.id,
                deptId: departmentId
            });

            if (response.data.successful) {
                // Pass the selected room back to the parent component
                if (typeof onSelect === 'function') {
                    onSelect(selectedRoom);
                }
                onClose();
            } else {
                setErrorMessage(response.data.message || "Failed to add room to department");
            }
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ||
                error.message ||
                "Failed to add room to department"
            );
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-customBlue1 p-8 rounded-lg md:w-1/2 w-6/12">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl text-white font-semibold mx-auto">Department Room</h2>
                    <button
                        className="text-3xl text-white hover:text-red-500 duration-300"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>
                <form className="space-y-6 px-4" onSubmit={handleSubmit}>
                    {/* Department Name Display Field */}
                    <div className="mb-4">
                        <label className="block font-semibold text-white mb-2">Department</label>
                        <input
                            type="text"
                            value={departmentName}
                            className="w-full p-4 border rounded bg-gray-100 text-gray-800"
                            disabled
                            readOnly
                        />
                    </div>

                    <div className="relative dropdown-container">
                        <label className="block font-semibold text-white mb-2">Search and select room to add to your Department</label>
                        <input
                            type="text"
                            placeholder="Search for a room by code, building, floor, or type..."
                            className="w-full p-4 border rounded bg-customWhite"
                            value={searchTerm}
                            onChange={handleSearch}
                            onClick={() => setIsDropdownOpen(true)}
                            required
                        />

                        {isDropdownOpen && (
                            <div
                                className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg z-50"
                                style={{ maxHeight: "250px" }}
                            >
                                {filteredRooms.length > 0 ? (
                                    filteredRooms.map((room) => (
                                        <div
                                            key={room.id}
                                            className="p-2 hover:bg-gray-100 cursor-pointer"
                                            onClick={() => handleSelectRoom(room)}
                                        >
                                            <div className="font-semibold">{room.Code}</div>
                                            <div className="text-sm text-gray-600">
                                                {room.Building}, Floor {room.Floor} - {room.Type}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-2">
                                        No rooms found matching your search.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {loading && (
                        <p className="text-white text-center">Loading rooms...</p>
                    )}

                    {errorMessage && (
                        <p className="text-red-500 text-center">{errorMessage}</p>
                    )}

                    <div className="flex justify-end mt-10 gap-8 p-4">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-600 duration-300 text-white mt-5 px-14 py-4 rounded-lg"
                            disabled={!selectedRoom || addingRoom}
                        >
                            {addingRoom ? "Adding..." : "Add"}
                        </button>
                        <button
                            type="button"
                            className="bg-gray-500 hover:bg-gray-600 duration-300 text-white mt-5 px-6 py-4 rounded-lg"
                            onClick={onClose}
                            disabled={addingRoom}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDeptRoomModal;