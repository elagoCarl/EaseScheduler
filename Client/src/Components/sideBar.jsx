import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const sidebarRef = useRef(null);

  // Manage the state for showing sub-contents
  const [activeSection, setActiveSection] = useState(null);

  // Close sidebar when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        toggleSidebar(false); // Close the sidebar if clicked outside
      }
    };

    // Add event listener when sidebar is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup on component unmount or when sidebar is closed
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, toggleSidebar]);

  // Toggle sub-content visibility
  const toggleSubContent = (section) => {
    setActiveSection(activeSection === section ? null : section); // Toggle sub-content
  };

  return (
    <div
      ref={sidebarRef}
      className={`fixed top-0 right-0 h-full bg-gray-800 text-white shadow-lg transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 w-2/12 z-50 flex flex-col justify-center`}>
        <button
          id="logoBtn"
          className="text-md md:text-xl font-bold text-blue-500 relative"
          onClick={() => navigate("/")}
        >
          EASE<span className="text-white">SCHEDULER</span>
        </button>

      {/* Schedules Section */}
      <div className="flex flex-col items-start space-y-4 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left flex justify-between items-center"
          onClick={() => {
            toggleSubContent('schedules'); // Toggle sub-content for schedules
          }}
        >
          Schedules
          <svg
            className={`w-9 h-9 transform ${activeSection === 'schedules' ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {activeSection === 'schedules' && (
          <div className="pl-12 space-y-3">
            <button
              className="hover:bg-gray-700 p-2 rounded w-full text-left"
              onClick={() => {
                navigate('/schedules/daily');
                toggleSidebar(false); // Close the sidebar after navigation
              }}
            >
              Daily View
            </button>
            <button
              className="hover:bg-gray-700 p-2 rounded w-full text-left"
              onClick={() => {
                navigate('/schedules/week');
                toggleSidebar(false); // Close the sidebar after navigation
              }}
            >
              Weekly View
            </button>
          </div>
        )}
      </div>

      {/* Professors Section */}
      <div className="flex flex-col items-start space-y-4 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left flex justify-between items-center"
          onClick={() => {
            toggleSubContent('professors'); // Toggle sub-content for professors
          }}
        >
          Professors
          <svg
            className={`w-9 h-9 transform ${activeSection === 'professors' ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {activeSection === 'professors' && (
          <div className="pl-12 space-y-3">
            <button
              className="hover:bg-gray-700 p-2 rounded w-full text-left"
              onClick={() => {
                navigate('/professors/all');
                toggleSidebar(false); // Close the sidebar after navigation
              }}
            >
              All Professors
            </button>
            <button
              className="hover:bg-gray-700 p-2 rounded w-full text-left"
              onClick={() => {
                navigate('/professors/add');
                toggleSidebar(false); // Close the sidebar after navigation
              }}
            >
              Add Professor
            </button>
          </div>
        )}
      </div>

      {/* Rooms Section (No sub-content) */}
      <div className="flex flex-col items-start space-y-4 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left"
          onClick={() => {
            navigate('/room');
            toggleSidebar(false); // Close the sidebar after navigation
          }}
        >
          Rooms
        </button>
      </div>

      {/* Courses Section (No sub-content) */}
      <div className="flex flex-col items-start space-y-4 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left"
          onClick={() => {
            navigate('/courses');
            toggleSidebar(false); // Close the sidebar after navigation
          }}
        >
          Courses
        </button>
      </div>

      {/* Account Section */}
      <div className="flex flex-col items-start space-y-4 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left flex justify-between items-center"
          onClick={() => {
            toggleSubContent('account'); // Toggle sub-content for account
          }}
        >
          Account
          <svg
            className={`w-9 h-9 transform ${activeSection === 'account' ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {activeSection === 'account' && (
          <div className="pl-12 space-y-3">
            <button
              className="hover:bg-gray-700 p-2 rounded w-full text-left"
              onClick={() => {
                navigate('/accountSettings');
                toggleSidebar(false); // Close the sidebar after navigation
              }}
            >
              Settings
            </button>
            <button
              className="hover:bg-gray-700 p-2 rounded w-full text-left"
              onClick={() => {
                navigate('/account/profile');
                toggleSidebar(false); // Close the sidebar after navigation
              }}
            >
              Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
