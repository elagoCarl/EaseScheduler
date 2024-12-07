import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const sidebarRef = useRef(null);

  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        toggleSidebar(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, toggleSidebar]);

  const toggleSubContent = (section) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div
      ref={sidebarRef}
      className={`fixed top-0 right-0 h-full bg-gray-800 text-white shadow-lg transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } transition-transform duration-300 w-2/12 z-50 flex flex-col justify-center`}
    >
      <button
        id="logoBtn"
        className="text-md md:text-xl font-bold text-blue-500 relative"
        onClick={() => navigate('/')}
      >
        EASE<span className="text-white">SCHEDULER</span>
      </button>

      {/* Schedules Section */}
      <div className="flex flex-col items-start space-y-4 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left flex justify-between items-center"
          onClick={() => toggleSubContent('schedules')}
        >
          Schedules
          <svg
            className={`w-9 h-9 transform transition-transform ${
              activeSection === 'schedules' ? 'rotate-180' : ''
            }`}
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
        <div
          className={`pl-12 space-y-3 overflow-hidden transition-all duration-500 ${
            activeSection === 'schedules' ? 'max-h-screen' : 'max-h-0'
          }`}
        >
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/schedules/daily');
              toggleSidebar(false);
            }}
          >
            Daily View
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/schedules/week');
              toggleSidebar(false);
            }}
          >
            Weekly View
          </button>
        </div>
      </div>

      {/* Professors Section */}
      <div className="flex flex-col items-start space-y-4 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left flex justify-between items-center"
          onClick={() => toggleSubContent('professors')}
        >
          Professors
          <svg
            className={`w-9 h-9 transform transition-transform ${
              activeSection === 'professors' ? 'rotate-180' : ''
            }`}
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
        <div
          className={`pl-12 space-y-3 overflow-hidden transition-all duration-500 ${
            activeSection === 'professors' ? 'max-h-screen' : 'max-h-0'
          }`}
        >
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/professors/all');
              toggleSidebar(false);
            }}
          >
            All Professors
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/professors/add');
              toggleSidebar(false);
            }}
          >
            Add Professor
          </button>
        </div>
      </div>

      {/* Rooms Section (No sub-content) */}
      <div className="flex flex-col items-start space-y-4 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left"
          onClick={() => {
            navigate('/room');
            toggleSidebar(false);
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
            toggleSidebar(false);
          }}
        >
          Courses
        </button>
      </div>

      {/* Account Section */}
      <div className="flex flex-col items-start space-y-4 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left flex justify-between items-center"
          onClick={() => toggleSubContent('account')}
        >
          Account
          <svg
            className={`w-9 h-9 transform transition-transform ${
              activeSection === 'account' ? 'rotate-180' : ''
            }`}
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
        <div
          className={`pl-12 space-y-3 overflow-hidden transition-all duration-500 ${
            activeSection === 'account' ? 'max-h-screen' : 'max-h-0'
          }`}
        >
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/accountSettings');
              toggleSidebar(false);
            }}
          >
            Settings
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/account/profile');
              toggleSidebar(false);
            }}
          >
            Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
