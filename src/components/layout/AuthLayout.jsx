import { Outlet } from 'react-router-dom';

import ThemeToggle from '../common/ThemeToggle';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">VisInv</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Professional Invoice Management</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
