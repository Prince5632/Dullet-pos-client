import React from 'react';

const UserDetailsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">User Details</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>View user details and activity.</p>
          </div>
          <div className="mt-5">
            <p className="text-gray-600">User details view coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsPage;
