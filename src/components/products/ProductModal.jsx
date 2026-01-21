import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { createProduct, updateProduct } from '../../features/products/productsSlice';

export default function ProductModal({ isOpen, onClose, product = null }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isEditing = !!product;

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    unit_price: product?.unit_price || '',
    unit: product?.unit || 'st',
    tax_rate: product?.tax_rate || 25.00,
    sku: product?.sku || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError(t('products.nameRequired'));
      return;
    }

    if (!formData.unit_price || parseFloat(formData.unit_price) < 0) {
      setError(t('products.priceRequired'));
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const dataToSubmit = {
        ...formData,
        name: formData.name.trim(),
        unit_price: parseFloat(formData.unit_price),
        tax_rate: parseFloat(formData.tax_rate),
      };

      if (isEditing) {
        await dispatch(updateProduct({ id: product.id, updates: dataToSubmit })).unwrap();
      } else {
        await dispatch(createProduct(dataToSubmit)).unwrap();
      }
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="product-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
          data-cy="modal-backdrop"
        />

        {/* Modal */}
        <div data-cy="product-modal-content" className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-2xl">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 data-cy="product-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? t('products.edit') : t('products.create')}
            </h2>
            <button
              onClick={onClose}
              data-cy="close-modal-button"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} data-cy="product-form" className="p-6 space-y-6">
            {error && (
              <div data-cy="product-form-error" className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Product Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.name')} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  data-cy="product-name-input"
                  placeholder={t('products.namePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('products.description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  data-cy="product-description-input"
                  placeholder={t('products.descriptionPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.unitPrice')} *
                  </label>
                  <input
                    type="number"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    data-cy="product-price-input"
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.unit')}
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    data-cy="product-unit-select"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="st">{t('products.units.st')}</option>
                    <option value="h">{t('products.units.h')}</option>
                    <option value="day">{t('products.units.day')}</option>
                    <option value="month">{t('products.units.month')}</option>
                    <option value="kg">{t('products.units.kg')}</option>
                    <option value="m">{t('products.units.m')}</option>
                    <option value="m2">{t('products.units.m2')}</option>
                    <option value="l">{t('products.units.l')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.taxRate')} (%)
                  </label>
                  <input
                    type="number"
                    name="tax_rate"
                    value={formData.tax_rate}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.01"
                    data-cy="product-tax-rate-input"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.sku')}
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    data-cy="product-sku-input"
                    placeholder={t('products.skuPlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                data-cy="cancel-product-button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                data-cy="save-product-button"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
