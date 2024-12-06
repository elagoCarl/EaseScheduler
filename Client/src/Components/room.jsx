import React, { useState } from "react";
import Background from "./Img/4.jpg";
import { useNavigate } from "react-router-dom";
import Menu from "./Img/menu.png";
import Sidebar from "./sideBar.jsx";
import Door from "./Img/Vector4.png";
import AddBtn from "./Img/addBtn.png";
import EditBtn from "./Img/editBtn.png";
import DelBtn from "./Img/delBtn.png";

const Room = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [checkboxes, setCheckboxes] = useState(
    Array(100).fill(false) // Example for multiple rows
  );
  const [isAllChecked, setAllChecked] = useState(false);

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
    <div
      id="bgImg"
      className="bg-no-repeat bg-fixed bg-cover bg-center min-h-screen"
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
      <div className="flex flex-col md:flex-row justify-center items-start gap-4 md:gap-8 w-full px-4 md:px-8">
        {/* Table Container */}
        <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center w-full md:w-2/3">
          <div className="flex items-center bg-customBlue1 text-white px-4 md:px-10 py-4 rounded-t-lg w-full">
            <img src={Door} className="w-8 h-8 md:w-12 md:h-12" alt="Room img" />
            <h2 className="text-sm md:text-lg font-semibold flex-grow text-center">
              Room
            </h2>
          </div>

          {/* Scrollable Table */}
          <div className="overflow-y-auto max-h-[500px] w-full h-full">
            <table className="text-center w-full">
              <thead>
                <tr className="bg-customLightBlue2">
                  <th className="whitespace-nowrap px-4 md:px-6 py-2 text-xs md:text-sm text-gray-600 border border-gray-300">
                    Code
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

        {/* Responsive Sidebar for Buttons */}
        <div
          className="bg-white p-4 rounded-lg shadow-lg flex flex-row sm:flex-col justify-start items-center gap-2 sm:gap-0 sm:space-y-2 sm:w-auto"
          style={{ height: "fit-content" }}
        >
          <div className="relative group">
            <button className="w-17 h-17 md:w-25 md:h-25 xl:w-35 xl:h-35 hover:bg-customLightBlue2 m-2 p-2 rounded">
              <img src={AddBtn} alt="AddBtn" />
            </button>
            <span className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2">
              Add
            </span>
          </div>
          <div className="relative group">
            <button className="w-17 h-17 md:w-25 md:h-25 xl:w-35 xl:h-35 hover:bg-customLightBlue2 m-2 p-2 rounded">
              <img src={EditBtn} alt="EditBtn" />
            </button>
            <span className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2">
              Edit
            </span>
          </div>
          <div className="relative group">
            <button className="w-17 h-17 md:w-25 md:h-25 xl:w-35 xl:h-35 hover:bg-customLightBlue2 m-2 p-2 rounded">
              <img src={DelBtn} alt="DelBtn" />
            </button>
            <span className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2">
              Delete
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
