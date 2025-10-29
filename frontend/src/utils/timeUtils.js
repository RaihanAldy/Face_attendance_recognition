export const formatDateTime = (timestamp) => {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return isNaN(date)
    ? "-"
    : date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
};

export const calculateWorkingHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return "-";
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end - start;
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
};
