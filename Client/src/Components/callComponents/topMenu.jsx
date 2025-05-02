import { useNavigate } from 'react-router-dom';
import Menu from "../Img/menu.png";
import PropTypes from 'prop-types';

const TopMenu = ({ toggleSidebar }) => {
  const navigate = useNavigate();

  return (
    <div className="w-full flex justify-end items-center px-4 py-2 bg-opacity-70 md:px-8">
      {/* Menu button - fixed on the left side */}
      <div className="fixed left-4 top-4 z-10">
        <img
          src={Menu}
          className="w-30 h-30 md:w-42 md:h-42 hover:scale-110 duration-300 cursor-pointer rounded"
          alt="menu button"
          onClick={toggleSidebar}
        />
      </div>

      {/* Logo/title - positioned at the top right, not fixed */}
      <button
        id="logoBtn"
        className="text-lg md:text-3xl sm:text-3xl xs:text-2xl font-bold text-blue-500"
        onClick={() => navigate("/homePage")}>
        EASE<span className="text-white hover:text-gray-500 duration-300">SCHEDULER</span>
      </button>
    </div>
  );
};

TopMenu.propTypes = {
  toggleSidebar: PropTypes.func.isRequired,
};

export default TopMenu;