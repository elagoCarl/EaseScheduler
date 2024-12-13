import React, { useState } from 'react';
import Image3 from './Img/3.jpg';
import TopMenu from "./callComponents/topMenu.jsx";
import Sidebar from './callComponents/sideBar.jsx';

const ProfAvailability = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    day: "",
    professor: "",
    timeIn: "",
    timeOut: "",
  });

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const resetForm = () => {
    setFormData({ professor: "", day: "", timeIn: "", timeOut: "" });
  };

  const handleAdd = () => {
    console.log("Added:", formData);
    resetForm();
  };
  return (
    <div
      className="main bg-cover bg-no-repeat min-h-screen flex justify-center items-center xs:h-full"
      style={{ backgroundImage: `url(${Image3})` }}
    >
      <div className='fixed top-0 h-full z-50'>
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      </div>

      <TopMenu toggleSidebar={toggleSidebar} />

      <div className="flex flex-col items-center text-center w-full">
        <h1 className=" font-bold text-white text-xl md:text-3xl mt-45 mb-10 text-center">Professor Availability</h1>

        {/* Main container with left and right sections */}
        <div className="flex flex-wrap md:flex-nowrap gap-5 w-full max-w-6xl justify-center items-start px-5 xs:px-15 mt-10">

          {/* Left Container (Form Section) */}
          <div
            id="leftContainer"
            className="bg-customWhite mr-8 text-gray-900 p-10 rounded-lg shadow-lg w-full max-w-md md:w-3/12"
          >
            <div className="mb-4">
              <label htmlFor="professor" className="block text-md font-medium mb-1 text-start ml-2">
                Professor:
              </label>
              <select
                id="professor"
                name="professor"
                value={formData.professor}
                onChange={handleInputChange}
                className="w-full p-5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Professor</option>
                <option value="Prof. A">Prof. A</option>
                <option value="Prof. B">Prof. B</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="day" className="block text-md font-medium mb-1 text-start ml-2">
                Day:
              </label>
              <select
                id="day"
                name="day"
                value={formData.day}
                onChange={handleInputChange}
                className="w-full p-5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Day</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="timeIn" className="block text-md font-medium mb-1 text-start ml-2">
                Time in:
              </label>
              <select
                id="timeIn"
                name="timeIn"
                value={formData.timeIn}
                onChange={handleInputChange}
                className="w-full p-5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Time</option>
                {Array.from({ length: 15 }, (_, i) => 7 + i).map((hour) => (
                  <option key={hour} value={`${hour}:00`}>
                    {hour}:00
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="timeOut" className="block text-md font-medium mb-1 text-start ml-2">
                Time out:
              </label>
              <select
                id="timeOut"
                name="timeOut"
                value={formData.timeOut}
                onChange={handleInputChange}
                className="w-full p-5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Time</option>
                {Array.from({ length: 15 }, (_, i) => 8 + i).map((hour) => (
                  <option key={hour} value={`${hour}:00`}>
                    {hour}:00
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-5 mt-5">
              <button
                onClick={resetForm}
                className="bg-red-500 text-white px-8 py-5 rounded-lg hover:bg-red-600"
              >
                Reset
              </button>
              <button
                onClick={handleAdd}
                className="bg-blue-500 text-white px-12 py-5 rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Right Container (Timetable Section) */}
          <div className="bg-white w-full md:w-2/3 p-5 rounded-lg shadow-lg overflow-x-auto md:-mt-8 mt-5">
            <table className="table-auto w-full text-left border-collapse border border-customWhite">
              <thead>
                <tr className="bg-gray-100 text-center">
                  <th className="p-3 border border-gray-300 bg-customLightBlue2">Time</th>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                    <th key={day} className="p-3 border border-gray-300 bg-customLightBlue2">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 15 }, (_, i) => 7 + i).map((hour) => (
                  <tr key={hour}>
                    <td className="p-3 border border-gray-300 text-center">{hour}:00</td>
                    {Array(6).fill("").map((_, index) => (
                      <td key={index} className="p-3 border border-gray-300"></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfAvailability;
