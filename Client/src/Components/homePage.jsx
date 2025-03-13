import { useState, useEffect, useRef } from 'react';
import image5 from './Img/5.jpg';
import calendar from './Img/Calendar.png';
import vector from './Img/Vector.png';
import vector1 from './Img/Vector1.png';
import vector2 from './Img/Vector2.png';
import vector3 from './Img/Vector3.png';
import ProfileBtn from './Img/ProfileBtn.png';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);  // State for dropdown visibility

  // Create refs for the profile button and the dropdown
  const profileBtnRef = useRef(null);
  const dropdownRef = useRef(null);

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
    if (isModalOpen) {
      setFadeIn(true);  // Trigger fade-in when modal opens
    }
  }, [isModalOpen]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);  // Toggle the dropdown visibility
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

    // Add event listener on mount
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup the event listener on unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className='bg-cover bg-no-repeat min-h-screen flex justify-between items-center overflow-y-auto'
      style={{ backgroundImage: `url(${image5})` }}>
      <div className="absolute top-15 right-18 flex justify-between items-center px-4 py-2 w-full bg-opacity-70 md:px-8">
        <button
          id="logoBtn"
          className="text-lg md:text-3xl font-bold block md:hidden text-blue-500"
          onClick={() => navigate("/homePage")}>
          EASE<span className="text-white">SCHEDULER</span>
        </button>
        {/* Profile Button */}
        <button
          ref={profileBtnRef}  // Attach the ref to the ProfileBtn
          className='absolute top-5 right-5 w-25 h-25 md:w-40 md:h-40 duration-200 hover:scale-105'
          onClick={toggleDropdown}  // Toggle the dropdown visibility on click
        >
          <img className='' src={ProfileBtn} alt="ProfileBtn" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div ref={dropdownRef} className="absolute top-16 right-5 bg-white shadow-lg rounded-md p-4 z-10">
          <ul className="space-y-4">
            <li>
              <a href="/accountSettings" className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md">Account Settings</a>
            </li>
            <li>
              <a href="/createAccount" className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md">Create Account</a>
            </li>
            <li>
              <a href="/historyLogs" className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md">History Logs</a>
            </li>
            <li>
              <a href="#" className="text-customBlue1 hover:bg-customLightBlue2 px-4 py-2 block rounded-md">Logout</a>
            </li>
          </ul>
        </div>
      )}

      {/* LEFT SIDE CALENDAR IMG */}
      <div className="hidden md:block w-1/2 mx-auto">
        {/* EASESCHEDULER LOGO */}
        <div className='pb-4 flex justify-center'>
          <button id="logoBtn" className="text-xl md:text-3xl font-bold text-blue-500" onClick={() => navigate("/")}>
            EASE<span className="text-white">SCHEDULER</span>
          </button>
        </div>
        <img src={calendar} alt="Calendar" className="w-full" />
      </div>

      {/* RIGHT SIDE */}
      <div className='w-full md:w-5/12 lg:w-5/12 xl:w-5/12 px-4 sm:px-0 flex flex-col items-center my-20 mx-40 relative'>
        <div className='w-fit m-auto'>
          <section>
            <div className='relative pt-4 mx-auto'>
              <div className='grid xs:grid-cols-1 sm:grid-cols-2 gap-15 mt-30'>
                {/* 1st Card (Timetable) */}
                <button
                  className='p-12 sm:p-18 md:p-30  shadow-2xl bg-customLightBlue2 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                  onClick={() => openModal('Add/Configure Timetables')}
                >
                  <img className='h-70 w-70 md:h-100 md:w-100' src={vector} alt="" />
                  <span className="text-black text-sm md:text-lg 2xl:text-2xl font-semibold">Timetables</span>
                </button>

                {/* 2nd Card (Professor) */}
                <button
                  className='p-12 sm:p-18 md:p-30  shadow-2xl bg-customLightBlue2 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                  onClick={() => openModal('Professor availability')}
                >
                  <img className='h-70 w-70 md:h-100 md:w-100' src={vector1} alt="" />
                  <span className="text-black text-sm md:text-lg 2xl:text-2xl font-semibold">Professor</span>
                </button>

                {/* 3rd Card (Course) */}
                <button onClick={() => {
                  navigate('/course');
                }}
                  className='p-12 sm:p-18 md:p-30  shadow-2xl bg-customLightBlue2 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                >
                  <img className='h-70 w-70 md:h-100 md:w-100' src={vector2} alt="" />
                  <span className="text-black text-sm md:text-lg 2xl:text-2xl font-semibold">Course</span>
                </button>

                {/* 4th Card (Room) */}
                <button onClick={() => {
                  navigate('/room');
                }}
                  className='p-12 sm:p-18 md:p-30  shadow-2xl bg-customLightBlue2 rounded-lg transition duration-500 hover:scale-110 flex flex-col justify-center items-center cursor-pointer'
                >
                  <img className='h-70 w-70 md:h-100 md:w-100' src={vector3} alt="" />
                  <span className="text-black text-sm md:text-lg 2xl:text-2xl font-semibold">Room</span>
                </button>
              </div>

              {/* Modal */}
              {isModalOpen && (
                <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-8 w-fit z-10 shadow-xl flex flex-col items-center justify-center transition-all duration-300 ${fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                  <button
                    className="absolute top-0 right-0 text-xl font-bold text-red-500"
                    onClick={closeModal}
                  >
                    <span className="font-bold m-9">x</span>
                  </button>
                  <h2 className="whitespace-nowrap text-3xl font-semibold text-ceuViolet text-center my-10">{modalContent}</h2>
                  <ul className="space-y-20 m-20 text-center">
                    {/* Display links based on modal content */}
                    {modalContent === 'Add/Configure Timetables' && (
                      <>
                        <li><a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white">View Timetables</a></li>
                        <li><a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white">Configure Timetables</a></li>
                      </>
                    )}
                    {modalContent === 'Professor availability' && (
                      <>
                        <li><a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white">View Availability</a></li>
                        <li><a href="#" className="text-customBlue1 border border-customBlue1 rounded-md px-4 py-2 hover:bg-customBlue1 hover:text-white">Set Availability</a></li>
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
