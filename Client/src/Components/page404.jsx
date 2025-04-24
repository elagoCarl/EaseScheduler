import { useNavigate } from 'react-router-dom';

const Page404 = () => {
  const navigate = useNavigate();

  return (
    <div className='flex justify-center items-center h-screen bg-black/85'>
      <div className='text-center'>
        {/* <Frown className ="mx-auto text-gray-400" size= {120}/> */}
        <h1 className='text-9xl font-bold text-gray-300'>404</h1>
        <h2 className='text-2xl font-semibold text-gray-300'></h2>
        <p className='text-2xl md:text-2xl font-light text-gray-300 mt-4'>
          The page you are looking for doesn&apos;t exist.
        </p>
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/homepage')}
          className='mt-6 px-10 py-4 bg-blue-600 text-white text-lg font-semibold rounded-md hover:bg-blue-800 transition duration-300 border-none'>
          Go Back?
        </button>
      </div>
    </div>
  )
}

export default Page404