import { useState, useEffect } from "react";
import axios from "../axiosConfig.js";
import { ChevronUp, ChevronDown, Plus, X, Filter, ChevronRight, ChevronLeft, Trash2, Edit, Home, Building } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import LoadingSpinner from './callComponents/loadingSpinner.jsx';
import ErrorDisplay from './callComponents/errDisplay.jsx';
import AddRoomModal from "./callComponents/addRoomModal.jsx";
import AddDeptRoomModal from "./callComponents/addDeptRoomModal.jsx";
import EditRoomModal from "./callComponents/editRoomModal.jsx";
import DeleteWarning from "./callComponents/deleteWarning.jsx";
import DeleteDeptRoomWarning from "./callComponents/deleteDeptRoomWarning.jsx";
import RoomTypesModal from "./callComponents/roomTypesModal.jsx";
import { useAuth } from '../Components/authContext.jsx';
import AddTypeRoomModal from "./callComponents/addTypeRoomModal.jsx";
import DeleteTypeRoomWarning from "./callComponents/deleteTypeRoomWarning.jsx";

const Room = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState("Select Campus");
  const [selectedFloor, setSelectedFloor] = useState("Select Floor");
  const [selectedDepartment, setSelectedDepartment] = useState("Select Department");
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [availableFloors, setAvailableFloors] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const [isDeleteDeptRoomWarningOpen, setIsDeleteDeptRoomWarningOpen] = useState(false);
  const [isRoomTypesModalOpen, setIsRoomTypesModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddTypeRoomModalOpen, setIsAddTypeRoomModalOpen] = useState(false);
  const [selectedRoomForType, setSelectedRoomForType] = useState(null);
  const [isDeleteTypeRoomWarningOpen, setIsDeleteTypeRoomWarningOpen] = useState(false);
  const [selectedTypeForDeletion, setSelectedTypeForDeletion] = useState(null);
  const { user } = useAuth();
  const campuses = ["LV", "GP"];
  const isAdmin = user && user.DepartmentId === null;
  const roomsPerPage = 8;

  const showNotification = (message, type = "info") => toast[type](message);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/dept/getAllDept');
      if (response.data.successful) setDepartments(response.data.data);
    } catch (error) {
      setError("Error fetching departments: " + error.message);
    }
  };

  const fetchRoomTypes = async (roomId) => {
    try {
      const response = await axios.get(`/room/getRoomTypeByRoom/${roomId}`);
      return response.data.successful ? response.data.data : [];
    } catch (error) {
      console.error("Error fetching room types:", error);
      return [];
    }
  };

  const fetchRooms = async (deptId) => {
    try {
      setLoading(true);
      const departmentId = deptId || (user?.DepartmentId || (selectedDepartment !== "Select Department" ? selectedDepartment : null));
      let response;

      if (isAdmin && (!departmentId || selectedDepartment === "Select Department")) {
        response = await axios.get('/room/getAllRoom');
      } else if (departmentId) {
        response = await axios.get(`/room/getRoomsByDept/${departmentId}`);
      } else {
        setRooms([]);
        setFilteredRooms([]);
        setAvailableFloors([]);
        setLoading(false);
        setDataFetched(true);
        return;
      }

      if (response?.data.successful) {
        const roomData = response.data.data || [];

        // Create an array of promises to fetch room types for each room
        const roomsWithTypesPromises = roomData.map(async room => {
          const roomTypes = await fetchRoomTypes(room.id);
          return {
            ...room,
            id: room.id,
            code: room.Code,
            building: room.Building,
            floor: room.Floor,
            seats: room.NumberOfSeats,
            roomTypes: roomTypes, // Store all room types
            minimized: false
          };
        });

        // Wait for all promises to resolve
        const transformedRooms = await Promise.all(roomsWithTypesPromises);

        setRooms(transformedRooms);
        setAvailableFloors([...new Set(roomData.map((room) => room.Floor))]);
        applyFilters(transformedRooms);
      } else {
        setRooms([]);
        setFilteredRooms([]);
        setAvailableFloors([]);
      }
      setDataFetched(true);
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message === "No rooms found") {
        setRooms([]);
        setFilteredRooms([]);
        setAvailableFloors([]);
        setDataFetched(true);
      } else {
        setError("Error fetching rooms: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (roomsData = rooms) => {
    let filtered = roomsData;
    if (selectedCampus !== "Select Campus") {
      filtered = filtered.filter(room => room.Building === selectedCampus);
    }
    if (selectedFloor !== "Select Floor") {
      filtered = filtered.filter(room => room.Floor === selectedFloor);
    }
    if (searchTerm) {
      filtered = filtered.filter(room =>
        room.Code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.roomTypes.some(type => type.Type.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredRooms(filtered);
  };

  const handleEditClick = async (roomId) => {
    try {
      const response = await axios.get(`/room/getRoom/${roomId}`);
      if (response.data.data) {
        setSelectedRoom(response.data.data);
        setIsEditModalOpen(true);
      }
    } catch (error) {
      showNotification("Error fetching room details", "error");
    }
  };

  const handleDeleteClick = (roomId) => {
    setSelectedRoom({ id: roomId });
    isAdmin ? setIsDeleteWarningOpen(true) : setIsDeleteDeptRoomWarningOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRoom) return;
    try {
      if (isAdmin) {
        await axios.delete(`/room/deleteRoom/${selectedRoom.id}`);
      } else {
        await axios.delete('/room/deleteDeptRoom', {
          data: { roomId: selectedRoom.id, deptId: user.DepartmentId }
        });
      }
      fetchRooms();
      setSelectedRoom(null);
      setIsDeleteWarningOpen(false);
      setIsDeleteDeptRoomWarningOpen(false);
      showNotification("Room deleted successfully", "success");
    } catch (error) {
      showNotification("Error deleting room", "error");
    }
  };

  const confirmDeleteRoomType = async () => {
    if (!selectedTypeForDeletion) return;

    try {
      const response = await axios.delete('/room/deleteTypeRoom', {
        data: { RoomId: selectedTypeForDeletion.roomId, RoomTypeId: selectedTypeForDeletion.roomTypeId }
      });

      if (response.data.successful) {
        showNotification("Room type removed successfully", "success");
        fetchRooms(selectedDepartment !== "Select Department" ? selectedDepartment : null);
      } else {
        showNotification(response.data.message || "Failed to remove room type", "error");
      }
    } catch (error) {
      showNotification("Error removing room type: " + (error.response?.data?.message || error.message), "error");
    } finally {
      setIsDeleteTypeRoomWarningOpen(false);
      setSelectedTypeForDeletion(null);
    }
  };

  const handleAddRoomType = (room) => {
    setSelectedRoomForType(room);
    setIsAddTypeRoomModalOpen(true);
  };

  const handleDeleteRoomType = (roomId, roomTypeId, roomTypeName) => {
    setSelectedTypeForDeletion({ roomId, roomTypeId, name: roomTypeName });
    setIsDeleteTypeRoomWarningOpen(true);
  };

  const toggleMinimize = (id) => {
    setRooms(rooms.map(room =>
      room.id === id ? { ...room, minimized: !room.minimized } : room
    ));
  };

  useEffect(() => {
    const initData = async () => {
      if (isAdmin) await fetchDepartments();
      await fetchRooms();
    };
    initData();
  }, [isAdmin]);

  useEffect(() => {
    if (dataFetched) applyFilters();
  }, [selectedCampus, selectedFloor, searchTerm, rooms, dataFetched]);

  const getRoomTypeColor = (type) => {
    const colors = {
      "Lecture Room": "bg-blue-100 text-blue-800 border-blue-200",
      "Laboratory": "bg-green-100 text-green-800 border-green-200",
      "Conference Room": "bg-purple-100 text-purple-800 border-purple-200",
      "Office": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "Computer Lab": "bg-red-100 text-red-800 border-red-200"
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Pagination
  const indexOfLastRoom = currentPage * roomsPerPage;
  const indexOfFirstRoom = indexOfLastRoom - roomsPerPage;
  const currentRooms = filteredRooms.slice(indexOfFirstRoom, indexOfLastRoom);
  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);

  if (loading && !dataFetched) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div className="bg-slate-900 min-h-screen flex flex-col">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex-grow flex justify-center items-center pt-20 pb-8 px-4">
        <div className="w-full max-w-7xl my-50">
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row justify-between items-center">
            <h1 className="text-xl sm:text-3xl font-bold text-white mb-2">Room Management</h1>
            <div className="bg-white px-4 py-2 rounded shadow-md">
              <span className="text-gray-800 font-medium">Total Rooms: <span className="text-blue-600">{rooms.length}</span></span>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white p-4 rounded shadow-md mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search rooms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 pl-11 border rounded shadow-sm border-gray-300 hover:border-gray-400"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-10">
                <button onClick={() => {
                  setSelectedCampus("Select Campus");
                  setSelectedFloor("Select Floor");
                  setActiveTab('all');
                }}
                  className={`px-4 py-2.5 rounded text-sm font-medium ${activeTab === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  All
                </button>
                <div className="relative ml-1">
                  <button onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2.5 rounded text-sm font-medium flex items-center gap-2 ${showFilters ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <Filter size={16} />
                    Filters
                  </button>

                  {showFilters && (
                    <div className="absolute right-0 rounded bg-white shadow-xl w-120">
                      <div className="p-4 space-y-3 w-120">
                        {isAdmin && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <select
                              value={selectedDepartment}
                              onChange={(e) => {
                                setSelectedDepartment(e.target.value);
                                fetchRooms(e.target.value);
                              }}
                              className="w-full border border-gray-300 rounded p-2 text-sm"
                            >
                              <option value="Select Department">Select Department</option>
                              {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>{dept.Name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                          <select
                            value={selectedCampus}
                            onChange={(e) => {
                              setSelectedCampus(e.target.value);
                              setActiveTab('filtered');
                            }}
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                          >
                            <option value="Select Campus">All Campuses</option>
                            {campuses.map((campus, index) => (
                              <option key={index} value={campus}>{campus}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                          <select
                            value={selectedFloor}
                            onChange={(e) => {
                              setSelectedFloor(e.target.value);
                              setActiveTab('filtered');
                            }}
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                          >
                            <option value="Select Floor">All Floors</option>
                            {availableFloors.map((floor, index) => (
                              <option key={index} value={floor}>{floor}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4 border-t border-gray-100 pt-4">
              <button onClick={() => setRooms(rooms.map(room => ({ ...room, minimized: false })))}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center gap-2 shadow-md">
                <ChevronDown size={16} />
                Expand All
              </button>
              <button onClick={() => setRooms(rooms.map(room => ({ ...room, minimized: true })))}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition duration-200 flex items-center gap-2">
                <ChevronUp size={16} />
                Collapse All
              </button>
              <button onClick={() => setIsAddRoomModalOpen(true)}
                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center gap-2 shadow-md">
                <Plus size={16} />
                Add Room
              </button>
              {isAdmin && (
                <button onClick={() => setIsRoomTypesModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition duration-200 flex items-center gap-2 shadow-md">
                  Room Types
                </button>
              )}
            </div>
          </div>

          {/* Room Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            {currentRooms.length > 0 ? (
              currentRooms.map(room => (
                <div key={room.id} className="bg-white rounded shadow-md overflow-hidden hover:shadow-lg transition duration-300">
                  <div className="bg-blue-600 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-white">{room.Code}</h2>
                      </div>
                      <button onClick={() => toggleMinimize(room.id)}
                        className="p-1.5 bg-white bg-opacity-20 text-white rounded-md hover:bg-opacity-30 transition-all"
                      >
                        {room.minimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                    </div>

                    <div className="mt-3 pt-2 border-t border-blue-500 border-opacity-30 text-white text-sm flex flex-wrap gap-4">
                      <div className="flex items-center gap-1">
                        <Building size={14} className="text-blue-200" />
                        <span>Campus: {room.Building}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Home size={14} className="text-blue-200" />
                        <span>Floor: {room.Floor}</span>
                      </div>
                      {isAdmin && (
                        <button
                          className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded"
                          onClick={() => handleAddRoomType(room)}
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={`transition-all duration-300 ${room.minimized ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-screen opacity-100'}`}>
                    <div className="p-4 overflow-y-auto max-h-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded border border-gray-100">
                          <h4 className="text-sm font-medium text-gray-800 mb-2">Room Details</h4>
                          <div className="space-y-2 text-sm text-gray-600">
                            <p>Code: {room.Code}</p>
                            <p>Building: {room.Building}</p>
                            <p>Floor: {room.Floor}</p>
                            {isAdmin && <p>Capacity: {room.NumberOfSeats} seats</p>}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded border border-gray-100">
                          <h4 className="text-sm font-medium text-gray-800 mb-2">Room Types</h4>
                          <div className="flex flex-wrap gap-10">
                            {room.roomTypes && room.roomTypes.length > 0 ? (
                              room.roomTypes.map((type, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-1"
                                >
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-md border ${getRoomTypeColor(type.Type)}`}
                                  >
                                    {type.Type}
                                  </span>
                                  {isAdmin && (
                                    <button
                                      onClick={() => handleDeleteRoomType(room.id, type.id, type.Type)}
                                      className="p-0.5 text-red-600 hover:bg-red-50 rounded-full"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500">No room types assigned</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end items-center">
                    <div className="flex gap-2">
                      {isAdmin && (
                        <button className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded" onClick={() => handleEditClick(room.id)}>
                          <Edit size={16} />
                        </button>
                      )}
                      <button className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded" onClick={() => handleDeleteClick(room.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 text-center py-12 bg-white rounded shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No rooms found</h3>
                <p className="text-gray-500 mb-4">No rooms match your current search or filters.</p>
                <button onClick={() => {
                  setSearchTerm('');
                  setSelectedCampus('Select Campus');
                  setSelectedFloor('Select Floor');
                  setActiveTab('all');
                }}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 shadow-md"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredRooms.length > 0 && (
            <div className="mt-8 bg-white rounded shadow-md p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstRoom + 1} to {Math.min(indexOfLastRoom, filteredRooms.length)} of {filteredRooms.length} rooms
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)} disabled={currentPage === 1}
                    className={`p-2 rounded border border-gray-300 ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}
                    className={`p-2 rounded border border-gray-300 ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isAdmin ? (
        <AddRoomModal isOpen={isAddRoomModalOpen} onClose={() => setIsAddRoomModalOpen(false)} onAdd={() => {
          fetchRooms(selectedDepartment !== "Select Department" ? selectedDepartment : null);
          setIsAddRoomModalOpen(false);
        }}
        />
      ) : (
        <AddDeptRoomModal isOpen={isAddRoomModalOpen} onClose={() => setIsAddRoomModalOpen(false)} onSelect={() => {
          fetchRooms();
          setIsAddRoomModalOpen(false);
        }}
        />
      )}

      {isEditModalOpen && selectedRoom && (
        <EditRoomModal room={selectedRoom} onClose={() => setIsEditModalOpen(false)} onUpdate={() => {
          fetchRooms(selectedDepartment !== "Select Department" ? selectedDepartment : null);
          setIsEditModalOpen(false);
        }}
        />
      )}

      {isAdmin ? (
        <DeleteWarning isOpen={isDeleteWarningOpen} onClose={() => setIsDeleteWarningOpen(false)} onConfirm={handleConfirmDelete}
        />
      ) : (
        <DeleteDeptRoomWarning isOpen={isDeleteDeptRoomWarningOpen} onClose={() => setIsDeleteDeptRoomWarningOpen(false)} onConfirm={handleConfirmDelete}
        />
      )}

      {isAdmin && (
        <RoomTypesModal isOpen={isRoomTypesModalOpen} onClose={() => setIsRoomTypesModalOpen(false)}
        />
      )}

      {isAddTypeRoomModalOpen && selectedRoomForType && (
        <AddTypeRoomModal isOpen={isAddTypeRoomModalOpen} onClose={() => setIsAddTypeRoomModalOpen(false)} roomId={selectedRoomForType.id} currentRoomTypes={selectedRoomForType.roomTypes || []} onAdd={() => {
          fetchRooms(selectedDepartment !== "Select Department" ? selectedDepartment : null);
          setIsAddTypeRoomModalOpen(false);
        }}
        />
      )}

      {isDeleteTypeRoomWarningOpen && selectedTypeForDeletion && (
        <DeleteTypeRoomWarning isOpen={isDeleteTypeRoomWarningOpen} onClose={() => setIsDeleteTypeRoomWarningOpen(false)} onConfirm={confirmDeleteRoomType} roomTypeName={selectedTypeForDeletion.name}
        />
      )}
    </div>
  );
};

export default Room;