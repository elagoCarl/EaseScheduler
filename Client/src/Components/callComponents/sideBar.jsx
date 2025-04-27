import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../Components/authContext';
import axios from 'axios';
import { BASE_URL } from '../../axiosConfig';

// Import Lucide React Icons
import { Home, Settings, Calendar, Users, Building2, BookOpen, Layers, UserCog, LogOut, ChevronDown } from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
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
  const isProgramHead = user?.Roles === 'Program Head';
  const isAdminOrProgramHead = isAdmin || isProgramHead;
  const isNonAdmin = user?.Roles !== 'Admin';

  // Menu item component for consistent styling
  const MenuItem = ({ label, onClick, hasChildren, isActive, icon: Icon, children }) => (
    <div className="w-full mb-6">
      <button
      className={`hover:bg-[#5c5c72] duration-300 py-6 px-4 rounded w-full flex items-center gap-12 transition-all ${
        isActive ? 'border-l-4 border-blue-400 bg-gray-700/50' : ''
      }`}
        onClick={onClick}
      >
        {Icon && <Icon className="w-20 h-20" />}
        <span className="text-base font-medium flex-grow text-left">{label}</span>
        {hasChildren && (
          <ChevronDown
            className={`w-10 h-10 mr-5 transform transition-transform ${isActive ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {children}
    </div>
  );

  // Submenu item component for consistent styling
  const SubMenuItem = ({ label, onClick }) => (
    <button
      className="hover:bg-gray-700 py-2 px-12 rounded w-full flex items-center text-sm transition-colors text-left"
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div ref={sidebarRef}
    className={`fixed left-0 min-h-screen bg-[#222e52] text-white shadow-lg transform ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } transition-transform duration-300 w-[260px] z-50 flex flex-col items-center overflow-y-auto`}>
     

      {/* User Profile Section */}
      <div className="flex items-center text-center justify-center p-12 w-full border-b-2 border-white/60">
        <div>
          <h3 className="font-semibold text-lg truncate max-w-full">{user?.Name || 'User'}</h3>
          <p className="text-sm text-gray-300 truncate max-w-full">{user?.Email || 'No email'}</p>
          <p className="text-md text-gray-400 truncate max-w-full">
            {user?.Department?.Name || 'No department'}
          </p>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex flex-col w-full py-20 px-3 overflow-y-auto">
        <MenuItem 
          label="Home" 
          icon={Home}
          onClick={() => {
            navigate('/homePage');
            toggleSidebar(false);
          }}
        />

        {/* Schedule Settings - Admin cannot access */}
        {isNonAdmin && (
          <MenuItem 
            label="Schedule Settings" 
            icon={Settings}
            onClick={() => {
              navigate('/settings');
              toggleSidebar(false);
            }}
          />
        )}

        {/* Timetables Section - Admin cannot access */}
        {isNonAdmin && (
          <MenuItem
            label="Timetables"
            icon={Calendar}
            hasChildren={true}
            isActive={activeSection === 'Timetables'}
            onClick={() => toggleSubContent('Timetables')}
          >
            <div
              className={`space-y-5 overflow-hidden transition-all duration-300 ${
                activeSection === 'Timetables' ? 'max-h-screen py-5' : 'max-h-0'
              }`}
            >
              <SubMenuItem
                label="Add/Configure Timetables"
                onClick={() => {
                  navigate('/addConfigSchedule');
                  toggleSidebar(false);
                }}
              />
              <SubMenuItem
                label="Room Timetables"
                onClick={() => {
                  navigate('/roomTimetable');
                  toggleSidebar(false);
                }}
              />
              <SubMenuItem
                label="Professors Timetables"
                onClick={() => {
                  navigate('/profTimetable');
                  toggleSidebar(false);
                }}
              />
              <SubMenuItem
                label="Section Timetables"
                onClick={() => {
                  navigate('/sectionTimetable');
                  toggleSidebar(false);
                }}
              />
            </div>
          </MenuItem>
        )}

        {/* Professors Section */}
        <MenuItem
          label="Professors"
          icon={Users}
          hasChildren={true}
          isActive={activeSection === 'professors'}
          onClick={() => toggleSubContent('professors')}
        >
          <div
            className={`space-y-5 overflow-hidden transition-all duration-300 ${
              activeSection === 'professors' ? 'max-h-screen py-5' : 'max-h-0'
            }`}
          >
            <SubMenuItem
              label="Add/Configure Professors"
              onClick={() => {
                navigate('/professor');
                toggleSidebar(false);
              }}
            />
            <SubMenuItem
              label="Professor Availability"
              onClick={() => {
                navigate('/profAvailability');
                toggleSidebar(false);
              }}
            />
            {/* Professor Assignations - Admin cannot access */}
            {isNonAdmin && (
              <SubMenuItem
                label="Professor Assignations"
                onClick={() => {
                  navigate('/assignationsCourseProf');
                  toggleSidebar(false);
                }}
              />
            )}
            <SubMenuItem
              label="Professor Status"
              onClick={() => {
                navigate('/profStatus');
                toggleSidebar(false);
              }}
            />
          </div>
        </MenuItem>

        {/* Rooms Section */}
        <MenuItem
          label="Rooms"
          icon={Building2}
          onClick={() => {
            navigate('/room');
            toggleSidebar(false);
          }}
        />

        {/* Courses Section - Admin cannot access */}
        {isNonAdmin && (
          <MenuItem
            label="Courses"
            icon={BookOpen}
            onClick={() => {
              navigate('/course');
              toggleSidebar(false);
            }}
          />
        )}

        {/* Departments & Programs Section */}
        <MenuItem
          label="Departments & Programs"
          icon={Layers}
          hasChildren={true}
          isActive={activeSection === 'deptProg'}
          onClick={() => toggleSubContent('deptProg')}
        >
          <div
            className={`space-y-5 overflow-hidden transition-all duration-300 ${
              activeSection === 'deptProg' ? 'max-h-screen py-5' : 'max-h-0'
            }`}
          >
            {/* Admin-only access to Manage Depts & Programs */}
            {isAdmin && (
              <SubMenuItem
                label="Manage Depts & Programs"
                onClick={() => {
                  navigate('/deptProg');
                  toggleSidebar(false);
                }}
              />
            )}

            {/* Program, Year, & Sections - Admin cannot access */}
            {isNonAdmin && (
              <SubMenuItem
                label="Program, Year, & Sections"
                onClick={() => {
                  navigate('/progYrSec');
                  toggleSidebar(false);
                }}
              />
            )}

            {/* Course & Program - Admin cannot access */}
            {isNonAdmin && (
              <SubMenuItem
                label="Course & Program"
                onClick={() => {
                  navigate('/courseProg');
                  toggleSidebar(false);
                }}
              />
            )}
          </div>
        </MenuItem>

        {/* Account Section */}
        <MenuItem
          label="Account"
          icon={UserCog}
          hasChildren={true}
          isActive={activeSection === 'account'}
          onClick={() => toggleSubContent('account')}
        >
          <div
            className={`space-y-5 overflow-hidden transition-all duration-300 ${
              activeSection === 'account' ? 'max-h-screen py-5' : 'max-h-0'
            }`}
          >
            <SubMenuItem
              label="Account Settings"
              onClick={() => {
                navigate('/accountSettings');
                toggleSidebar(false);
              }}
            />

            {/* Program Head or Admin can access Create Account */}
            {isAdminOrProgramHead && (
              <SubMenuItem
                label="Create Account"
                onClick={() => {
                  navigate('/createAccount');
                  toggleSidebar(false);
                }}
              />
            )}

            {/* Admin-only access to Account List */}
            {isAdmin && (
              <SubMenuItem
                label="Account List"
                onClick={() => {
                  navigate('/accountList');
                  toggleSidebar(false);
                }}
              />
            )}

            <SubMenuItem
              label="History Logs"
              onClick={() => {
                navigate('/historyLogs');
                toggleSidebar(false);
              }}
            />
            <SubMenuItem
              label="Logout"
              onClick={handleLogout}
            />
          </div>
        </MenuItem>
      </div>
    </div>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
};

export default Sidebar;