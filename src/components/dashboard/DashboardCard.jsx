/**
 * DashboardCard - A reusable card component for the dashboard
 */
export default function DashboardCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
