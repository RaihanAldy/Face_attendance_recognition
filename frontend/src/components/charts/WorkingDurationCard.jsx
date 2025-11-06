export default function WorkingDurationCard({ data, color, isLoading }) {
  return (
    <div
      className={`bg-slate-900 border-l-4 ${color} shadow-sm rounded-lg p-4 flex flex-col`}
    >
      <h3 className="text-sm font-medium text-gray-200">
        Average Working Duration
      </h3>
      {isLoading ? (
        <div className="text-2xl font-bold text-gray-300 mt-2 animate-pulse">
          ...
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-300 mt-2">
            {data.average} hours
          </p>
          <div className="flex gap-4 mt-3 text-xs text-gray-400">
            <span>
              Longest:{" "}
              <span className="text-green-400 font-semibold">
                {data.longest}h
              </span>
            </span>
            <span className="text-gray-600">|</span>
            <span>
              Shortest:{" "}
              <span className="text-orange-400 font-semibold">
                {data.shortest}h
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
