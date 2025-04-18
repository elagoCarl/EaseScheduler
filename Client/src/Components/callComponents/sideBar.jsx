import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../Components/authContext';
import axios from 'axios';
import { BASE_URL } from '../../axiosConfig';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  // console.log(user);
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

  const handleLogout = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/accounts/logoutAccount`, {}, {
        withCredentials: true, // ensure cookies are sent
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.successful) {
        navigate('/loginPage');
        window.location.reload();
      } else {
        console.error('Logout failed:', response.data.message);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
    toggleSidebar(false);
  };

  const isAdmin = user?.Roles === 'Admin';

  return (
    <div ref={sidebarRef}
      className={`fixed right-0 xs:right-0 min-h-screen bg-gray-800 text-white shadow-lg transform ${isOpen ? 'translate-x-0' : 'translate-x-full'
        } transition-transform duration-300 w-5/12 md:w-1/6 xs:w-2/6 z-50 flex flex-col justify-center`}>
      <button
        id="logoBtn"
        className="xl:text-md md:text-lg font-bold text-blue-500 relative"
        onClick={() => navigate('/homePage')}
      >
        EASE<span className="text-white">SCHEDULER</span>
      </button>

      {/* User Profile Section */}
      <div className="flex flex-col items-center px-5 py-4 border-b border-gray-700">
        <div className="text-center">
          <h3 className="font-semibold truncate max-w-full">{user?.Name || 'User'}</h3>
          <p className="text-sm text-gray-300 truncate max-w-full">{user?.Email || 'No email'}</p>
          <p className="text-xs text-gray-400 truncate max-w-full">
            {user?.Department?.Name || 'No department'}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-10">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left"
          onClick={() => {
            navigate('/homePage');
            toggleSidebar(false);
          }}
        >
          Home
        </button>
      </div>

      {/* Timetables Section */}
      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-10">
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          className={`pl-12 space-y-3 overflow-hidden transition-all duration-500 ${activeSection === 'Timetables' ? 'max-h-screen' : 'max-h-0'
            }`}
        >
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/addConfigSchedule');
              toggleSidebar(false);
            }}
          >
            Add/Configure Timetables
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/roomTimetable');
              toggleSidebar(false);
            }}
          >
            Room Timetables
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/profTimetable');
              toggleSidebar(false);
            }}
          >
            Professors Timetables
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/sectionTimetable');
              toggleSidebar(false);
            }}
          >
            Section Timetables
          </button>
        </div>
      </div>

      {/* Professors Section */}
      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-10">
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          className={`pl-12 space-y-3 overflow-hidden transition-all duration-500 ${activeSection === 'professors' ? 'max-h-screen' : 'max-h-0'
            }`}
        >
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/professor');
              toggleSidebar(false);
            }}
          >
            Add/Configure Professors
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/profAvailability');
              toggleSidebar(false);
            }}
          >
            Professor Availability
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/assignationsCourseProf');
              toggleSidebar(false);
            }}
          >
            Professor Assignations
          </button>
        </div>
      </div>

      {/* Rooms Section (No sub-content) */}
      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-10">
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
      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-10">
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

      {/* Departments & Programs Section with dropdown */}
      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-10">
        <button
          className="hover:bg-gray-700 p-10 rounded w-full text-left flex justify-between items-center"
          onClick={() => toggleSubContent('deptProg')}
        >
          Departments & Programs
          <svg
            className={`w-9 h-9 transform transition-transform ${activeSection === 'deptProg' ? 'rotate-180' : ''
              }`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          className={`pl-12 space-y-3 overflow-hidden transition-all duration-500 ${activeSection === 'deptProg' ? 'max-h-screen' : 'max-h-0'
            }`}
        >
          {isAdmin && (
            <button
              className="hover:bg-gray-700 p-2 rounded w-full text-left"
              onClick={() => {
                navigate('/deptProg');
                toggleSidebar(false);
              }}
            >
              Manage Depts & Programs
            </button>
          )}
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/progYrSec');
              toggleSidebar(false);
            }}
          >
            Program, Year, & Sections
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/courseProg');
              toggleSidebar(false);
            }}
          >
            Course & Program
          </button>
        </div>
      </div>

      {/* Account Section */}
      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-10">
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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

          {isAdmin && (
            <>
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
                  navigate('/accountList');
                  toggleSidebar(false);
                }}
              >
                Account List
              </button>
            </>
          )}

          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={() => {
              navigate('/historyLogs');
              toggleSidebar(false);
            }}
          >
            History Logs
          </button>
          <button
            className="hover:bg-gray-700 p-2 rounded w-full text-left"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
};

export default Sidebar;