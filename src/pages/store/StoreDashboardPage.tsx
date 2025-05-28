import React from 'react';

const StoreDashboardPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Store Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Store metrics and overview will go here */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Sales Overview</h2>
          <p>Store dashboard content coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default StoreDashboardPage;