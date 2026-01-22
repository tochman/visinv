import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import organizationService from '../../services/organizationService';

export default function AcceptInvitation() {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, initialized } = useSelector((state) => state.auth);
  
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError(t('organization.invitations.invalidLink'));
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await organizationService.getInvitationByToken(token);
      
      if (fetchError || !data) {
        setError(t('organization.invitations.expiredOrInvalid'));
        setLoading(false);
        return;
      }

      setInvitation(data);
      setLoading(false);
    };

    fetchInvitation();
  }, [token, t]);

  const handleAccept = async () => {
    if (!user) {
      // Redirect to sign in with return URL
      navigate(`/auth/signin?redirect=/invite/${token}`);
      return;
    }

    setAccepting(true);
    setError(null);

    const { data, error: acceptError } = await organizationService.acceptInvitation(token);

    if (acceptError) {
      setError(acceptError.message);
      setAccepting(false);
      return;
    }

    setSuccess(true);
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      // Force page reload to refresh organization context
      window.location.href = '/';
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" data-cy="loading-indicator">
        <div className="text-gray-600 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-sm shadow-xl p-8 text-center" data-cy="invitation-accepted">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('organization.invitations.accepted')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('organization.invitations.welcomeToOrg', { name: invitation?.organizations?.name })}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          {t('organization.invitations.redirecting')}
        </p>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-sm shadow-xl p-8 text-center" data-cy="invitation-error">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('organization.invitations.invalidInvitation')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error}
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {t('common.back')}
        </Link>
      </div>
    );
  }

  // Check if user email matches invitation email
  const emailMismatch = user && invitation && user.email?.toLowerCase() !== invitation.email?.toLowerCase();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-sm shadow-xl p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('organization.invitations.youreInvited')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('organization.invitations.invitedToJoin', { name: invitation?.organizations?.name })}
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-sm p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('organization.title')}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {invitation?.organizations?.name}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('organization.role')}
          </span>
          <span data-cy="invitation-role" className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            invitation?.role === 'owner' 
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
          }`}>
            {t(`organization.roles.${invitation?.role}`)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('organization.invitations.sentTo')}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {invitation?.email}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md" data-cy="error-message">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {emailMismatch && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md" data-cy="email-mismatch-warning">
          <p className="text-yellow-700 dark:text-yellow-400 text-sm">
            {t('organization.invitations.emailMismatch', { 
              invitedEmail: invitation?.email,
              currentEmail: user?.email 
            })}
          </p>
        </div>
      )}

      {!user ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
            {t('organization.invitations.signInToAccept')}
          </p>
          <Link
            to={`/auth/signin?redirect=/invite/${token}`}
            className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700"
          >
            {t('auth.signIn')}
          </Link>
          <Link
            to={`/auth/signup?redirect=/invite/${token}`}
            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-center rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('auth.signUp')}
          </Link>
        </div>
      ) : (
        <button
          onClick={handleAccept}
          disabled={accepting || emailMismatch}
          data-cy="accept-invitation-button"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {accepting ? t('common.loading') : t('organization.invitations.acceptInvitation')}
        </button>
      )}
    </div>
  );
}
