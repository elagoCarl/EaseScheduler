import React from 'react'
import image5 from './Img/5.jpg'
import calendar from './Img/Calendar.png'
import vector from './Img/Vector.png'
import vector1 from './Img/Vector1.png'
import vector2 from './Img/Vector2.png'
import vector3 from './Img/Vector3.png'
import profileBtn from './Img/ProfileBtn.png'
import { useNavigate } from 'react-router-dom'

const HomePage = () => {
  const navigate = useNavigate();
  const Buttons = (props) => {
    return (
      <button className="flex flex-col items-center bg-blue-100 hover:bg-blue-200 rounded-lg p-30">
        <img src={props.imgg} alt="Schedule" className="w-auto h-auto xl:w-200 xl:h-200 mb-0 md:w-auto sm:bottom-200 sm:h-100 md:h-auto" />
        <span className="text-blue-600 font-semibold">{props.name}</span>
      </button>
    )
  }
  return (
    <div
      className="bg-cover bg-center bg-no-repeat h-screen w-screen block md:flex items-center justify-between xl:px-200 lg:px-300 sm:px-60"
      style={{ backgroundImage: `url(${image5})` }}>
      {/* Left Section */}
      <div className="relative flex-col flex items-center">
        <button className="text-4xl xl:text-5xl font-bold text-blue-500 mb-[-1rem] ml-20 sm:ml-10 md:mb-0 xs:mt-100 sm:mt-150 md:mt-60 lg:mt-auto sm:text-5xl">
          EASE<span className="text-white"
            onClick={() => navigate('/')}>SCHEDULER</span>
        </button>
        <div className='hidden md:block'>
          <img src={calendar} alt="Calendar" className="w-auto h-auto md:w-auto md:h-auto" />
        </div>
      </div>

      {/* Right Section (Menu Buttons) */}
      <div className="relative flex flex-col items-center">
        {/* Profile Button */}
        <div className="self-end mb-4">
          <img
            src={profileBtn}
            alt="Profile"
            className="absolute xs:top-[-3rem] xs:right-20 sm:top-[-2rem] xl:top-[-2rem] w-auto h-auto sm:w-50 xl:w-auto cursor-pointer hover:opacity-50"
            onClick={() => console.log('Profile button clicked!')}
          />
        </div>

        <div className="bg-customLightBlue h-auto w-auto rounded-xl shadow-lg grid grid-cols-2 gap-20 p-60 xs:p-20 xs:mt-50 sm:p-20 sm:mt-60 xl:gap-20 mt-auto text-2xl font-bold">
          <Buttons imgg={vector} name={'Schedule'} />
          <Buttons imgg={vector1} name={'Professor'} />
          <Buttons imgg={vector2} name={'Subject'} />
          <Buttons imgg={vector3} name={'Room'} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
