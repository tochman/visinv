import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNewInboxCount } from '../../features/supplierInbox/supplierInboxSlice';

/**
 * InboxBadge - Displays a badge with the count of new inbox items
 * Shows in the navigation next to "Inbox" link
 */
export default function InboxBadge() {
  const dispatch = useDispatch();
  const currentOrganization = useSelector((state) => state.organizations?.currentOrganization);
  const { newCount, newCountLoading } = useSelector((state) => state.supplierInbox);

  // Fetch count on mount and when organization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      dispatch(fetchNewInboxCount(currentOrganization.id));
    }
  }, [dispatch, currentOrganization?.id]);

  // Don't show badge if no new items or loading
  if (newCountLoading || newCount <= 0) {
    return null;
  }

  return (
    <span 
      className="ml-auto px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full"
      data-cy="inbox-badge"
    >
      {newCount > 99 ? '99+' : newCount}
    </span>
  );
}
