import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BASE_URL } from '../axiosConfig';
import bigpic from './Img/BigBog.svg';
import ProfileBtn from './Img/ProfileBtn.png';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Components/authContext';
import { Home, Settings, Calendar, Users, Building2, BookOpen, Layers, UserCog } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth(); // Get the user and setUser function
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [departmentLoaded, setDepartmentLoaded] = useState(false);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });

  const profileBtnRef = useRef(null);
  const dropdownRef = useRef(null);
  const modalRef = useRef(null);
  const buttonRefs = useRef({});
  const isAdmin = user?.Roles === 'Admin';
  const isProgramHead = user?.Roles === 'Program Head';
  const isAdminOrProgramHead = isAdmin || isProgramHead;
  const isNonAdmin = user?.Roles !== 'Admin';

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (user && !user.Department?.Name && !isLoadingUserDetails && !departmentLoaded) {
        setIsLoadingUserDetails(true);
        try {
          const response = await axios.get(
            `${BASE_URL}/accounts/getCurrentAccount?t=${Date.now()}`,
            { withCredentials: true }
          );
          if (response.data.successful && response.data.account) {
            setUser(response.data.account);
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
        } finally {
          setIsLoadingUserDetails(false);
          setDepartmentLoaded(true);
        }
      } else if (user && user.Department?.Name && !departmentLoaded) {
        setDepartmentLoaded(true);
      }
    };

    fetchUserDetails();
  }, [user, setUser, isLoadingUserDetails, departmentLoaded]);

  const openModal = (content, event) => {
    if (isAdmin && content === 'Timetables') {
      return;
    }
    
    // Get the button that was clicked
    const buttonElement = event.currentTarget;
    const rect = buttonElement.getBoundingClientRect();
    
    // Use the helper function to calculate position
    const position = calculateModalPosition(content, rect);
    
    setModalPosition(position);
    setModalContent(content);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setFadeIn(false);
    setTimeout(() => {
      setIsModalOpen(false);
      setModalContent(null);
    }, 300);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (isModalOpen) {
      setFadeIn(true);
    }
  }, [isModalOpen]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileBtnRef.current && !profileBtnRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/accounts/logoutAccount`, {}, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
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
  };

  const renderDepartmentInfo = () => {
    if (!user) return 'Department';
    if (!departmentLoaded) return 'Loading department...';
    return user.Department?.Name ? `${user.Department.Name} Department` : 'Department';
  };

  // Set up responsive positioning based on screen size
  const calculateModalPosition = (content, buttonRect) => {
    const scrollOffset = window.pageYOffset || document.documentElement.scrollTop;
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      // On mobile, position at the bottom of the screen
      return {
        top: 'auto',
        left: '50%',
        bottom: '20px',
        transform: 'translateX(-50%)'
      };
    } else {
      // On desktop, position right next to the clicked button
      const safePadding = 20;
      const modalWidth = 300; // Match the modal width defined in the render
      
      // Check if there's room to the right of the button
      const rightEdgePosition = buttonRect.right + modalWidth + safePadding;
      const hasSpaceOnRight = rightEdgePosition < window.innerWidth;
      
      if (hasSpaceOnRight) {
        // Position to the right of the button with proper offset
        return {
          top: `${buttonRect.top + scrollOffset}px`,
          left: `${buttonRect.right + 10}px`, // Closer to the button
          transform: 'none'
        };
      } else {
        // Position to the left of the button if no space on right
        return {
          top: `${buttonRect.top + scrollOffset}px`,
          left: `${buttonRect.left - modalWidth - 10}px`, // Closer to the button
          transform: 'none'
        };
      }
    }
  };

  return (
    <div className='bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto bg-gray-800'>
      <div className="absolute top-15 right-15 flex justify-between items-center px-4 py-2 w-full bg-opacity-70 md:px-8">
        <button
          id="logoBtn"
          className="hidden text-lg md:text-3xl font-bold md:hidden text-blue-500"
          onClick={() => navigate("/homePage")}>
          EASE<span className="text-white">SCHEDULER</span>
        </button>
        {/* Profile Button */}
        <button
          ref={profileBtnRef}
          className='absolute top-5 right-5 w-25 h-25 md:w-40 md:h-40 duration-200 hover:scale-105'
          onClick={toggleDropdown}
        >
          <img src={ProfileBtn} alt="ProfileBtn" />
        </button>
      </div>

      {/* Dropdown Menu with User Profile Info */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-5 mt-16 bg-white shadow-lg rounded-md p-4 z-10 max-w-full"
          style={{
            top: "calc(40px + 1rem)" // Position below the profile button
          }}
        >
          {/* User Profile Section */}
          <div className="border-b border-gray-200 pb-3 mb-3">
            <h3 className="font-semibold text-gray-800 truncate">{user?.Name || 'User'}</h3>
            <p className="text-sm text-gray-600 truncate">{user?.Email || 'No email'}</p>
            <p className="text-xs text-gray-500 truncate">
              {!departmentLoaded ? 'Loading department...' : (user?.Department?.Name || 'No department')}
            </p>
          </div>
          <ul className="space-y-2">
            <li>
              <a href="/accountSettings" className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md text-sm">
                Account Settings
              </a>
            </li>
            {isAdminOrProgramHead && (
              <li>
                <a href="/createAccount" className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md text-sm">
                  Create Account
                </a>
              </li>
            )}
            <li>
              <a href="/historyLogs" className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md text-sm">
                History Logs
              </a>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md w-full text-left text-sm"
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      )}

      {/* LEFT SIDE CALENDAR IMG */}
      <div className="hidden md:block w-1/2 mx-auto text-center">
        {/* EASESCHEDULER LOGO */}
        <div className='pb-8 flex justify-center mt-6'>
          <button id="logoBtn" className="md:text-4xl sm:text-2xl font-bold text-blue-500" onClick={() => navigate("/homepage")}>
            EASE<span className="text-white hover:text-gray-500 duration-300">SCHEDULER</span>
          </button>
        </div>
        <div className="flex justify-center">
          <img src={bigpic} alt="Calendar" className="w-auto max-w-full max-h-[500px] object-contain" />
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className='w-full md:w-5/12 lg:w-5/12 xl:w-5/12 px-4 sm:px-0 flex flex-col items-center my-20 mx-40 relative'>
        {/* Welcome message with user info */}
        <div className="mb-8 text-center">
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-1">
            Welcome, {user?.Name || 'User'}!
          </h2>
          <p className="text-white text-md md:text-lg opacity-90">
            {user?.Email || 'user@example.com'}
          </p>
          <p className="text-white text-md md:text-lg">
            {renderDepartmentInfo()}
          </p>
        </div>

        <div className='w-fit m-auto'>
          <section>
            <div className='relative pt-4 mx-auto'>
              <div className='grid lg:grid-cols-2 sm:grid-cols-3 gap-15 mt-30'>
                {/* Timetables Card - Disabled for Admin */}
                <button
                  ref={el => buttonRefs.current['Timetables'] = el}
                  className={`p-12 sm:p-18 md:p-30 shadow-2xl rounded-lg flex flex-col justify-center items-center
                    ${isAdmin
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 transition duration-500 hover:scale-110 cursor-pointer'}`}
                  onClick={(e) => !isAdmin && openModal('Timetables', e)}
                  disabled={isAdmin}
                >
                  <Calendar className="h-70 w-70 md:h-100 md:w-100 text-white" />
                  <span className={`text-sm md:text-lg 2xl:text-2xl font-semibold ${isAdmin ? 'text-gray-200' : 'text-[#FFFFFF]'}`}>
                    Timetables
                  </span>
                </button>

                {/* Professor Management Card */}
                <button
                  className='p-12 sm:p-18 md:p-30 shadow-2xl bg-blue-500 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                  onClick={() => navigate('/professorManagement')}
                >
                  <Users className="h-70 w-70 md:h-100 md:w-100 text-white" />
                  <span className="text-[#FFFFFF] text-sm md:text-lg 2xl:text-2xl font-semibold">
                    Professor Management
                  </span>
                </button>

                {/* Room Management Card */}
                <button
                  onClick={() => navigate('/room')}
                  className='p-12 sm:p-18 md:p-30 shadow-2xl bg-blue-500 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                >
                  <Building2 className="h-70 w-70 md:h-100 md:w-100 text-white" />
                  <span className="text-[#FFFFFF] text-sm md:text-lg 2xl:text-2xl font-semibold">
                    Room Management
                  </span>
                </button>

                {/* Course Management Card - Disabled for Admin */}
                <button
                  onClick={() => !isAdmin && navigate('/course')}
                  disabled={isAdmin}
                  className={`p-12 sm:p-18 md:p-30 shadow-2xl rounded-lg flex flex-col justify-center items-center
                    ${isAdmin
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 transition duration-500 hover:scale-110 cursor-pointer'}`}
                >
                  <BookOpen className={`h-70 w-70 md:h-100 md:w-100 text-white ${isAdmin ? 'opacity-50' : ''}`} />
                  <span className={`text-sm md:text-lg 2xl:text-2xl font-semibold ${isAdmin ? 'text-gray-200' : 'text-[#FFFFFF]'}`}>
                    Course Management
                  </span>
                </button>

                {/* Departments & Programs Card */}
                <button
                  ref={el => buttonRefs.current['DeptProg'] = el}
                  onClick={(e) => openModal('DeptProg', e)}
                  className='p-12 sm:p-18 md:p-30 shadow-2xl bg-blue-500 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                >
                  <Layers className="h-70 w-70 md:h-100 md:w-100 text-white" />
                  <span className="text-[#FFFFFF] text-sm md:text-lg 2xl:text-2xl font-semibold">
                    Depts & Programs
                  </span>
                </button>

                {/* Account Card */}
                <button
                  ref={el => buttonRefs.current['Account'] = el}
                  onClick={(e) => openModal('Account', e)}
                  className='p-12 sm:p-18 md:p-30 shadow-2xl bg-blue-500 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                >
                  <UserCog className="h-70 w-70 md:h-100 md:w-100 text-white" />
                  <span className="text-[#FFFFFF] text-sm md:text-lg 2xl:text-2xl font-semibold">
                    Account
                  </span>
                </button>
              </div>

              {/* Modal */}
              {isModalOpen && (
                <div 
                  ref={modalRef}
                  className={`fixed bg-white rounded-lg p-16 w-fit z-20 shadow-xl flex flex-col items-center justify-center transition-all duration-300 ${fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                  style={{
                    ...modalPosition,
                    width: '300px',
                    maxWidth: '95vw',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <button
                    className="absolute top-0 right-0 text-xl font-bold text-red-500 hover:text-red-700 cursor-pointer duration-300"
                    onClick={closeModal}
                  >
                    <span className="font-bold m-9">x</span>
                  </button>
                  <h2 className="whitespace-nowrap text-2xl px-8 py-4 font-semibold text-ceuViolet text-center mb-6">
                    {modalContent}
                  </h2>
                  <ul className="space-y-4 mb-4 w-full text-center">
                    {modalContent === 'Timetables' && (
                      <>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300 block"
                            onClick={() => navigate('/addConfigSchedule')}>
                            Add/Configure Timetables
                          </a>
                        </li>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300 block"
                            onClick={() => navigate('/roomTimetable')}
                          >
                            Room Timetables
                          </a>
                        </li>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300 block"
                            onClick={() => navigate('/profTimetable')}>
                            Professors Timetables
                          </a>
                        </li>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300 block"
                            onClick={() => navigate('/sectionTimetable')}>
                            Section Timetables
                          </a>
                        </li>
                      </>
                    )}
                    {modalContent === 'DeptProg' && (
                      <>
                        {isAdmin && (
                          <li>
                            <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300 block"
                              onClick={() => navigate('/deptProg')}
                            >
                              Manage Depts & Programs
                            </a>
                          </li>
                        )}
                        {isNonAdmin && (
                          <li>
                            <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300 block"
                              onClick={() => navigate('/progYrSec')}>
                              Program, Year, & Sections
                            </a>
                          </li>
                        )}
                      </>
                    )}
                    {modalContent === 'Account' && (
                      <>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300 block"
                            onClick={() => navigate('/accountSettings')}
                          >
                            Account Settings
                          </a>
                        </li>
                        {isAdminOrProgramHead && (
                          <li>
                            <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300 block"
                              onClick={() => navigate('/createAccount')}>
                              Create Account
                            </a>
                          </li>
                        )}
                        {isAdmin && (
                          <li>
                            <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300 block"
                              onClick={() => navigate('/accountList')}>
                              Account List
                            </a>
                          </li>
                        )}
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300 block"
                            onClick={() => navigate('/historyLogs')}>
                            History Logs
                          </a>
                        </li>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300 block"
                            onClick={handleLogout}>
                            Logout
                          </a>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HomePage;