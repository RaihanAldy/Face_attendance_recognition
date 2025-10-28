export default function TableContainer({ children, title }) {
  return (
    <div className="bg-navy-900 rounded-lg shadow-lg border border-navy-800">
      {title && (
        <div className="px-6 py-4 border-b border-navy-800">
          <h3 className="text-lg font-semibold text-sky-400">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="align-middle inline-block min-w-full">
          {children}
        </div>
      </div>
    </div>
  );
}