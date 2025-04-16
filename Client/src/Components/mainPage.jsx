import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import image from './Img/1.jpg';

const MainPage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const closeModal = () => setIsModalOpen(false);
  const openModal = () => setIsModalOpen(true);
  const modalRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal();
      }
    };
    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } return () => {
      document.addEventListener('mousedown', handleClickOutside)
    };
  }, [isModalOpen])

  return (
    <div
      className="bg-cover bg-center bg-no-repeat min-h-screen flex flex-col justify-between"
      style={{ backgroundImage: `url(${ image })` }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>

      {/* Content container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header with Login */}
        <header className="w-full px-6 py-4 md:px-10 md:py-6 flex justify-end">
          <button
            onClick={() => navigate('/loginPage')}
            className="text-white text-base md:text-xl lg:text-2xl p-20 font-semibold hover:text-blue-500 transition duration-300"
          >
            Login
          </button>
        </header>

        {/* Main Content - Centered with reasonable padding */}
        <main className="flex-grow flex items-center px-6 md:px-16 lg:px-24">
          <div className="max-w-3xl">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold">
              <span className="text-blue-500">EASE</span>
              <span className="text-white">SCHEDULER</span>
            </h1>
            <p className="mt-6 text-white text-sm md:text-lg leading-relaxed max-w-2xl">
              EaseScheduler simplifies academic scheduling by automating timetabling processes for CEU Makati, ensuring conflict-free schedules tailored to the institutional needs. Giving you a better resource management, reducing manual errors, and saving you time.
            </p>
          </div>
        </main>

        {/* Footer with Contact Us */}
        <footer className="w-full px-6 py-4 md:px-10 md:py-6 flex justify-end">
          <button
            onClick={openModal}
            className="text-white text-sm md:text-xl lg:text-2xl p-30 font-semibold hover:text-blue-500 transition duration-300"
          >
            Contact Us
          </button>
        </footer>
      </div>

      {/* Modal with Overlay */}
      {isModalOpen && (
        <>
          {/* Dark overlay covering the entire screen */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeModal}
          ></div>

          {/* Modal content */}
          <div
            ref={modalRef}
            className="fixed bottom-10 right-10 bg-white rounded-lg shadow-lg p-6 max-w-sm z-50"
          >
            <button
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"
              onClick={closeModal}
            >
            </button>
            <h2 className="text-lg md:text-2xl font-semibold text-gray-800 mb-3">Contact Us</h2>
            <p className="text-gray-600 text-sm md:text-base">
              Please reach out to us at <a href="mailto:easescheduler@gmail.com" className="text-blue-500 hover:underline">easescheduler@gmail.com</a>.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default MainPage;
