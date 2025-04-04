import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

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

  // Logout handler that calls the logout API endpoint
  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:8080/accounts/logoutAccount', {
        method: 'POST',
        credentials: 'include', // ensure cookies are sent
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.successful) {
        navigate('/loginPage');
      } else {
        console.error('Logout failed:', data.message);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
    toggleSidebar(false);
  };

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

      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-4 md:py-15">
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
      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-15">
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
      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-15">
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
        </div>
      </div>

      {/* Rooms Section (No sub-content) */}
      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-15">
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
      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-15">
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
      <div className="flex flex-col items-start space-y-1 px-5 md:px-20 py-15">
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
