import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { createProduct, updateProduct } from '../../features/products/productsSlice';
import { CURRENCIES } from '../../config/currencies';

export default function ProductModal({ isOpen, onClose, product = null }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isEditing = !!product;
  const organization = useSelector((state) => state.organizations.currentOrganization);
  const defaultCurrency = organization?.default_currency || 'SEK';

  // Initialize prices from product.prices array or with default currency
  const initializePrices = () => {
    const priceMap = {};
    if (product?.prices && product.prices.length > 0) {
      product.prices.forEach(p => {
        priceMap[p.currency] = p.price;
      });
    } else {
      // Start with default currency
      priceMap[defaultCurrency] = '';
    }
    return priceMap;
  };

  const { register, handleSubmit: handleFormSubmit, formState: { errors }, setValue, reset } = useForm({
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      unit: product?.unit || 'st',
      tax_rate: product?.tax_rate || 25.00,
      sku: product?.sku || '',
    }
  });

  const [prices, setPrices] = useState(initializePrices());
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const menuRef = useRef(null);

  // Update form when product changes (for edit mode)
  useEffect(() => {
    if (product) {
      reset({
        name: product.name || '',
        description: product.description || '',
        unit: product.unit || 'st',
        tax_rate: product.tax_rate || 25.00,
        sku: product.sku || '',
      });
    }
  }, [product, reset]);

  // Reinitialize prices when product changes (for edit mode)
  useEffect(() => {
    if (product) {
      const priceMap = {};
      if (product.prices && product.prices.length > 0) {
        product.prices.forEach(p => {
          priceMap[p.currency] = p.price;
        });
      } else {
        priceMap[defaultCurrency] = '';
      }
      setPrices(priceMap);
    }
  }, [product, defaultCurrency]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowCurrencyMenu(false);
      }
    };

    if (showCurrencyMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCurrencyMenu]);

  const handlePriceChange = (currency, value) => {
    setPrices({
      ...prices,
      [currency]: value,
    });
  };

  const handleAddCurrency = (currency) => {
    setPrices({
      ...prices,
      [currency]: '',
    });
    setShowCurrencyMenu(false);
  };

  const handleRemoveCurrency = (currency) => {
    const newPrices = { ...prices };
    delete newPrices[currency];
    setPrices(newPrices);
  };

  const getAvailableCurrencies = () => {
    return Object.keys(CURRENCIES).filter(code => !(code in prices));
  };

  const onSubmit = async (formData) => {
    // Validate at least one price is entered
    // Check for non-empty, non-zero prices
    const validPrices = Object.entries(prices).filter(([_, price]) => {
      const numPrice = parseFloat(price);
      return price !== '' && !isNaN(numPrice) && numPrice > 0;
    });
    
    if (validPrices.length === 0) {
      setError(t('products.atLeastOnePriceRequired'));
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const pricesArray = validPrices.map(([currency, price]) => ({
        currency,
        price: parseFloat(price),
      }));

      const dataToSubmit = {
        ...formData,
        name: formData.name.trim(),
        tax_rate: parseFloat(formData.tax_rate),
        prices: pricesArray,
      };

      if (isEditing) {
        await dispatch(updateProduct({ id: product.id, updates: dataToSubmit })).unwrap();
      } else {
        await dispatch(createProduct(dataToSubmit)).unwrap();
      }
      onClose();
    } catch (err) {
      setError(err.message || t('common.error'));
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
        <div data-cy="product-modal-content" className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
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

          <form onSubmit={handleFormSubmit(onSubmit)} data-cy="product-form" className="p-6 space-y-6">
            {(error || errors.name) && (
              <div data-cy="product-form-error" className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {errors.name?.message || error}
                </p>
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
                  {...register('name', { 
                    required: t('products.nameRequired'),
                    validate: value => value.trim().length > 0 || t('products.nameRequired')
                  })}
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
                  {...register('description')}
                  rows={3}
                  data-cy="product-description-input"
                  placeholder={t('products.descriptionPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>

              {/* Multi-Currency Prices */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('products.prices')} * <span className="text-xs text-gray-500">({t('products.atLeastOnePrice')})</span>
                </label>
                
                <div className="space-y-2">
                  {Object.entries(prices).map(([code, price]) => {
                    const isDefault = code === defaultCurrency;
                    const canRemove = Object.keys(prices).length > 1 && !isDefault;
                    
                    return (
                      <div key={code} className="flex items-center gap-2">
                        <label className="w-16 text-sm font-medium text-gray-600 dark:text-gray-400">
                          {code}
                        </label>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => handlePriceChange(code, e.target.value)}
                          min="0"
                          step="0.01"
                          data-cy={`product-price-${code.toLowerCase()}`}
                          placeholder="0.00"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCurrency(code)}
                            data-cy={`remove-price-${code.toLowerCase()}`}
                            className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title={t('common.remove')}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        {!canRemove && (
                          <div className="w-9" />
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Add Currency Button */}
                  {getAvailableCurrencies().length > 0 && (
                    <div className="relative" ref={menuRef}>
                      <button
                        type="button"
                        onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                        data-cy="add-currency-button"
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-sm transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t('products.addCurrency')}
                      </button>
                      
                      {/* Currency Selector Popover */}
                      {showCurrencyMenu && (
                        <div 
                          data-cy="currency-menu"
                          className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-lg z-10"
                        >
                          <div className="py-1">
                            {getAvailableCurrencies().map(code => (
                              <button
                                key={code}
                                type="button"
                                onClick={() => handleAddCurrency(code)}
                                data-cy={`add-currency-${code.toLowerCase()}`}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                {code} - {CURRENCIES[code].name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.unit')}
                  </label>
                  <select
                    {...register('unit')}
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
                    {t('products.taxRate')}
                  </label>
                  <select
                    {...register('tax_rate')}
                    data-cy="product-tax-rate-select"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="0">0% ({t('products.vatRates.exempt')})</option>
                    <option value="6">6% ({t('products.vatRates.reduced')})</option>
                    <option value="12">12% ({t('products.vatRates.reduced')})</option>
                    <option value="25">25% ({t('products.vatRates.standard')})</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('products.sku')}
                  </label>
                  <input
                    type="text"
                    {...register('sku')}
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
