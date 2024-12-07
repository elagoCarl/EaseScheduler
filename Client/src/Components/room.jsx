import React, { useState } from "react";
import Background from "./Img/4.jpg";
import { useNavigate } from "react-router-dom";
import Menu from "./Img/menu.png";
import Sidebar from "./sideBar.jsx";
import Door from "./Img/Vector4.png";
import addBtn from "./Img/addBtn.png";
import editBtn from "./Img/editBtn.png";
import delBtn from "./Img/delBtn.png";

const Room = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [checkboxes, setCheckboxes] = useState(Array(50).fill(false)); // Example for multiple rows
  const [isAllChecked, setAllChecked] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState("Select Campus");
  const [selectedFloor, setSelectedFloor] = useState("Select Floor");

  const campuses = ["Campus A", "Campus B", "Campus C"];
  const floors = ["1st Floor", "2nd Floor", "3rd Floor"];

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

  return (
    <body
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
              <option disabled>Select Campus</option>
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
              <option disabled>Select Floor</option>
              {floors.map((floor, index) => (
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
                {checkboxes.map((isChecked, index) => (
                  <tr
                    key={index}
                    className="hover:bg-customLightBlue2 border-t border-gray-300"
                  >
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                      {selectedCampus}
                    </td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                      TEST
                    </td>
                    <td className="px-4 md:px-6 py-2 border border-gray-300 text-xs md:text-sm">
                      TEST
                    </td>
                    <td className="py-2 border border-gray-300">
                      <input
                        type="checkbox"
                        checked={isChecked}
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
    </body>
  );
};

export default Room;
