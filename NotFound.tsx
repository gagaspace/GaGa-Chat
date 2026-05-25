import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
<div className="min-h-screen flex items-center justify-center bg-[#0b0b0b] py-12">
      <div className="gchat-card max-w-md w-full p-8 rounded-[32px] text-center">
        <p className="text-sm uppercase tracking-[0.36em] text-green-600/90 mb-4">
          Page not found
        </p>
        <h1 className="text-[4.5rem] font-black text-white leading-none">404</h1>
        <p className="mt-4 text-green-700/70 text-base sm:text-lg">
          The page you’re looking for isn’t here. Try returning home to continue exploring GaGa Chat.
        </p>
        <Link
          to="/"
          className="inline-flex mt-8 items-center justify-center rounded-full px-8 py-3 text-sm font-semibold gchat-btn transition-all"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
