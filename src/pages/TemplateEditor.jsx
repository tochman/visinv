import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  fetchTemplate,
  createTemplate,
  updateTemplate,
  clearCurrentTemplate
} from '../features/invoiceTemplates/invoiceTemplatesSlice';
import TemplateEditor from '../components/templates/TemplateEditor';

export default function TemplateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  
  const { currentTemplate, loading, error } = useSelector(state => state.invoiceTemplates);
  const isEditing = id && id !== 'new';

  useEffect(() => {
    if (isEditing) {
      dispatch(fetchTemplate(id));
    } else {
      dispatch(clearCurrentTemplate());
    }
    
    return () => {
      dispatch(clearCurrentTemplate());
    };
  }, [dispatch, id, isEditing]);

  const handleSave = async (templateData) => {
    try {
      if (isEditing) {
        await dispatch(updateTemplate({ id, ...templateData })).unwrap();
      } else {
        await dispatch(createTemplate(templateData)).unwrap();
      }
      navigate('/templates');
    } catch (err) {
      console.error('Failed to save template:', err);
      throw err;
    }
  };

  const handleCancel = () => {
    navigate('/templates');
  };

  if (loading && isEditing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">
          {t('common.loading')}...
        </div>
      </div>
    );
  }

  if (error && isEditing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 dark:text-red-400">
          {t('common.error')}: {error}
        </div>
      </div>
    );
  }

  return (
    <TemplateEditor
      template={isEditing ? currentTemplate : null}
      onSave={handleSave}
      onCancel={handleCancel}
      invoiceData={null}
    />
  );
}
