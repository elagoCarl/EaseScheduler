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
import RoomTypesModal from "./callComponents/roomTypesModal.jsx";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRoomTypesModalOpen, setIsRoomTypesModalOpen] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const { user } = useAuth();
  const campuses = ["LV", "GP"];
  const isAdmin = user && user.DepartmentId === null;

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/dept/getAllDept');
      if (response.data.successful) setDepartments(response.data.data);
    } catch (error) {
      setError("Error fetching departments: " + error.message);
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
        // Handle case where no department is selected yet for non-admin users
        setRooms([]);
        setFilteredRooms([]);
        setAvailableFloors([]);
        setLoading(false);
        setDataFetched(true); // Mark as fetched even if empty
        return;
      }

      if (response?.data.successful) {
        const roomData = response.data.data || [];
        setRooms(roomData);

        // Apply filters if they are selected
        let filtered = roomData;
        if (selectedCampus !== "Select Campus") {
          filtered = filtered.filter(room => room.Building === selectedCampus);
        }
        if (selectedFloor !== "Select Floor") {
          filtered = filtered.filter(room => room.Floor === selectedFloor);
        }

        setFilteredRooms(filtered);
        setCheckboxes(Array(filtered.length).fill(false));
        setAvailableFloors([...new Set(roomData.map((room) => room.Floor))]);
      } else {
        setRooms([]);
        setFilteredRooms([]);
        setAvailableFloors([]);
      }
      setDataFetched(true); // Mark data as fetched regardless of result
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message === "No rooms found") {
        setRooms([]);
        setFilteredRooms([]);
        setAvailableFloors([]);
        setDataFetched(true); // Mark as fetched even if error
      } else {
        setError("Error fetching rooms: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (roomId) => {
    try {
      const response = await axios.get(`/room/getRoom/${roomId}`);
      if (response.data.data) {
        setSelectedRoom(response.data.data);
        setIsEditModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching room details:', error);
    }
  };

  const handleDeleteClick = () => {
    const selectedRooms = filteredRooms.filter((_, index) => checkboxes[index]);

    if (selectedRooms.length === 0) {
      isAdmin
        ? setWarningMessage("Please select at least one room to DELETE.")
        : setWarningMessage("Please select at least one room to remove from your Department!");
      return;
    }

    isAdmin ? setIsDeleteWarningOpen(true) : setIsDeleteDeptRoomWarningOpen(true);
  };

  const handleConfirmDelete = async () => {
    const selectedRooms = filteredRooms.filter((_, index) => checkboxes[index]);
    if (!selectedRooms.length) return;

    try {
      for (const room of selectedRooms) {
        if (isAdmin) {
          await axios.delete(`/room/deleteRoom/${room.id}`);
        } else {
          await axios.delete('/room/deleteDeptRoom', {
            data: { roomId: room.id, deptId: user.DepartmentId }
          });
        }
      }

      // After successful deletion, refresh the rooms data
      fetchRooms();
      setAllChecked(false);
      setIsDeleteWarningOpen(false);
      setIsDeleteDeptRoomWarningOpen(false);
    } catch (error) {
      console.error("Error deleting rooms:", error.message);
      setError("Error deleting rooms: " + error.message);
    }
  };

  // Initial data fetch when component mounts
  useEffect(() => {
    const initData = async () => {
      if (isAdmin) await fetchDepartments();
      await fetchRooms();
    };

    initData();
  }, [isAdmin]);

  // Effect to update filtered rooms when filters or rooms change
  useEffect(() => {
    if (!dataFetched) return; // Skip if data hasn't been fetched yet

    let filtered = rooms;
    if (selectedCampus !== "Select Campus") {
      filtered = filtered.filter(room => room.Building === selectedCampus);
    }
    if (selectedFloor !== "Select Floor") {
      filtered = filtered.filter(room => room.Floor === selectedFloor);
    }

    setFilteredRooms(filtered);
    setCheckboxes(Array(filtered.length).fill(false));
    setAllChecked(false);
  }, [selectedCampus, selectedFloor, rooms, dataFetched]);

  // Auto-hide warning message after 3 seconds
  useEffect(() => {
    let timeout;
    if (warningMessage) {
      timeout = setTimeout(() => {
        setWarningMessage("");
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [warningMessage]);

  // Handle department change
  const handleDepartmentChange = (e) => {
    const value = e.target.value;
    setSelectedDepartment(value);
    fetchRooms(value);
  };

  if (loading && !dataFetched) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div className="bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${Background})` }}>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
      <TopMenu toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-col justify-center items-center h-screen w-full px-8">
        <div className="flex justify-end w-10/12 mb-4">
          <div className="flex gap-4 items-center">
            {/* Room Types button */}
            {isAdmin && (
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm md:text-base transition duration-200"
                onClick={() => setIsRoomTypesModalOpen(true)}
              >
                Room Types
              </button>
            )}

            {/* Department selector for admins */}
            {isAdmin && (
              <select
                value={selectedDepartment}
                onChange={handleDepartmentChange}
                className="px-4 py-2 border rounded text-sm md:text-base"
              >
                <option value="Select Department">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.Name}</option>
                ))}
              </select>
            )}

            {/* Campus selector */}
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="px-4 py-2 border rounded text-sm md:text-base"
            >
              <option>Select Campus</option>
              {campuses.map((campus, index) => (
                <option key={index} value={campus}>{campus}</option>
              ))}
            </select>

            {/* Floor selector */}
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="px-4 py-2 border rounded text-sm md:text-base"
            >
              <option>Select Floor</option>
              {availableFloors.map((floor, index) => (
                <option key={index} value={floor}>{floor}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center w-10/12 max-h-[70vh]">
          <div className="flex items-center bg-blue-500 text-white px-4 md:px-10 py-4 rounded-t-lg w-full">
            <img src={Door} className="w-12 h-12 md:w-25 md:h-25" alt="Room img" />
            <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">Room</h2>
          </div>

          {warningMessage && (
            <div className="sticky text-center mb-5 w-full mt-5 font-medium bg-red-600 text-white px-4 py-5 rounded shadow-md">
              {warningMessage}
            </div>
          )}

          <div className="overflow-auto w-full h-full flex-grow mt-3">
            <table className="text-center w-full border-collapse">
              <thead>
                <tr className="bg-blue-500">
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border font-medium border-gray-300">Campus</th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border font-medium border-gray-300">Room Code</th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border font-medium border-gray-300">Floor</th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border font-medium border-gray-300">Room Type</th>
                  {isAdmin && (
                    <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border font-medium border-gray-300">Seats</th>
                  )}
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border border-gray-300">
                    <input
                      type="checkbox"
                      checked={isAllChecked && filteredRooms.length > 0}
                      onChange={() => {
                        const newState = !isAllChecked;
                        setAllChecked(newState);
                        setCheckboxes(Array(filteredRooms.length).fill(newState));
                      }}
                      disabled={filteredRooms.length === 0}
                    />
                  </th>
                  {isAdmin && (<th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-white border border-gray-300"></th>)}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? "7" : "5"} className="px-6 py-8 text-center">
                      <div className="flex justify-center">
                        <LoadingSpinner />
                      </div>
                    </td>
                  </tr>
                ) : filteredRooms.length > 0 ? (
                  filteredRooms.map((room, index) => (
                    <tr key={room.id || room.Code} className="hover:bg-customLightBlue2 border-t border-gray-300">
                      <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{room.Building}</td>
                      <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{room.Code}</td>
                      <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{room.Floor}</td>
                      <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                        {room.RoomType ? room.RoomType.Type : "N/A"}
                      </td>
                      {isAdmin && (<td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">{room.NumberOfSeats}</td>)}
                      <td className="py-2 border border-gray-300">
                        <input
                          type="checkbox"
                          checked={checkboxes[index]}
                          onChange={() => {
                            const updatedCheckboxes = [...checkboxes];
                            updatedCheckboxes[index] = !updatedCheckboxes[index];
                            setCheckboxes(updatedCheckboxes);
                            setAllChecked(updatedCheckboxes.every((isChecked) => isChecked) && updatedCheckboxes.length > 0);
                          }}
                        />
                      </td>
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
                    <td colSpan={isAdmin ? "7" : "5"} className="px-6 py-8 text-center text-gray-600 border border-gray-300">
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
        <button className="py-2 px-4 text-white rounded" onClick={() => setIsAddRoomModalOpen(true)}>
          <img src={addBtn} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Add Room" />
        </button>
        <button
          className="py-2 px-4 text-white rounded"
          onClick={handleDeleteClick}
        >
          <img
            src={delBtn}
            className="w-12 h-12 md:w-25 md:h-25 hover:scale-110"
            alt="Delete Room"
          />
        </button>
      </div>

      {/* Modals */}
      {isAdmin ? (
        <AddRoomModal
          isOpen={isAddRoomModalOpen}
          onClose={() => setIsAddRoomModalOpen(false)}
          onAdd={(newRoom) => {
            // After adding a room, refresh the room data to ensure consistency
            fetchRooms(selectedDepartment !== "Select Department" ? selectedDepartment : null);
            setIsAddRoomModalOpen(false);
          }}
        />
      ) : (
        <AddDeptRoomModal
          isOpen={isAddRoomModalOpen}
          onClose={() => setIsAddRoomModalOpen(false)}
          onSelect={(newRoom) => {
            // After adding a department room, refresh the room data
            fetchRooms();
            setIsAddRoomModalOpen(false);
          }}
        />
      )}

      {isEditModalOpen && selectedRoom && (
        <EditRoomModal
          room={selectedRoom}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={(updatedRoom) => {
            // After updating a room, refresh the room data
            fetchRooms(selectedDepartment !== "Select Department" ? selectedDepartment : null);
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isAdmin ? (
        <DeleteWarning
          isOpen={isDeleteWarningOpen}
          onClose={() => setIsDeleteWarningOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      ) : (
        <DeleteDeptRoomWarning
          isOpen={isDeleteDeptRoomWarningOpen}
          onClose={() => setIsDeleteDeptRoomWarningOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Room Types Modal */}
      {isAdmin && (
        <RoomTypesModal
          isOpen={isRoomTypesModalOpen}
          onClose={() => setIsRoomTypesModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Room;