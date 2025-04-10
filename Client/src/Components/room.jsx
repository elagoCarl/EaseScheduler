import { useState, useEffect } from "react";
import axios from "../axiosConfig.js";
import Background from "./Img/bg.jpg";
import Sidebar from "./callComponents/sideBar.jsx";
import TopMenu from "./callComponents/topMenu.jsx";
import Door from "./Img/Vector4.png";
import addBtn from "./Img/addBtn.png";
import editBtn from "./Img/editBtn.png";
import delBtn from "./Img/delBtn.png";
import LoadingSpinner from './callComponents/loadingSpinner.jsx';
import ErrorDisplay from './callComponents/errDisplay.jsx';
import AddRoomModal from "./callComponents/addRoomModal.jsx";
import AddDeptRoomModal from "./callComponents/addDeptRoomModal.jsx";
import EditRoomModal from "./callComponents/editRoomModal.jsx";
import DeleteWarning from "./callComponents/deleteWarning.jsx";
import DeleteDeptRoomWarning from "./callComponents/deleteDeptRoomWarning.jsx";
import { useAuth } from '../Components/authContext.jsx';

const Room = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [checkboxes, setCheckboxes] = useState([]);
  const [isAllChecked, setAllChecked] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState("Select Campus");
  const [selectedFloor, setSelectedFloor] = useState("Select Floor");
  const [selectedDepartment, setSelectedDepartment] = useState("Select Department");
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [availableFloors, setAvailableFloors] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const [isDeleteDeptRoomWarningOpen, setIsDeleteDeptRoomWarningOpen] = useState(false);
  const [isDeleteBtnDisabled, setDeleteBtnDisabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const campuses = ["LV", "GP"];

  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/dept/getAllDept');
      if (response.data.successful) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching departments:", error.message);
      setError("Error fetching departments: " + error.message);
    }
  };

  const fetchRooms = async (deptId) => {
    try {
      setLoading(true);
      const departmentId = deptId || (user.DepartmentId || (selectedDepartment !== "Select Department" ? selectedDepartment : null));

      if (!departmentId) {
        setRooms([]);
        setFilteredRooms([]);
        setLoading(false);
        return;
      }

      const response = await axios.get(`/room/getRoomsByDept/${ departmentId }`);
      if (response.data.successful) {
        const roomData = response.data.data;
        setRooms(roomData);
        setFilteredRooms(roomData);
        setCheckboxes(Array(roomData.length).fill(false));
        const uniqueFloors = [...new Set(roomData.map((room) => room.Floor))];
        setAvailableFloors(uniqueFloors);
      } else {
        // Clear rooms when none found
        setRooms([]);
        setFilteredRooms([]);
        setAvailableFloors([]);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error.message);
      // Handle both network errors and the "no rooms found" response
      if (error.response && error.response.status === 400 && error.response.data.message === "No rooms found") {
        setRooms([]);
        setFilteredRooms([]);
        setAvailableFloors([]);
      } else {
        setError("Error fetching rooms: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (roomId) => {
    try {
      const response = await axios.get(`/room/getRoom/${ roomId }`);
      const roomData = response.data.data;

      if (roomData) {
        setSelectedRoom(roomData);
        setIsEditModalOpen(true);
      } else {
        console.error("Invalid room data:", roomData);
      }
    } catch (error) {
      console.error('Error fetching room details:', error);
    }
  };

  const handleUpdateRoom = (updatedRoom) => {
    setRooms((prev) =>
      prev.map((room) => (room.id === updatedRoom.id ? updatedRoom : room))
    );
    setIsEditModalOpen(false);
    // No need to call fetchRooms() as we're updating the state directly
  };

  // New function to handle added room
  const handleAddedRoom = (newRoom) => {
    // Add the new room to the rooms state
    setRooms(prevRooms => [...prevRooms, newRoom]);

    // Update available floors if necessary
    if (!availableFloors.includes(newRoom.Floor)) {
      setAvailableFloors(prevFloors => [...prevFloors, newRoom.Floor]);
    }

    // Close the modal
    setIsAddRoomModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    const selectedRooms = rooms.filter((_, index) => checkboxes[index]);

    if (selectedRooms.length === 0) {
      console.error("No rooms selected for deletion.");
      return;
    }

    try {
      if (user && user.DepartmentId === null) {
        // Admin delete - completely remove rooms
        for (const room of selectedRooms) {
          await axios.delete(`/room/deleteRoom/${ room.id }`);
        }
      } else {
        // Department user - remove association only
        for (const room of selectedRooms) {
          await axios.delete('/room/deleteDeptRoom', {
            data: {
              roomId: room.id,
              deptId: user.DepartmentId
            }
          });
        }
      }

      // Update rooms state by removing the deleted rooms
      const idsToDelete = selectedRooms.map(room => room.id);
      setRooms(prev => prev.filter(room => !idsToDelete.includes(room.id)));
      setFilteredRooms(prev => prev.filter(room => !idsToDelete.includes(room.id)));

      // Reset checkboxes and related states
      setCheckboxes(Array(rooms.length - idsToDelete.length).fill(false));
      setAllChecked(false);
      setDeleteBtnDisabled(true);

      // Close warning modals
      setIsDeleteWarningOpen(false);
      setIsDeleteDeptRoomWarningOpen(false);
    } catch (error) {
      console.error("Error deleting rooms:", error.message);
    }
  };

  // Handle department selection change
  const handleDepartmentChange = (e) => {
    const deptId = e.target.value;
    setSelectedDepartment(deptId);
    fetchRooms(deptId);
  };

  useEffect(() => {
    // Only fetch departments if user has no department assigned
    if (user && user.DepartmentId === null) {
      fetchDepartments();
    }

    // Fetch rooms based on department
    fetchRooms();
  }, []);

  useEffect(() => {
    let filtered = rooms;

    if (selectedCampus !== "Select Campus") {
      filtered = filtered.filter((room) => room.Building === selectedCampus);
    }

    if (selectedFloor !== "Select Floor") {
      filtered = filtered.filter((room) => room.Floor === selectedFloor);
    }

    setFilteredRooms(filtered);
    setCheckboxes(Array(filtered.length).fill(false));
  }, [selectedCampus, selectedFloor, rooms]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleMasterCheckboxChange = () => {
    const newState = !isAllChecked;
    setAllChecked(newState);
    setCheckboxes(checkboxes.map(() => newState));
    setDeleteBtnDisabled(!newState);
  };

  const handleCheckboxChange = (index) => {
    const updatedCheckboxes = [...checkboxes];
    updatedCheckboxes[index] = !updatedCheckboxes[index];
    setCheckboxes(updatedCheckboxes);
    setAllChecked(updatedCheckboxes.every((isChecked) => isChecked));

    const anyChecked = updatedCheckboxes.some((isChecked) => isChecked);
    setDeleteBtnDisabled(!anyChecked);
  };

  const handleAddRoomClick = () => {
    setIsAddRoomModalOpen(true);
  };

  const handleAddRoomCloseModal = () => {
    setIsAddRoomModalOpen(false);
  };

  const handleDeleteClick = () => {
    if (user && user.DepartmentId === null) {
      setIsDeleteWarningOpen(true);
    } else {
      setIsDeleteDeptRoomWarningOpen(true);
    }
  };

  const handleCloseDelWarning = () => {
    setIsDeleteWarningOpen(false);
  };

  const handleCloseDeptDelWarning = () => {
    setIsDeleteDeptRoomWarningOpen(false);
  };

  // Determine if edit button column should be shown
  const isAdmin = user && user.DepartmentId === null;

  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${ Background })` }}
    >
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <TopMenu toggleSidebar={toggleSidebar} />

      <div className="flex flex-col justify-center items-center h-screen w-full px-8">
        <div className="flex justify-end w-10/12 mb-4">
          <div className="flex gap-4">
            {/* Department dropdown - only visible if user doesn't have a department */}
            {isAdmin && (
              <select
                value={selectedDepartment}
                onChange={handleDepartmentChange}
                className="px-4 py-2 border rounded text-sm md:text-base"
              >
                <option value="Select Department">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.Name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="px-4 py-2 border rounded text-sm md:text-base"
            >
              <option>Select Campus</option>
              {campuses.map((campus, index) => (
                <option key={index} value={campus}>
                  {campus}
                </option>
              ))}
            </select>

            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="px-4 py-2 border rounded text-sm md:text-base"
            >
              <option>Select Floor</option>
              {availableFloors.map((floor, index) => (
                <option key={index} value={floor}>
                  {floor}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center w-10/12 max-h-[70vh]">
          <div className="flex items-center bg-blue-500 text-white px-4 md:px-10 py-4 rounded-t-lg w-full">
            <img src={Door} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Room img" />
            <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">
              Room
            </h2>
          </div>

          <div className="overflow-auto w-full h-full flex-grow mt-3">
            <table className="text-center w-full border-collapse">
              <thead>
                <tr className="bg-blue-500">
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border font-medium border-gray-300">
                    Campus
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border font-medium border-gray-300">
                    Room Code
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border font-medium border-gray-300">
                    Room Type
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border border-gray-300">
                    <input
                      type="checkbox"
                      checked={isAllChecked}
                      onChange={handleMasterCheckboxChange}
                    />
                  </th>
                  {/* Only show edit column header for admin users */}
                  {isAdmin && (
                    <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRooms.length > 0 ? (
                  filteredRooms.map((room, index) => (
                    <tr
                      key={room.id || room.Code}
                      className="hover:bg-customLightBlue2 border-t border-gray-300"
                    >
                      <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                        {room.Building}
                      </td>
                      <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                        {room.Code}
                      </td>
                      <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                        {room.Type}
                      </td>
                      <td className="py-2 border border-gray-300">
                        <input
                          type="checkbox"
                          checked={checkboxes[index]}
                          onChange={() => handleCheckboxChange(index)}
                        />
                      </td>
                      {/* Only show edit button cell for admin users */}
                      {isAdmin && (
                        <td className="py-2 border border-gray-300">
                          <button className="text-white rounded" onClick={() => handleEditClick(room.id)}>
                            <img src={editBtn} className="w-9 h-9 md:w-15 md:h-15 hover:scale-110" alt="Edit Room" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? "5" : "4"} className="px-6 py-8 text-center text-gray-600 border border-gray-300">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p className="text-lg font-medium">No rooms found</p>
                        <p className="text-sm text-gray-500 mt-1">Try selecting a different department, campus, or floor</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="fixed top-1/4 right-4 border border-gray-900 bg-white rounded p-4 flex flex-col gap-4">
        <button className="py-2 px-4 text-white rounded" onClick={handleAddRoomClick}>
          <img src={addBtn} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Add Room" />
        </button>
        <button
          className="py-2 px-4 text-white rounded"
          onClick={handleDeleteClick}
          disabled={isDeleteBtnDisabled}
        >
          <img src={delBtn} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Delete Room" />
        </button>
      </div>

      {isAdmin ? (
        <AddRoomModal isOpen={isAddRoomModalOpen} onClose={handleAddRoomCloseModal} />
      ) : (
        <AddDeptRoomModal
          isOpen={isAddRoomModalOpen}
          onClose={handleAddRoomCloseModal}
          onSelect={handleAddedRoom}
        />
      )}

      {isEditModalOpen && selectedRoom && (
        <EditRoomModal
          room={selectedRoom}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleUpdateRoom}
        />
      )}

      {isAdmin ? (
        <DeleteWarning
          isOpen={isDeleteWarningOpen}
          onClose={handleCloseDelWarning}
          onConfirm={handleConfirmDelete}
        />
      ) : (
        <DeleteDeptRoomWarning
          isOpen={isDeleteDeptRoomWarningOpen}
          onClose={handleCloseDeptDelWarning}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

export default Room;