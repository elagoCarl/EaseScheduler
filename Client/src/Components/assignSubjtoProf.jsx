import React, { useState } from 'react';
import TopMenu from './callComponents/topMenu';
import Sidebar from './callComponents/sideBar.jsx';
import Image2 from './Img/2.jpg';
import AddBulk from './Img/AddBulk.png';

const AssignSubjToProf = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [subjects, setSubjects] = useState([""]); // State to manage dynamically added subjects

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleAddBulk = (e) => {
    e.preventDefault(); // Prevent default form submission
    setSubjects([...subjects, ""]); // Add a new subject dropdown
  };

  return (
    <div
      className="main bg-cover bg-no-repeat min-h-screen flex justify-center items-center"
      style={{ backgroundImage: `url(${Image2})` }}
    >
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      {<TopMenu toggleSidebar={toggleSidebar} />}

      {/* Main Form Container */}
      <div className="relative bg-customBlue1 p-24 rounded-lg shadow-lg w-full lg:max-w-lg xs:max-w-md xs:max-h-md">
        <button
          className="absolute w-20 top-3 right-10 text-white font-bold text-2xl hover:text-red-500"
          onClick={() => navigate('/')}
        >
          &times;
        </button>

        {/* Title of container */}
        <h1 className="text-2xl font-bold text-white text-center">Assign Subject</h1>

        <form className="mt-6">
          {/* Professor Selection */}
          <div className="mb-6 pl-20 pr-20">
            <label className="block font-semibold text-white mb-2" htmlFor="role">
              Professor:
            </label>
            <select
              id="role"
              className="border rounded w-full py-7 px-6 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="" disabled selected>
                -- Select Professor --
              </option>
              <option value="Professor">Anton Burgovanni</option>
              <option value="Professor">Marc Dela Casa</option>
              <option value="Professor">Aya Marina Sam</option>
              <option value="Professor">Zharinna Canete</option>
              <option value="Professor">Sun Hyee Suk</option>
              <option value="Professor">Vhong Magiba Lucero</option>
            </select>
          </div>

          {/* Units */}
          <div className="mb-6 pl-20 pr-20">
            <label className="block font-semibold text-white mb-2" htmlFor="fullName">
              Units:
            </label>
            <input
              className="border rounded w-full py-7 px-12 leading-tight font-semibold bg-white"
              id="fullName"
              type="text"
              placeholder="(Auto-Generated)"
              disabled
            />
          </div>

          {subjects.map((_, index) => (
            <div key={index} className="mb-10 space-x-5 pl-20 pr-20">
              <label className="block font-semibold ml-6 text-white mb-2" htmlFor={`subject-${index}`}>
                Subject:
              </label>
              <div className='flex'>
                <select
                  id={`subject-${index}`}
                  className="border rounded w-full py-7 px-6 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="" disabled selected>
                    -- Select Subject --
                  </option>
                  <option value="Subject">PCR001L</option>
                  <option value="Subject">PCIE002L</option>
                </select>

                {index === subjects.length - 1 && (
                  <div className="mb-6 pl-5">
                    <button onClick={handleAddBulk} className="relative">
                      <img
                        src={AddBulk}
                        alt="Add Bulk"
                        className="h-28 w-40 top-5 left-3 relative z-50 cursor-pointer"
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-end mt-12 space-x-8">
            <button
              className="bg-customLightBlue2 hover:bg-blue-300 text-gray-600 font-bold py-3 px-8 rounded"
              type="submit"> Assign</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignSubjToProf;
