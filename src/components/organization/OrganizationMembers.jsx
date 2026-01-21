import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useOrganization } from '../../contexts/OrganizationContext';
import organizationService from '../../services/organizationService';

export default function OrganizationMembers() {
  const { t } = useTranslation();
  const { currentOrganization } = useOrganization();
  
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('associate');
  const [inviting, setInviting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const isOwner = currentOrganization?.role === 'owner';

  useEffect(() => {
    if (currentOrganization?.id) {
      loadMembersAndInvitations();
    }
  }, [currentOrganization?.id]);

  const loadMembersAndInvitations = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        organizationService.getMembers(currentOrganization.id),
        organizationService.getInvitations(currentOrganization.id)
      ]);
      
      if (membersRes.error) {
        console.error('Error loading members:', membersRes.error);
      } else {
        setMembers(membersRes.data || []);
      }
      
      if (invitationsRes.error) {
        console.error('Error loading invitations:', invitationsRes.error);
      } else {
        setInvitations(invitationsRes.data || []);
      }
    } catch (err) {
      console.error('Error loading members:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    setInviting(true);
    setError(null);
    
    const { error: inviteError } = await organizationService.createInvitation(
      currentOrganization.id,
      inviteEmail,
      inviteRole
    );
    
    if (inviteError) {
      setError(inviteError.message);
      setInviting(false);
      return;
    }
    
    setSuccessMessage(t('organization.invitations.sent'));
    setTimeout(() => setSuccessMessage(''), 3000);
    setInviteEmail('');
    setInviteRole('associate');
    setShowInviteModal(false);
    setInviting(false);
    loadMembersAndInvitations();
  };

  const handleCancelInvitation = async (invitationId) => {
    const { error: deleteError } = await organizationService.deleteInvitation(invitationId);
    
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    
    setSuccessMessage(t('organization.invitations.deleted'));
    setTimeout(() => setSuccessMessage(''), 3000);
    loadMembersAndInvitations();
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm(t('common.confirmDelete'))) return;
    
    const { error: removeError } = await organizationService.removeMember(
      currentOrganization.id,
      userId
    );
    
    if (removeError) {
      setError(removeError.message);
      return;
    }
    
    loadMembersAndInvitations();
  };

  const handleUpdateRole = async (userId, newRole) => {
    const { error: updateError } = await organizationService.updateMemberRole(
      currentOrganization.id,
      userId,
      newRole
    );
    
    if (updateError) {
      setError(updateError.message);
      return;
    }
    
    loadMembersAndInvitations();
  };

  if (!currentOrganization) {
    return (
      <div className="text-gray-600 dark:text-gray-400">
        {t('organization.noOrganization')}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 rounded" data-cy="success-message">
          {successMessage}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('organization.members')}
          </h2>
          {isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              data-cy="invite-member-button"
            >
              {t('organization.invitations.inviteNew')}
            </button>
          )}
        </div>

        {/* Members List */}
        {loading ? (
          <div className="text-gray-600 dark:text-gray-400">{t('common.loading')}</div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.name')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('organization.email')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('organization.role')}
                    </th>
                    {isOwner && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common.actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {members.map((member) => (
                    <tr key={member.id} data-cy="member-row">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {member.profiles?.avatar_url ? (
                            <img
                              src={member.profiles.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full mr-3"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 mr-3 flex items-center justify-center">
                              <span className="text-gray-500 dark:text-gray-400 text-sm">
                                {(member.profiles?.full_name || member.profiles?.email || '?')[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-gray-900 dark:text-white">
                            {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {member.profiles?.email}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isOwner && member.role !== 'owner' ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            data-cy="role-select"
                          >
                            <option value="owner">{t('organization.roles.owner')}</option>
                            <option value="associate">{t('organization.roles.associate')}</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            member.role === 'owner' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {t(`organization.roles.${member.role}`)}
                          </span>
                        )}
                      </td>
                      {isOwner && (
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          {member.role !== 'owner' && (
                            <button
                              onClick={() => handleRemoveMember(member.user_id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                              data-cy="remove-member-button"
                            >
                              {t('common.remove')}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={isOwner ? 4 : 3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        {t('organization.noMembers')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pending Invitations */}
            {isOwner && invitations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  {t('organization.invitations.title')}
                </h3>
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md"
                      data-cy="invitation-row"
                    >
                      <div>
                        <span className="text-gray-900 dark:text-white">{invitation.email}</span>
                        <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          invitation.role === 'owner' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {t(`organization.roles.${invitation.role}`)}
                        </span>
                        <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                          {t('organization.invitations.pending')}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                        data-cy="cancel-invitation-button"
                      >
                        {t('organization.invitations.cancel')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowInviteModal(false)}>
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            {/* Modal Content */}
            <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-50">
              <form onSubmit={handleInvite}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {t('organization.invitations.inviteNew')}
                  </h3>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('organization.invitations.email')}
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="colleague@example.com"
                      required
                      data-cy="invite-email-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('organization.invitations.role')}
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="invite-role-select"
                    >
                      <option value="associate">{t('organization.roles.associate')}</option>
                      <option value="owner">{t('organization.roles.owner')}</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t(`organization.invitations.roleDescription.${inviteRole}`)}
                    </p>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    data-cy="send-invitation-button"
                  >
                    {inviting ? t('common.loading') : t('organization.invitations.send')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
