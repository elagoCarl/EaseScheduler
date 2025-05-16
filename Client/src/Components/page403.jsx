const Page403 = () => {
  return (
    <div className="flex justify-center items-center h-screen bg-gray-900 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-white">403</h1>
        <h2 className="text-2xl font-semibold text-white">Access Denied</h2>
        <p className="text-2xl md:text-2xl font-light text-white mt-4">
          You don&apos;t have permission to access this page.
          <br />
          Please contact your administrator or go back to{" "}
          <a href="/homepage" className="text-blue-500 hover:underline duration-300">
            Home
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default Page403;
