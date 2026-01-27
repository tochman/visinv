import { useState, useEffect } from 'react';
import { InvoiceEvent } from '../services/resources';

/**
 * Custom hook to fetch invoice audit trail
 * US-022-E: Audit Trail for Invoice Lifecycle
 * 
 * @param {string} invoiceId - Invoice ID to fetch events for
 * @returns {Object} { events, loading, error, refetch }
 */
export function useInvoiceAuditTrail(invoiceId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    if (!invoiceId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await InvoiceEvent.byInvoice(invoiceId);
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching invoice events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [invoiceId]);

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
  };
}
