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
      className="bg-cover bg-center bg-no-repeat h-screen w-screen flex items-center justify-start px-40"
      style={{ backgroundImage: `url(${image})` }}
    >
      <div id='loginBtn' className="absolute lg:top-80 lg:right-80 top-30 right-30 flex justify-between items-center">
        <button className="text-white text-xl font-semibold hover:text-blue-500"
          onClick={() => navigate('/loginPage')}>Login</button>
      </div>

      <section className="text-start max-w-4xl">
        <p className="text-5xl xl:text-6xl font-bold text-blue-500 mb-5">EASE<span className="text-white">SCHEDULER</span></p>
        <h1 className="text-2xl text-white leading-relaxed">
          EaseScheduler simplifies academic scheduling by automating timetabling processes for CEU Makati, ensuring conflict-free schedules tailored to the institutional needs. Giving you a better resource management, reducing manual errors, and saving you time.
        </h1>
      </section>
      <div id='contactBtn' className="absolute lg:bottom-70 lg:right-60 bottom-30 right-30">
        <button className="text-gray-200 text-xl font-semibold hover:text-blue-500" onClick={openModal}>
          Contact Us
        </button>
      </div>

      {/* Modal - Positioned at bottom right */}
      {isModalOpen && (
        <div className="fixed bottom-10 right-10 bg-white rounded-lg shadow-lg p-6 max-w-sm w-full z-50">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Us</h2>
          <p className="text-gray-600 mb-4">
            Please reach out to us at <a href="mailto:easescheduler@gmail.com" className="text-blue-500">easescheduler@gmail.com</a>.
          </p>
          <div className="flex justify-end">
            <button
              className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
