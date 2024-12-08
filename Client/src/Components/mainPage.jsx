import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import image from './Img/1.jpg';

const MainPage = () => {
  const navigate = useNavigate();

  // State to manage the modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Function to close the modal
  const closeModal = () => setIsModalOpen(false);

  // Function to open the modal
  const openModal = () => setIsModalOpen(true);

  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex flex-col justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${image})` }}
    >
      {/* Header with Login */}
      <header className="w-full p-6 flex justify-end">
        <button onClick={() => navigate('/loginPage')} className="p-20 text-white text-base md:text-xl font-semibold hover:text-blue-500">
          Login
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center">
        <div className="w-fit md:flex p-40">
          <div className=" w-full md:w-1/2">
            <p className="text-2xl md:text-5xl xl:text-6xl font-bold text-blue-500 mb-5">EASE<span className="text-white">SCHEDULER</span></p>
            <p className="mt-6 text-customWhite text-sm md:text-lg leading-relaxed">
              EaseScheduler simplifies academic scheduling by automating timetabling processes for CEU Makati, ensuring conflict-free schedules tailored to the institutional needs. Giving you a better resource management, reducing manual errors, and saving you time.
            </p>
          </div>
        </div>
      </main>

      {/* Footer with Contact Us */}
      <footer className="w-full p-10 flex justify-end">
        <button onClick={openModal} className="p-20 text-white text-sm md:text-xl font-semibold hover:text-blue-500">
          Contact Us
        </button>
      </footer>

      {/* Modal - Positioned at bottom right */}
      {isModalOpen && (
        <div className="fixed bottom-10 right-10 bg-customWhite rounded-lg shadow-lg p-6 max-w-sm z-50">
          <button
              className="absolute right-5 top-0 text-black rounded-md"
              onClick={closeModal}
            >
              &times;
            </button>
          <h2 className="text-lg md:text-2xl font-semibold text-gray-800 md:mb-4">Contact Us</h2>
          <p className="text-gray-600 mb-3 text-sm md:text-base">
            Please reach out to us at <a href="mailto:easescheduler@gmail.com" className="text-blue-500">easescheduler@gmail.com</a>.
          </p>
        </div>
      )}
    </div>
  );
};

export default MainPage;
