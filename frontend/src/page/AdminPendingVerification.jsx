import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Loader2,
  Filter,
  Search,
  ChevronDown,
  User,
  AlertCircle,
} from "lucide-react";
import MySwal from "sweetalert2";

const API_BASE_URL = "http://localhost:5000";

const AdminPendingVerification = () => {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  // Search & Selection State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchPendingRequests();
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
        console.log(`✅ Loaded ${data.length} employees`);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/attendance/pending?status=${filter}`
      );
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
        console.log(`✅ Loaded ${data.length} ${filter} requests`);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department &&
        emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setSearchTerm(employee.name);
    setShowDropdown(false);
  };

  const handleReview = async (requestId, action) => {
    // Validation for approve action
    if (action === "approve" && !selectedEmployee) {
      await MySwal.fire({
        title: "⚠️ Employee Not Selected",
        text: "Please select an employee from the dropdown before approving!",
        icon: "warning",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    // Confirmation dialog
    const confirmResult = await MySwal.fire({
      title: `${action === "approve" ? "Approve" : "Reject"} Request?`,
      html:
        action === "approve"
          ? `<div class="text-left">
             <p class="mb-2">You are about to approve attendance for:</p>
             <div class="bg-slate-700 p-3 rounded-lg mt-2">
               <p class="font-semibold text-blue-400">${
                 selectedEmployee.name
               }</p>
               <p class="text-sm text-slate-400">${
                 selectedEmployee.employee_id
               }</p>
               <p class="text-sm text-slate-400">${
                 selectedEmployee.department || "No Department"
               }</p>
             </div>
             <p class="mt-3 text-sm text-slate-400">This will record attendance with current timestamp.</p>
           </div>`
          : "Are you sure you want to reject this request?",
      icon: action === "approve" ? "question" : "warning",
      showCancelButton: true,
      confirmButtonText: action === "approve" ? "✓ Approve" : "✗ Reject",
      cancelButtonText: "Cancel",
      confirmButtonColor: action === "approve" ? "#10b981" : "#ef4444",
      cancelButtonColor: "#6b7280",
    });

    if (!confirmResult.isConfirmed) return;

    setReviewing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/attendance/pending/${requestId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            adminName: "Administrator",
            employee_id: selectedEmployee?.employee_id,
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        await MySwal.fire({
          title: "Success!",
          html:
            action === "approve"
              ? `<div class="text-center">
                 <p class="mb-2">Attendance approved for:</p>
                 <p class="font-semibold text-lg text-green-400">${result.employee_name}</p>
                 <p class="text-sm text-slate-400 mt-2">Action: ${result.attendance_action}</p>
                 <p class="text-sm text-slate-400">Status: ${result.attendance_status}</p>
               </div>`
              : "Request rejected successfully",
          icon: "success",
          timer: 3000,
          showConfirmButton: true,
          confirmButtonColor: "#10b981",
        });

        setSelectedRequest(null);
        setSelectedEmployee(null);
        setSearchTerm("");
        fetchPendingRequests();
      } else {
        await MySwal.fire({
          title: "Failed",
          text: result.error || `Failed to ${action} request`,
          icon: "error",
          confirmButtonColor: "#ef4444",
        });
      }
    } catch (error) {
      await MySwal.fire({
        title: "Network Error",
        text: "Please check your connection and try again.",
        icon: "error",
        confirmButtonColor: "#ef4444",
      });
      console.error("Review error:", error);
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      approved: "bg-green-500/20 text-green-400 border-green-500/30",
      rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    };

    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
    };

    const Icon = icons[status] || Clock;

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${styles[status]}`}
      >
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    try {
      return new Date(isoString).toLocaleString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const getPhotoUrl = (request) => {
    if (request.photo) return request.photo;
    if (request.photos?.front) return request.photos.front;
    if (request.photos?.photo) return request.photos.photo;
    if (typeof request.photos === "string") return request.photos;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Pending Verification
            </h1>
            <p className="text-slate-400">
              Review and approve manual attendance requests
            </p>
          </div>
          <RefreshButton
            onClick={() => fetchPendingRequests()}
            loading={loading}
            loadingText="Loading..."
            normalText="Refresh"
          />
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-white">
              Filter by Status
            </h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["pending", "approved", "rejected", "all"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-slate-400">Loading requests...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
            <Clock className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">
              No {filter} requests found
            </p>
            <p className="text-slate-500 text-sm">
              Manual attendance requests will appear here
            </p>
          </div>
        )}

        {/* Requests Grid */}
        {!loading && requests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => (
              <div
                key={request._id}
                className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all hover:shadow-xl"
              >
                <div className="mb-4">{getStatusBadge(request.status)}</div>

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {request.employees || request.employee_name || "Unknown"}
                  </h3>
                  <div className="text-sm text-slate-400">
                    <p>Submitted: {formatDateTime(request.submitted_at)}</p>
                  </div>
                </div>

                {request.status === "pending" && (
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setSearchTerm("");
                      setSelectedEmployee(null);
                    }}
                    className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Review
                  </button>
                )}

                {request.status !== "pending" && (
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="w-full px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div className="mt-6 text-center text-slate-400 text-sm">
            Showing {requests.length} {filter} request
            {requests.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 z-10">
              <h2 className="text-xl font-bold text-white">Review Request</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Submitted By</p>
                    <p className="text-white font-medium text-lg">
                      {selectedRequest.employees ||
                        selectedRequest.employee_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Request Time</p>
                    <p className="text-white">
                      {formatDateTime(
                        selectedRequest.timestamp?.$date ||
                          selectedRequest.timestamp
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Submitted</p>
                    <p className="text-white">
                      {formatDateTime(
                        selectedRequest.submitted_at?.$date ||
                          selectedRequest.submitted_at
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Status</p>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>
              </div>
              {/* 🆕 Employee Selection (Only for pending requests) */}
              {selectedRequest.status === "pending" && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-blue-400" />
                    <h3 className="text-white font-semibold">
                      Select Employee for Attendance
                    </h3>
                  </div>

                  {/* Search Bar with Dropdown */}
                  <div className="relative" ref={searchRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search employee name or ID..."
                        className="w-full pl-10 pr-10 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    </div>

                    {/* Selected Employee Badge */}
                    {selectedEmployee && !showDropdown && (
                      <div className="mt-2 flex items-center gap-2 p-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <User className="h-4 w-4 text-green-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-400">
                            {selectedEmployee.name}
                          </p>
                          <p className="text-xs text-green-400/70">
                            {selectedEmployee.employee_id} ·{" "}
                            {selectedEmployee.department}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedEmployee(null);
                            setSearchTerm("");
                          }}
                          className="text-green-400 hover:text-green-300"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    )}

                    {/* Dropdown List */}
                    {showDropdown && (
                      <div className="absolute z-20 w-full mt-2 bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                        {filteredEmployees.length === 0 ? (
                          <div className="p-4 text-center text-slate-400">
                            No employees found
                          </div>
                        ) : (
                          filteredEmployees.map((employee) => (
                            <button
                              key={employee.employee_id}
                              onClick={() => handleEmployeeSelect(employee)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-600 transition-colors border-b border-slate-600 last:border-b-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                  <User className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-white font-medium">
                                    {employee.name}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {employee.employee_id} ·{" "}
                                    {employee.department || "No Department"}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    💡 This will record attendance for the selected employee
                  </p>
                </div>
              )}
              {/* Photo */}
              {getPhotoUrl(selectedRequest) && (
                <div>
                  <p className="text-white font-semibold mb-3">
                    Verification Photo
                  </p>
                  <div className="flex justify-center bg-slate-900 rounded-lg p-4">
                    <img
                      src={getPhotoUrl(selectedRequest)}
                      alt="Verification"
                      className="max-w-full h-auto max-h-96 object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() =>
                        window.open(getPhotoUrl(selectedRequest), "_blank")
                      }
                    />
                  </div>
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Click to view full size
                  </p>
                </div>
              )}
              {/* Review Info (for already reviewed) */}
              {selectedRequest.reviewed_at && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">
                    Review Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Reviewed By</p>
                      <p className="text-slate-300">
                        {selectedRequest.reviewed_by}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Reviewed At</p>
                      <p className="text-slate-300">
                        {formatDateTime(selectedRequest.reviewed_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              \{/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setSelectedEmployee(null);
                    setSearchTerm("");
                  }}
                  disabled={reviewing}
                  className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  {selectedRequest.status === "pending" ? "Cancel" : "Close"}
                </button>

                {selectedRequest.status === "pending" && (
                  <>
                    <button
                      onClick={() =>
                        handleReview(selectedRequest._id, "reject")
                      }
                      disabled={reviewing}
                      className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:bg-red-400 flex items-center justify-center gap-2"
                    >
                      {reviewing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-5 w-5" />
                          Reject
                        </>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        handleReview(selectedRequest._id, "approve")
                      }
                      disabled={reviewing || !selectedEmployee}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:bg-green-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {reviewing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          Approve
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPendingVerification;
