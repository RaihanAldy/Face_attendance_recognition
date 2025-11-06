import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, Eye, RefreshCw, Loader2, Filter } from "lucide-react";

const API_BASE_URL = "http://localhost:5000";

const AdminPendingVerification = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchPendingRequests();
  }, [filter]);
  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/pending?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
        console.log(`✅ Loaded ${data.length} ${filter} requests`, data);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId, action) => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) {
      return;
    }

    setReviewing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/pending/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminName: "Administrator",
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Request ${action}d successfully!`);
        setSelectedRequest(null);
        setAdminNotes("");
        fetchPendingRequests();
      } else {
        alert(result.error || `Failed to ${action} request`);
      }
    } catch (error) {
      alert("Network error. Please try again.");
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
      <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${styles[status]}`}>
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

  // Helper function to get the photo URL
  const getPhotoUrl = (request) => {
    console.log("Request data:", request);
    // Try different possible photo properties
    if (request.photo) return request.photo;
    if (request.photos?.front) return request.photos.front;
    if (request.photos?.photo) return request.photos.photo;
    if (typeof request.photos === 'string') return request.photos;
    return null;
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Pending Verification</h1>
            <p className="text-slate-400">Review and approve manual attendance requests</p>
          </div>
          <button
            onClick={fetchPendingRequests}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-blue-400 transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-white">Filter by Status</h3>
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
            <p className="text-slate-400 text-lg mb-2">No {filter} requests found</p>
            <p className="text-slate-500 text-sm">Manual attendance requests will appear here</p>
          </div>
        )}

        {/* Requests Grid - Simple Card View */}
        {!loading && requests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => {
              return (
                <div
                  key={request._id}
                  className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all hover:shadow-xl"
                >
                  {/* Status Badge */}
                  <div className="mb-4">
                    {getStatusBadge(request.status)}
                  </div>

                  {/* Info */}
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {request.employees || request.employee_name || "Unknown"}
                    </h3>
                    <div className="text-sm text-slate-400">
                      <p>Submitted: {formatDateTime(request.submitted_at)}</p>
                    </div>
                  </div>

                  {/* Photos */}
                  <div className="mb-4">
                    <p className="text-sm text-slate-400 mb-3">Verification Photos:</p>
                    <div className="grid grid-cols-3 gap-4">
                      {["front", "left", "right"].map((angle) => {
                        const src = request.photos?.[angle] || getPhotoUrl(request);
                        if (!src) return null;
                        return (
                          <div key={angle} className="space-y-2">
                            <img
                              src={src}
                              alt={`${angle} face`}
                              className="w-full h-40 object-cover rounded-lg border border-slate-600 cursor-pointer hover:border-blue-500 transition-colors"
                              onClick={() => src && window.open(src, "_blank")}
                            />
                            <p className="text-xs text-slate-400 text-center capitalize">
                              {angle} Profile
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {request.status === "pending" ? (
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Review
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="w-full px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        {!loading && requests.length > 0 && (
          <div className="mt-6 text-center text-slate-400 text-sm">
            Showing {requests.length} {filter} request{requests.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Review</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Employee</p>
                    <p className="text-white font-medium text-lg">
                      {selectedRequest.employees || selectedRequest.employee_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Employee ID</p>
                    <p className="text-blue-400 font-medium">{selectedRequest.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Request Time</p>
                    <p className="text-white">{formatDateTime(selectedRequest.request_timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Submitted</p>
                    <p className="text-white">{formatDateTime(selectedRequest.submitted_at)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 mb-1">Reason</p>
                    <p className="text-white">{selectedRequest.reason || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 mb-1">Status</p>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div>
                <p className="text-white font-semibold mb-3">Verification Photos</p>
                <div className="grid grid-cols-3 gap-4">
                  {["front", "left", "right"].map((angle) => {
                    const src = selectedRequest.photos?.[angle] || getPhotoUrl(selectedRequest);
                    if (!src) return null;
                    return (
                      <div key={angle}>
                        <img
                          src={src}
                          alt={angle}
                          className="w-full h-48 object-cover rounded-lg border border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => src && window.open(src, "_blank")}
                        />
                        <p className="text-xs text-slate-400 text-center mt-2 capitalize">
                          {angle} Profile
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setAdminNotes("");
                  }}
                  disabled={reviewing}
                  className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  {selectedRequest.status === "pending" ? "Cancel" : "Close"}
                </button>
                
                {selectedRequest.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleReview(selectedRequest._id, "reject")}
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
                      onClick={() => handleReview(selectedRequest._id, "approve")}
                      disabled={reviewing}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:bg-green-400 flex items-center justify-center gap-2"
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