import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const ErrorDisplay = ({ error }) => {
  const navigate = useNavigate();

  return (
    <div className="grid h-screen place-content-center bg-white px-4">
      <div className="text-center">
        <p className="text-2xl font-bold tracking-tight text-gray-900 sm:text-4xl">Oh Nooo!</p>
        <p className="mt-4 text-gray-500">Error: {error}</p>
        <a
          onClick={() => navigate('/')}
          className="mt-6 inline-block rounded bg-customBlue1 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring">
          Go Back Home
        </a>
      </div>
    </div>
  );
};
ErrorDisplay.propTypes = {
  error: PropTypes.string.isRequired,
};

export default ErrorDisplay;
