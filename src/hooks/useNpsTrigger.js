import { useDispatch } from 'react-redux';
import { checkNpsEligibility, recordNpsShown } from '../features/nps/npsSlice';

/**
 * Custom hook to trigger NPS survey after successful actions
 * Usage: const triggerNps = useNpsTrigger();
 * Then call: triggerNps('invoice_created');
 */
export const useNpsTrigger = () => {
  const dispatch = useDispatch();

  const triggerNps = async (context) => {
    // Check if user is eligible
    const result = await dispatch(checkNpsEligibility(context));
    
    // If eligible, record as shown (which will display the modal)
    if (result.payload && result.payload.eligible) {
      dispatch(recordNpsShown(context));
    }
  };

  return triggerNps;
};
