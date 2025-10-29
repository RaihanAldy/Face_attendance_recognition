import React, { useState } from 'react';

const Settings = () => {
  const [profileData, setProfileData] = useState({
    name: 'Admin User',
    email: 'admin@example.com',
    phone: '+1234567890',
    role: 'Administrator',
    avatar: null
  });

  const [generalSettings, setGeneralSettings] = useState({
    notifications: true,
    emailAlerts: true,
    darkMode: true,
    language: 'en',
    timezone: 'UTC+7'
  });

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    // Handle profile update logic here
    console.log('Profile updated:', profileData);
  };

  const handleSettingsUpdate = (e) => {
    e.preventDefault();
    // Handle settings update logic here
    console.log('Settings updated:', generalSettings);
  };

  return (
    <div className="p-6 bg-navy-950 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-gray-200">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-navy-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-blue-100">Profile Settings</h2>
          <form onSubmit={handleProfileUpdate}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-100"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>

        {/* General Settings */}
        <div className="bg-navy-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-blue-100">General Settings</h2>
          <form onSubmit={handleSettingsUpdate}>
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={generalSettings.notifications}
                    onChange={(e) => setGeneralSettings({...generalSettings, notifications: e.target.checked})}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-blue-200">Enable Notifications</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={generalSettings.emailAlerts}
                    onChange={(e) => setGeneralSettings({...generalSettings, emailAlerts: e.target.checked})}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-blue-200">Email Alerts</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={generalSettings.darkMode}
                    onChange={(e) => setGeneralSettings({...generalSettings, darkMode: e.target.checked})}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-blue-200">Dark Mode</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Language</label>
                <select
                  value={generalSettings.language}
                  onChange={(e) => setGeneralSettings({...generalSettings, language: e.target.value})}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-100"
                >
                  <option value="en">English</option>
                  <option value="id">Bahasa Indonesia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Timezone</label>
                <select
                  value={generalSettings.timezone}
                  onChange={(e) => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                  className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-100"
                >
                  <option value="UTC+7">Jakarta (UTC+7)</option>
                  <option value="UTC+8">Singapore (UTC+8)</option>
                  <option value="UTC+9">Tokyo (UTC+9)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;