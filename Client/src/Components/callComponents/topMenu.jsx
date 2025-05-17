import { useNavigate } from 'react-router-dom';
import Menu from "../Img/menu.png";
import PropTypes from 'prop-types';

// Make sure the component name starts with an uppercase letter (TopMenu instead of topMenu)
const TopMenu = ({ toggleSidebar }) => {
  const navigate = useNavigate();

  return (
    <div className="absolute top-15 flex justify-between items-center px-4 py-2 w-full bg-opacity-70 md:px-8">
      
      <img
        src={Menu}
        className="w-15 h-15 mr-12 md:w-40 md:h-40 sm:h-40 sm:w-40 xs:h-30 xs:w-30 hover:scale-110 duration-300 cursor-pointer rounded"
        alt="menu button"
        onClick={toggleSidebar} // Call toggleSidebar function passed via props
      />
      <button
        id="logoBtn"
        className="text-lg ml-12 md:text-3xl sm:text-3xl xs:text-2xl font-bold text-blue-500"
        onClick={() => navigate("/homePage")}>
        EASE<span className="text-white hover:text-gray-500 duration-300">SCHEDULER</span>
      </button>
    </div>
  );
}
TopMenu.propTypes = {
  toggleSidebar: PropTypes.func.isRequired,
};

export default TopMenu;