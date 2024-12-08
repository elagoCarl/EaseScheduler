import React from 'react';
import { useNavigate } from 'react-router-dom';
import Menu from "../Img/menu.png";

// Make sure the component name starts with an uppercase letter (TopMenu instead of topMenu)
const TopMenu = ({ toggleSidebar }) => {
  const navigate = useNavigate();

  return (
    <div className="absolute top-0 left-0 flex justify-between items-center px-4 py-2 w-full bg-opacity-70 md:px-8">
      <button
        id="logoBtn"
        className="text-lg md:text-3xl font-bold text-blue-500"
        onClick={() => navigate("/")}>
        EASE<span className="text-white">SCHEDULER</span>
      </button>
      <img
        src={Menu}
        className="w-15 h-15 md:w-40 md:h-40 hover:scale-110 cursor-pointer rounded"
        alt="menu button"
        onClick={toggleSidebar} // Call toggleSidebar function passed via props
      />
    </div>
  );
}

export default TopMenu;
