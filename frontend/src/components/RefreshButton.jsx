import React from "react";
import { RefreshCw } from "lucide-react";

const RefreshButton = ({
  onClick,
  loading = false,
  loadingText = "Loading...",
  normalText = "Refresh",
  className = "",
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex flex-row items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 cursor-pointer text-white rounded-lg disabled:bg-blue-400 transition-colors duration-200 ${className}`}
      {...props}
    >
      <RefreshCw className={`${loading ? "animate-spin" : ""} mr-2 w-6 h-6 `} />
      {loading ? loadingText : normalText}
    </button>
  );
};

export default RefreshButton;
