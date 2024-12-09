import React from 'react'
import { useNavigate } from 'react-router-dom';
import image2 from './Img/2.jpg'
import reject from './Img/reject.png'

const loginPage = () => {
  const navigate = useNavigate();
  return (
    <div
      className="bg-cover bg-no-repeat min-h-screen flex flex-col justify-between items-center overflow-y-auto"
      style={{ backgroundImage: `url(${image2})` }}
    >
      <section className='justify-center items-center text-center m-auto w-11/12 sm:w-9/12 md:w-5/12 lg:w-4/12'>
        <button id='logoBtn' className=" hover:scale-105 text-xl md:text-3xl lg:text-4xl font-bold text-blue-500 mb-50"
          onClick={() => navigate('/')}>EASE<span className="text-white">SCHEDULER</span></button>

        <form id='blueBox' className='bg-black/40 p-15 md:p-30 items-center justify-center flex-col space-y-7 rounded-md w-full'>
          <div>
            <label for="email" class="text-start block mb-2 text-sm font-medium text-gray-100">Email</label>
            <input type="email" name="email" id="email" class="text-gray-700 rounded-lg w-full p-8 md:p-15 bg-gray-100" placeholder="Email" required="" /> {/* for email*/}
          </div>
          <div>
            <label for="email" class="text-start block mb-2 text-sm font-medium text-gray-100">Password</label>
            <input type="password" name="passw" id="password" class="text-gray-700 rounded-lg w-full p-8 md:p-15 bg-gray-100" placeholder="*********" required="" /> {/* for password*/}

            <svg class="shrink-0 size-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
            <path class="hs-password-active:hidden" ></path>
          </div>
          <div className='flex justify-between space-y-4'>
            <div class="flex items-center">
              <input id="rememberBtn" aria-describedby="remember" type="checkbox" class="w-15 h-15 bg-white " required="" />
              <label id='rememberBtn' for="remember" className="text-white ml-5">Remember me</label>
            </div>
            <div class="text-sm items-center">
              <a href="#" id='forgotPassBtn'
                className="font-medium text-white hover:text-gray-300 focus:outline-none focus:underline transition ease-in-out duration-150">
                Forgot your password?
              </a>
            </div>
          </div>
          <button onClick={() => navigate('/homePage')} id='signInBtn' type="submit" class="w-full text-white bg-blue-700 hover:bg-gray-500 font-medium rounded-lg text-sm py-2.5 text-center">Sign in</button>
        </form>
      </section>
    </div>
  )
}

export default loginPage