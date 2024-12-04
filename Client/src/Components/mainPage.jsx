import React from 'react';
import { useNavigate } from 'react-router-dom';
import image from './Img/1.jpg';

const mainPage = () => {
  const navigate = useNavigate();
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
          EaseScheduler simplifies academic scheduling by automating timetabling processes for CEU-LV, ensuring conflict-free schedules tailored to the institutional needs. Giving you a better resource management, reducing manual errors, and saving you time.
        </h1>
      </section>
      <div id='contactBtn' className="absolute lg:bottom-70 lg:right-60 bottom-30 right-30">
        <button className="text-gray-200 text-xl font-semibold hover:text-blue-500">
          Contact Us
        </button>
      </div>
    </div>
  );
};

export default mainPage;
