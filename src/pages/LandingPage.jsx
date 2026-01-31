import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  CheckCircleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ClockIcon,
  BoltIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { signUp as signUpAction, signIn as signInAction, signInWithGoogle } from '../features/auth/authSlice';
import ThemeToggle from '../components/common/ThemeToggle';
import TemplateCarousel from '../components/landing/TemplateCarousel';

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading: authLoading } = useSelector((state) => state.auth);
  
  const [authMode, setAuthMode] = useState('signup'); // 'signup' or 'signin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const result = authMode === 'signup' 
        ? await dispatch(signUpAction({ email, password }))
        : await dispatch(signInAction({ email, password }));
      
      if (!result.error) {
        navigate('/dashboard');
      } else {
        setError(result.error.message || t('landing.auth.authError'));
      }
    } catch (err) {
      setError(err.message || t('landing.auth.authError'));
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    await dispatch(signInWithGoogle());
  };

  const features = [
    {
      icon: DocumentTextIcon,
      title: t('landing.features.invoicing.title'),
      description: t('landing.features.invoicing.description'),
    },
    {
      icon: BoltIcon,
      title: t('landing.features.aiAutomation.title'),
      description: t('landing.features.aiAutomation.description'),
    },
    {
      icon: ChartBarIcon,
      title: t('landing.features.accounting.title'),
      description: t('landing.features.accounting.description'),
    },
    {
      icon: CurrencyDollarIcon,
      title: t('landing.features.supplierInbox.title'),
      description: t('landing.features.supplierInbox.description'),
    },
    {
      icon: UserGroupIcon,
      title: t('landing.features.auditApprovals.title'),
      description: t('landing.features.auditApprovals.description'),
    },
    {
      icon: ShieldCheckIcon,
      title: t('landing.features.compliance.title'),
      description: t('landing.features.compliance.description'),
    },
  ];

  const benefits = [
    {
      icon: ClockIcon,
      title: t('landing.benefits.saveTime.title'),
      description: t('landing.benefits.saveTime.description'),
    },
    {
      icon: CheckCircleIcon,
      title: t('landing.benefits.compliance.title'),
      description: t('landing.benefits.compliance.description'),
    },
    {
      icon: ChartBarIcon,
      title: t('landing.benefits.insights.title'),
      description: t('landing.benefits.insights.description'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header/Nav */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img 
                src="/svethna_logo.svg" 
                alt="Svethna" 
                className="h-8 w-auto dark:invert-0 invert"
              />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'sv' : 'en')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <GlobeAltIcon className="h-5 w-5" />
                <span className="hidden sm:inline">{i18n.language === 'en' ? 'Svenska' : 'English'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Value Prop */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                {t('landing.hero.title')}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                {t('landing.hero.subtitle')}
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                  {t('landing.hero.benefit1')}
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                  {t('landing.hero.benefit2')}
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                  {t('landing.hero.benefit3')}
                </li>
              </ul>
            </div>

            {/* Right: Auth Form */}
            <div className="bg-white dark:bg-gray-800 rounded-sm shadow-2xl p-8">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-2 px-4 rounded-sm font-medium transition-colors ${
                    authMode === 'signup'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('landing.auth.signUp')}
                </button>
                <button
                  onClick={() => setAuthMode('signin')}
                  className={`flex-1 py-2 px-4 rounded-sm font-medium transition-colors ${
                    authMode === 'signin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('landing.auth.signIn')}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('landing.auth.email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                    disabled={authLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('landing.auth.password')}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                    disabled={authLoading}
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authLoading ? t('common.loading') : authMode === 'signup' ? t('landing.auth.getStarted') : t('landing.auth.signIn')}
                </button>
              </form>

              {/* Temporarily disabled - will enable later
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                    {t('landing.auth.or')}
                  </span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full py-3 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 font-semibold rounded-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('landing.auth.googleSignIn')}
              </button>
              */}

              {authMode === 'signup' && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                  {t('landing.auth.termsAgreement')}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.features.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-gray-50 dark:bg-gray-800 rounded-sm hover:shadow-lg transition-shadow"
                >
                  <Icon className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('landing.benefits.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="text-center"
                >
                  <div className="inline-flex p-4 bg-white/10 rounded-full mb-4">
                    <Icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-blue-100">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Template Carousel */}
      <TemplateCarousel />

      {/* Trust/Security Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.trust.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <ShieldCheckIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t('landing.trust.security')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('landing.trust.securityDescription')}
              </p>
            </div>
            <div>
              <CheckCircleIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t('landing.trust.compliance')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('landing.trust.complianceDescription')}
              </p>
            </div>
            <div>
              <ShieldCheckIcon className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t('landing.trust.gdpr')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('landing.trust.gdprDescription')}
              </p>
            </div>
            <div>
              <BoltIcon className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t('landing.trust.infrastructure')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('landing.trust.infrastructureDescription')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t('landing.pricing.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 bg-gray-50 dark:bg-gray-800 rounded-sm border-2 border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('landing.pricing.free.title')}
              </h3>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {t('landing.pricing.free.price')}
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  {t('landing.pricing.free.feature1')}
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  {t('landing.pricing.free.feature2')}
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  {t('landing.pricing.free.feature3')}
                </li>
              </ul>
            </div>

            {/* Premium Tier */}
            <div className="relative p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-sm border-2 border-blue-600 shadow-xl transform scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="text-xs font-bold text-white bg-orange-500 px-4 py-1.5 rounded-full shadow-lg">
                  {t('landing.pricing.premium.comingSoon')}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 mt-2">
                {t('landing.pricing.premium.title')}
              </h3>
              <p className="text-4xl font-bold text-white mb-4">
                {t('landing.pricing.premium.price')}
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-white">
                  <CheckCircleIcon className="h-5 w-5" />
                  {t('landing.pricing.premium.feature1')}
                </li>
                <li className="flex items-center gap-2 text-white">
                  <CheckCircleIcon className="h-5 w-5" />
                  {t('landing.pricing.premium.feature2')}
                </li>
                <li className="flex items-center gap-2 text-white">
                  <CheckCircleIcon className="h-5 w-5" />
                  {t('landing.pricing.premium.feature3')}
                </li>
                <li className="flex items-center gap-2 text-white">
                  <CheckCircleIcon className="h-5 w-5" />
                  {t('landing.pricing.premium.feature4')}
                </li>
              </ul>
            </div>

            {/* Enterprise Tier */}
            <div className="p-8 bg-gray-50 dark:bg-gray-800 rounded-sm border-2 border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('landing.pricing.enterprise.title')}
              </h3>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {t('landing.pricing.enterprise.price')}
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  {t('landing.pricing.enterprise.feature1')}
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  {t('landing.pricing.enterprise.feature2')}
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  {t('landing.pricing.enterprise.feature3')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-8">
            {/* Logo and tagline */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src="/svethna_logo.svg" 
                  alt="Svethna" 
                  className="h-8 w-auto dark:invert-0 invert"
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('landing.footer.tagline')}
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                {t('landing.footer.product')}
              </h4>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="#pricing" 
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {t('landing.footer.pricing')}
                  </a>
                </li>
                <li>
                  <a 
                    href="#features" 
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {t('landing.footer.features')}
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {t('landing.footer.getStarted')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                {t('landing.footer.company')}
              </h4>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="https://communitaslabs.io" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {t('landing.footer.about')}
                  </a>
                </li>
                <li>
                  <a 
                    href="mailto:hey@communitaslabs.io"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {t('landing.footer.contact')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                {t('landing.footer.legal')}
              </h4>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="/privacy" 
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {t('landing.footer.privacy')}
                  </a>
                </li>
                <li>
                  <a 
                    href="/terms" 
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {t('landing.footer.terms')}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {t('landing.footer.communitasNote')} <a 
                href="https://communitaslabs.io" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Communitas Labs Inc
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
