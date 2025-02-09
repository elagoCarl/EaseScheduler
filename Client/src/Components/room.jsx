import { useState, useEffect } from "react";
import axios from "axios"; // Import Axios
import Background from "./Img/bg.jpg";
import { useNavigate } from "react-router-dom";
import Menu from "./Img/menu.png";
import Sidebar from "./callComponents/sideBar.jsx";
import Door from "./Img/Vector4.png";
import addBtn from "./Img/addBtn.png";
import editBtn from "./Img/editBtn.png";
import delBtn from "./Img/delBtn.png";

const Room = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [checkboxes, setCheckboxes] = useState([]);
  const [isAllChecked, setAllChecked] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState("Select Campus");
  const [selectedFloor, setSelectedFloor] = useState("Select Floor");
  const [rooms, setRooms] = useState([]); // State for all room data
  const [filteredRooms, setFilteredRooms] = useState([]); // State for filtered room data
  const [availableFloors, setAvailableFloors] = useState([]); // Dynamic floors from the database

  const campuses = ["LV", "GP"]; // Campus options

  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleMasterCheckboxChange = () => {
    const newState = !isAllChecked;
    setAllChecked(newState);
    setCheckboxes(checkboxes.map(() => newState));
  };

  const handleCheckboxChange = (index) => {
    const updatedCheckboxes = [...checkboxes];
    updatedCheckboxes[index] = !updatedCheckboxes[index];
    setCheckboxes(updatedCheckboxes);
    setAllChecked(updatedCheckboxes.every((isChecked) => isChecked));
  };

  // Fetch Room Data from API
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get("http://localhost:8080/room/getAllRoom");
        if (response.data.successful) {
          const roomData = response.data.data;

          setRooms(roomData);
          setFilteredRooms(roomData); // Initially show all rooms
          setCheckboxes(Array(roomData.length).fill(false));

          // Extract unique floor values from room data
          const uniqueFloors = [...new Set(roomData.map((room) => room.Floor))];
          setAvailableFloors(uniqueFloors); // Set dynamic floors
        }
      } catch (error) {
        console.error("Error fetching rooms:", error.message);
      }
    };

    fetchRooms();
  }, []);

  // Filter Rooms by Campus and Floor
  useEffect(() => {
    let filtered = rooms;

    if (selectedCampus !== "Select Campus") {
      filtered = filtered.filter((room) => room.Building === selectedCampus);
    }

    if (selectedFloor !== "Select Floor") {
      filtered = filtered.filter((room) => room.Floor === selectedFloor);
    }

    setFilteredRooms(filtered);
    setCheckboxes(Array(filtered.length).fill(false)); // Reset checkboxes for filtered rooms
  }, [selectedCampus, selectedFloor, rooms]);

  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${Background})` }}
    >
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Top Menu */}
      <div className="absolute top-0 left-0 flex justify-between items-center px-4 py-2 w-full bg-opacity-70 md:px-8">
        <button
          id="logoBtn"
          className="text-lg md:text-3xl font-bold text-blue-500"
          onClick={() => navigate("/")}
        >
          EASE<span className="text-white">SCHEDULER</span>
        </button>
        <img
          src={Menu}
          className="w-15 h-15 md:w-40 md:h-40 hover:bg-customLightBlue2 cursor-pointer rounded"
          alt="menu button"
          onClick={toggleSidebar}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-col justify-center items-center h-screen w-full px-8">
        {/* Filters */}
        <div className="flex justify-end w-10/12 mb-4">
          <div className="flex gap-4">
            {/* Campus Dropdown */}
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

            {/* Floor Dropdown */}
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

        {/* Table Container */}
        <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center w-10/12 max-h-[70vh]">
          <div className="flex items-center bg-customBlue1 text-white px-4 md:px-10 py-4 rounded-t-lg w-full">
            <img src={Door} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="Room img" />
            <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">
              Room
            </h2>
          </div>

          {/* Scrollable Table */}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Vertical Buttons Container */}
      <div className="fixed top-1/4 right-4 border border-gray-900 bg-white rounded p-4 flex flex-col gap-4">
        <button className="py-2 px-4 text-white rounded ">
          <img src={addBtn} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="addBtn img" />
        </button>
        <button className="py-2 px-4 text-white rounded ">
          <img src={editBtn} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="addBtn img" />
        </button>
        <button className="py-2 px-4 text-white rounded ">
          <img src={delBtn} className="w-12 h-12 md:w-25 md:h-25 hover:scale-110" alt="addBtn img" />
        </button>
      </div>
    </div>
  );
};

export default Room;
