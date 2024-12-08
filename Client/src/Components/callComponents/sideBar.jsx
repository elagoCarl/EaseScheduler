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
    <div ref={sidebarRef}
      className={`fixed right-0 xs:right-0 h-full bg-gray-800 text-white shadow-lg transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 w-5/12 md:w-3/12 z-50 flex flex-col justify-center`}>
      <button
        id="logoBtn"
        className="text-md md:text-xl font-bold text-blue-500 relative"
        onClick={() => navigate('/')}
      >
        EASE<span className="text-white">SCHEDULER</span>
      </button>

      {/* Timetables Section */}
      <div className="flex flex-col items-start space-y-1 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left flex justify-between items-center"
          onClick={() => toggleSubContent('Timetables')}
        >
          Timetables
          <svg
            className={`w-9 h-9 transform transition-transform ${activeSection === 'Timetables' ? 'rotate-180' : ''
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
          className={`pl-12 space-y-3 overflow-hidden transition-all duration-500 ${activeSection === 'Timetables' ? 'max-h-screen' : 'max-h-0'
            }`}
        >
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/Timetables/daily');
              toggleSidebar(false);
            }}
          >
            Add/Configure Timetables
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/Timetables/week');
              toggleSidebar(false);
            }}
          >
            Room Timetables
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/Timetables/week');
              toggleSidebar(false);
            }}
          >
            Professors Timetables
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/Timetables/week');
              toggleSidebar(false);
            }}
          >
            Section Timetables
          </button>
        </div>
      </div>

      {/* Professors Section */}
      <div className="flex flex-col items-start space-y-1 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left flex justify-between items-center"
          onClick={() => toggleSubContent('professors')}
        >
          Professors
          <svg
            className={`w-9 h-9 transform transition-transform ${activeSection === 'professors' ? 'rotate-180' : ''
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
          className={`pl-12 space-y-3 overflow-hidden transition-all duration-500 ${activeSection === 'professors' ? 'max-h-screen' : 'max-h-0'
            }`}
        >
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/professors/all');
              toggleSidebar(false);
            }}
          >
            Add/Configure Professors
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/professors/add');
              toggleSidebar(false);
            }}
          >
            Professor Availability
          </button>
        </div>
      </div>

      {/* Rooms Section (No sub-content) */}
      <div className="flex flex-col items-start space-y-1 px-20 py-15">
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
      <div className="flex flex-col items-start space-y-1 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left"
          onClick={() => {
            navigate('/course');
            toggleSidebar(false);
          }}
        >
          Courses
        </button>
      </div>

      {/* Account Section */}
      <div className="flex flex-col items-start space-y-1 px-20 py-15">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left flex justify-between items-center"
          onClick={() => toggleSubContent('account')}
        >
          Account
          <svg
            className={`w-9 h-9 transform transition-transform ${activeSection === 'account' ? 'rotate-180' : ''
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
          className={`pl-12 space-y-3 overflow-hidden transition-all duration-500 ${activeSection === 'account' ? 'max-h-screen' : 'max-h-0'
            }`}
        >
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/accountSettings');
              toggleSidebar(false);
            }}
          >
            Account Settings
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/createAccount');
              toggleSidebar(false);
            }}
          >
            Create Account
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/account/profile');
              toggleSidebar(false);
            }}
          >
            History Logs
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/account/profile');
              toggleSidebar(false);
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
