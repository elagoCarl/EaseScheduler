import { Loader2 } from "lucide-react";
const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 flex justify-center items-center bg-white z-50">
      <Loader2 className="rounded-full h-50 w-50  animate-spin transition stroke-blue-500" />
    </div>
  );
};

export default LoadingSpinner;
