import React, { useState } from 'react';
import { Menu, Bell, User, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Badge from '../ui/Badge';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Mock notifications - would be from an API
  const notifications = [
    { id: 1, message: 'New project has been assigned to you', time: '2 minutes ago' },
    { id: 2, message: 'Client changed the visit date', time: '1 hour ago' },
    { id: 3, message: 'New message from client', time: '3 hours ago' },
  ];

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  return (
    <div className="bg-white text-[#0A1629] py-3 h-[72px] px-4 shadow-md z-10 sticky top-0 flex md:justify-end justify-between items-center">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <button
            className="lg:hidden flex items-center mr-4 focus:outline-none"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          
          <h1 className="text-xl font-semibold lg:hidden">Pazzi</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button 
              className="relative p-2 rounded-full hover:bg-blue-800 transition-colors"
              onClick={toggleNotifications}
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs">
                {notifications.length}
              </span>
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg overflow-hidden z-50">
                <div className="py-2 px-3 bg-gray-100 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                  <button 
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setShowNotifications(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-3 hover:bg-gray-50 cursor-pointer">
                      <p className="text-sm text-gray-800">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                    </div>
                  ))}
                </div>
                <div className="py-2 px-3 bg-gray-100 text-center">
                  <button className="text-sm text-teal-600 hover:text-teal-800">
                    Mark all as read
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* User Menu */}
          <div className="relative">
            <button 
              className="flex items-center space-x-2 focus:outline-none"
              onClick={toggleUserMenu}
            >
              <div className="h-8 w-8 rounded-full border-2 border-[#242E3D] flex items-center justify-center">
                <User size={18} />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user?.name || 'User'}</p>
                <p className="text-xs opacity-75 capitalize">{user?.role || 'User'}</p>
              </div>
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Your Profile
                </a>
                <a href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Settings
                </a>
                <div className="border-t border-gray-100"></div>
                <a href="/logout" className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                  Sign out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;