import { useState, useEffect } from "react";
import axios from "axios";
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
import EditRoomModal from "./callComponents/editRoomModal.jsx";
import DelCourseWarn from "./callComponents/deleteWarning.jsx";

const Room = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [checkboxes, setCheckboxes] = useState([]);
  const [isAllChecked, setAllChecked] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState("Select Campus");
  const [selectedFloor, setSelectedFloor] = useState("Select Floor");
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [availableFloors, setAvailableFloors] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const [isDeleteBtnDisabled, setDeleteBtnDisabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const campuses = ["LV", "GP"];

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8080/room/getAllRoom");
      if (response.data.successful) {
        const roomData = response.data.data;
        setRooms(roomData);
        setFilteredRooms(roomData);
        setCheckboxes(Array(roomData.length).fill(false));
        const uniqueFloors = [...new Set(roomData.map((room) => room.Floor))];
        setAvailableFloors(uniqueFloors);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error.message);
      setError("Error fetching rooms: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (roomId) => {
    try {
      const response = await axios.get(`http://localhost:8080/room/getRoom/${roomId}`);
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
    fetchRooms(); // Refresh the room list
  };

  const handleConfirmDelete = async () => {
    const idsToDelete = rooms
      .filter((_, index) => checkboxes[index])
      .map((room) => room.id);

    if (idsToDelete.length === 0) {
      console.error("No rooms selected for deletion.");
      return;
    }

    try {
      for (const id of idsToDelete) {
        await axios.delete(`http://localhost:8080/room/deleteRoom/${id}`);
      }

      setRooms((prev) => prev.filter((room) => !idsToDelete.includes(room.id)));
      setCheckboxes(new Array(rooms.length).fill(false));
      setAllChecked(false);
      setDeleteBtnDisabled(true);
      setIsDeleteWarningOpen(false);
      fetchRooms(); // Refresh the room list
    } catch (error) {
      console.error("Error deleting rooms:", error.message);
    }
  };

  useEffect(() => {
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
    fetchRooms(); // Refresh the room list after adding
  };

  const handleDeleteClick = () => {
    setIsDeleteWarningOpen(true);
  };

  const handleCloseDelWarning = () => {
    setIsDeleteWarningOpen(false);
  };

  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${Background})` }}
    >
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <TopMenu toggleSidebar={toggleSidebar} />

      <div className="flex flex-col justify-center items-center h-screen w-full px-8">
        <div className="flex justify-end w-10/12 mb-4">
          <div className="flex gap-4">
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
          <div className="flex items-center bg-customBlue1 text-white px-4 md:px-10 py-4 rounded-t-lg w-full">
            <img src={Door} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Room img" />
            <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">
              Room
            </h2>
          </div>

          <div className="overflow-auto w-full h-full flex-grow">
            <table className="text-center w-full border-collapse">
              <thead>
                <tr className="bg-customLightBlue2">
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                    Campus
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                    Room Code
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                    Room Type
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                    <input
                      type="checkbox"
                      checked={isAllChecked}
                      onChange={handleMasterCheckboxChange}
                    />
                  </th>
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room, index) => (
                  <tr
                    key={room.Code}
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
                    <td className="py-2 border border-gray-300">
                      <button className="text-white rounded" onClick={() => handleEditClick(room.id)}>
                        <img src={editBtn} className="w-9 h-9 md:w-15 md:h-15 hover:scale-110" alt="Edit Room" />
                      </button>
                    </td>
                  </tr>
                ))}
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

      <AddRoomModal isOpen={isAddRoomModalOpen} onClose={handleAddRoomCloseModal} />
      {isEditModalOpen && selectedRoom && (
        <EditRoomModal
          room={selectedRoom}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleUpdateRoom}
        />
      )}
      <DelCourseWarn
        isOpen={isDeleteWarningOpen}
        onClose={handleCloseDelWarning}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default Room;