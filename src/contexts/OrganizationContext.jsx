import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import organizationService from '../services/organizationService';
import { setCurrentOrganization as setReduxOrganization } from '../features/organizations/organizationsSlice';

const OrganizationContext = createContext();

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync to Redux whenever currentOrganization changes
  useEffect(() => {
    dispatch(setReduxOrganization(currentOrganization));
  }, [currentOrganization, dispatch]);

  // Load organizations when user logs in
  useEffect(() => {
    if (user) {
      loadOrganizations();
    } else {
      setCurrentOrganization(null);
      setOrganizations([]);
      setLoading(false);
    }
  }, [user]);

  const loadOrganizations = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get all user's organizations
      const { data: orgs, error: orgsError } = await organizationService.getAll();
      
      if (orgsError) {
        setError(orgsError.message);
        setLoading(false);
        return;
      }

      setOrganizations(orgs || []);

      // Get default organization
      const { data: defaultOrg, error: defaultError } = await organizationService.getDefault();
      
      if (defaultError && defaultError.message !== 'No rows found') {
        console.error('Error loading default organization:', defaultError);
      }

      setCurrentOrganization(defaultOrg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (organizationId) => {
    const org = organizations.find((o) => o.id === organizationId);
    if (!org) return;

    setCurrentOrganization(org);
    
    // Set as default
    await organizationService.setDefault(organizationId);
  };

  const createOrganization = async (organizationData) => {
    const { data, error } = await organizationService.create(organizationData);
    
    if (error) {
      setError(error.message);
      return { data: null, error };
    }

    // Reload organizations to include the new one
    // This also fetches the default org, but we want to ensure
    // we switch to the newly created one
    const { data: orgs } = await organizationService.getAll();
    setOrganizations(orgs || []);
    
    // Find and switch to the newly created organization
    if (data?.id) {
      const newOrg = orgs?.find(o => o.id === data.id);
      if (newOrg) {
        setCurrentOrganization(newOrg);
        await organizationService.setDefault(data.id);
      }
    }
    
    setLoading(false);
    return { data, error: null };
  };

  const updateOrganization = async (id, updates) => {
    const { data, error } = await organizationService.update(id, updates);
    
    if (error) {
      setError(error.message);
      return { data: null, error };
    }

    // Update in local state
    setOrganizations((prev) =>
      prev.map((org) => (org.id === id ? { ...org, ...updates } : org))
    );

    if (currentOrganization?.id === id) {
      setCurrentOrganization((prev) => ({ ...prev, ...updates }));
    }

    return { data, error: null };
  };

  const deleteOrganization = async (id) => {
    const { error } = await organizationService.delete(id);
    
    if (error) {
      setError(error.message);
      return { error };
    }

    // Remove from local state
    setOrganizations((prev) => prev.filter((org) => org.id !== id));

    // If deleted current organization, switch to first available
    if (currentOrganization?.id === id) {
      const remaining = organizations.filter((org) => org.id !== id);
      if (remaining.length > 0) {
        await switchOrganization(remaining[0].id);
      } else {
        setCurrentOrganization(null);
      }
    }

    return { error: null };
  };

  const value = {
    currentOrganization,
    organizations,
    loading,
    error,
    switchOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    refreshOrganizations: loadOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export default OrganizationContext;
