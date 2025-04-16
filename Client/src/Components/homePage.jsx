import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BASE_URL } from '../axiosConfig';
import image5 from './Img/5.jpg';
import room from './Img/room.svg';
import person from './Img/person.svg'
import course from './Img/course.svg';
import bigpic from './Img/BigBog.svg';
import timetables from './Img/timetable.svg';
import ProfileBtn from './Img/ProfileBtn.png';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Components/authContext'; // Import useAuth hook

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get the user from auth context

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);  // State for dropdown visibility

  // Create refs for the profile button and the dropdown
  const profileBtnRef = useRef(null);
  const dropdownRef = useRef(null);
  const modalRef = useRef(null);

  const openModal = (content) => {
    setModalContent(content);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setFadeIn(false);  // Start the fade-out animation
    setTimeout(() => {
      setIsModalOpen(false);
      setModalContent(null);
    }, 300);  // Delay to match the fade-out duration
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
      setFadeIn(true);  // Trigger fade-in when modal opens
    }
  }, [isModalOpen]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);  // Toggle the dropdown visibility on click
  };

  // Close the dropdown if the user clicks outside the profile button or dropdown
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
      // Using regular axios with BASE_URL directly to bypass the refresh interceptor
      const response = await axios.post(`${ BASE_URL }/accounts/logoutAccount`, {}, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.successful) {
        // Navigate to the login page after logout
        navigate('/loginPage');
        window.location.reload();
      } else {
        console.error('Logout failed:', response.data.message);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <div className='bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto'
      style={{ backgroundImage: `url(${ image5 })` }}>
      <div className="absolute hidden top-15 sm:right-[-1rem] justify-between items-center px-4 py-2 w-full bg-opacity-70 md:px-8">
        <button
          id="logoBtn"
          className="text-lg md:text-3xl font-bold block md:hidden text-blue-500"
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
        <div ref={dropdownRef} className="absolute xs:top-50 xs:right-20 sm:top-62 sm:right-40 lg:top-60 lg:right-50 bg-white shadow-lg rounded-md p-4 z-10">
          {/* User Profile Section */}
          <div className="border-b border-gray-200 pb-3 mb-3">
            <h3 className="font-semibold text-gray-800">{user?.Name || 'User'}</h3>
            <p className="text-sm text-gray-600">{user?.Email || 'No email'}</p>
            <p className="text-xs text-gray-500">
              {user?.Department?.Name || 'No department'}
            </p>
          </div>
          <ul className="space-y-4">
            <li>
              <a href="/accountSettings" className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md">
                Account Settings
              </a>
            </li>
            <li>
              <a href="/createAccount" className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md">
                Create Account
              </a>
            </li>
            <li>
              <a href="/historyLogs" className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md">
                History Logs
              </a>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md w-full text-left"
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
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-1">Welcome, {user?.Name || 'User'}!</h2>
          <p className="text-white text-md md:text-lg opacity-90">{user?.Email || 'user@example.com'}</p>
          <p className="text-white text-md md:text-lg">{user?.Department?.Name || 'Department'}</p>
        </div>

        <div className='w-fit m-auto'>
          <section>
            <div className='relative pt-4 mx-auto'>
              <div className='grid xs:grid-cols-1 sm:grid-cols-2 gap-15 mt-30'>
                {/* 1st Card (Timetable) */}
                <button
                  className='p-12 sm:p-18 md:p-30 shadow-2xl bg-blue-500 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                  onClick={() => openModal('Timetables')}
                >
                  <img className='h-70 w-70 md:h-100 md:w-100' src={timetables} alt="" />
                  <span className="text-[#FFFFFF] text-sm md:text-lg 2xl:text-2xl font-semibold">
                    Timetables
                  </span>
                </button>

                {/* 2nd Card (Professor) */}
                <button
                  className='p-12 sm:p-18 md:p-30 shadow-2xl bg-blue-500 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                  onClick={() => openModal('Professor')}
                >
                  <img className='h-70 w-70 md:h-100 md:w-100' src={person} alt="" />
                  <span className="text-[#FFFFFF] text-sm md:text-lg 2xl:text-2xl font-semibold">
                    Professor
                  </span>
                </button>

                {/* 3rd Card (Course) */}
                <button
                  onClick={() => navigate('/course')}
                  className='p-12 sm:p-18 md:p-30 shadow-2xl bg-blue-500 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                >
                  <img className='h-70 w-70 md:h-100 md:w-100' src={course} alt="" />
                  <span className="text-[#FFFFFF] text-sm md:text-lg 2xl:text-2xl font-semibold">
                    Course
                  </span>
                </button>

                {/* 4th Card (Room) */}
                <button
                  onClick={() => navigate('/room')}
                  className='p-12 sm:p-18 md:p-30 shadow-2xl bg-blue-500 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                >
                  <img className='h-70 w-70 md:h-100 md:w-100' src={room} alt="" />
                  <span className="text-[#FFFFFF] text-sm md:text-lg 2xl:text-2xl font-semibold">
                    Room
                  </span>
                </button>
              </div>

              {/* Modal */}
              {isModalOpen && (
                <div className={`absolute top-1/2 left-1/2 text-xl transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-8 w-fit z-10 shadow-xl flex flex-col items-center justify-center transition-all duration-300 ${ fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95' }`}>
                  <button
                    ref={modalRef}
                    className="absolute top-0 right-0 text-xl font-bold text-red-500 hover:text-red-700 cursor-pointer duration-300"
                    onClick={closeModal}
                  >
                    <span className="font-bold m-9">x</span>
                  </button>
                  <h2 className="whitespace-nowrap text-2xl px-60 py-8 font-semibold text-ceuViolet text-center m-15">
                    {modalContent}
                  </h2>
                  <ul className="space-y-20 m-20 text-center">
                    {modalContent === 'Timetables' && (
                      <>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300"
                            onClick={() => navigate('/addConfigSchedule')}>
                            Configure Timetable
                          </a>
                        </li>
                        <li className=''>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300"
                            onClick={() => navigate('/roomTimetable')}
                          >
                            Room Timetable
                          </a>
                        </li>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300"
                            onClick={() => navigate('/profTimetable')}>
                            Professor Timetable
                          </a>
                        </li>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300"
                            onClick={() => navigate('/sectionTimetable')}>
                            Section Timetable
                          </a>
                        </li>
                      </>
                    )}
                    {modalContent === 'Professor' && (
                      <>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300"
                            onClick={() => navigate('/professor')}
                          >
                            Configure Professor
                          </a>
                        </li>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300"
                            onClick={() => navigate('/profAvailability')}>
                            Professor Availability
                          </a>
                        </li>
                        <li>
                          <a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white duration-300"
                            onClick={() => navigate('/assignationsCourseProf')}>
                            Professor Assignations
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