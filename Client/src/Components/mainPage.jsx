import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import image from './Img/7.jpg';

const MainPage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef(null);

  const closeModal = () => setIsModalOpen(false);
  const openModal = () => setIsModalOpen(true);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen]);

  return (
    <div
      className="bg-cover bg-center bg-no-repeat min-h-screen flex flex-col justify-between bg-gray-800"
      
    >
      <div className="absolute inset-0 bg-gray-900"></div>

      {/* Content container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header with Login */}
        <header className="w-full px-4 py-3 md:px-10 md:py-6 flex justify-end">
          <button
            onClick={() => navigate('/loginPage')}
            className="text-white text-base md:text-xl font-semibold hover:text-blue-500 transition duration-300 p-20"
          >
            Login
          </button>
        </header>

        {/* Main Content - Centered with proper mobile spacing */}
        <main className="flex-grow flex items-center px-4 md:px-16 lg:px-24">
          <div className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold">
              <span className="text-blue-500">EASE</span>
              <span className="text-white">SCHEDULER</span>
            </h1>
            <p className="mt-4 md:mt-6 text-white text-sm sm:text-base md:text-lg leading-relaxed">
              EaseScheduler simplifies academic scheduling by automating timetabling processes for CEU Makati, ensuring conflict-free schedules tailored to the institutional needs. Giving you a better resource management, reducing manual errors, and saving you time.
            </p>
          </div>
        </main>

        {/* Footer with Contact Us */}
        <footer className="w-full px-4 py-3 md:px-10 md:py-6 flex justify-end">
          <button
            onClick={openModal}
            className="text-white text-sm md:text-xl font-semibold hover:text-blue-500 transition duration-300 p-20"
          >
            Contact Us
          </button>
        </footer>
      </div>

      {/* Modal with Overlay - Responsive positioning */}
      {isModalOpen && (
        <>
          {/* Dark overlay for better visibility */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeModal}
          ></div>

          {/* Modal content - Centered on mobile, bottom-right on larger screens */}
          <div
            ref={modalRef}
            className="fixed z-50 bg-white rounded-lg shadow-lg p-4 md:p-12 w-4/6 max-w-md
                      top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                      md:translate-y-0 md:translate-x-0 md:top-auto md:left-auto
                      md:bottom-10 md:right-10"
          >
            <h2 className="text-lg md:text-2xl font-bold text-gray-800 mb-2 md:mb-3">Contact Us</h2>
            <p className="text-gray-800 text-sm md:text-base">
              Please reach out to us at <a href="mailto:easescheduler@gmail.com" className="text-blue-500 hover:underline">Easescheduler@gmail.com</a>.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default MainPage;