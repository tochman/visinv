/**
 * Framework Utility Functions
 * US-283, US-284, US-285: Swedish Accounting Framework logic
 * 
 * Pure utility functions for framework recommendations and validation.
 * These do NOT interact with database - they are calculation/business logic only.
 */

/**
 * Recommend appropriate K-regelverk based on company characteristics
 * @param {Object} companyInfo - Company information
 * @param {number} companyInfo.revenue - Annual revenue in SEK
 * @param {number} companyInfo.employees - Number of employees
 * @param {number} companyInfo.balance - Balance sheet total in SEK
 * @param {boolean} companyInfo.isListed - Whether company is publicly listed
 * @returns {Object} Recommendation with framework and reason
 */
export function recommendFramework(companyInfo = {}) {
  const { revenue = 0, employees = 0, balance = 0, isListed = false } = companyInfo;

  // K4: Listed companies must use IFRS
  if (isListed) {
    return {
      framework: 'k4',
      reason: 'Publicly listed companies are required to use K4 (IFRS standards)'
    };
  }

  // K1: Microcompanies (very small)
  if (revenue < 3000000 && employees < 3 && balance < 1500000) {
    return {
      framework: 'k1',
      reason: 'Your company qualifies for K1 (simplified accounting for microcompanies)'
    };
  }

  // K3: Larger companies
  if (revenue > 80000000 || employees > 50) {
    return {
      framework: 'k3',
      reason: 'Your company size suggests K3 (detailed reporting for larger companies)'
    };
  }

  // K2: Default for most Swedish SMBs
  return {
    framework: 'k2',
    reason: 'K2 is the standard framework for Swedish small and medium businesses'
  };
}

/**
 * Validate if a company is eligible for a specific framework
 * @param {string} framework - Framework to validate (k1/k2/k3/k4)
 * @param {Object} companyInfo - Company information
 * @returns {Object} Validation result with isValid and warnings
 */
export function validateFrameworkEligibility(framework, companyInfo = {}) {
  const { revenue = 0, employees = 0, balance = 0, isListed = false, accountingMethod = 'accrual' } = companyInfo;
  const warnings = [];
  let isValid = true;

  switch (framework) {
    case 'k1':
      // K1 has strict size limits
      if (revenue >= 3000000) {
        warnings.push('Revenue exceeds K1 limit (3M SEK). Consider K2.');
        isValid = false;
      }
      if (employees >= 3) {
        warnings.push('Employee count exceeds K1 limit (3 employees). Consider K2.');
        isValid = false;
      }
      if (balance >= 1500000) {
        warnings.push('Balance sheet exceeds K1 limit (1.5M SEK). Consider K2.');
        isValid = false;
      }
      if (isListed) {
        warnings.push('Listed companies cannot use K1. K4 is required.');
        isValid = false;
      }
      break;

    case 'k2':
      // K2 is the default - almost always valid
      if (isListed) {
        warnings.push('Listed companies must use K4 (IFRS).');
        isValid = false;
      }
      if (revenue > 80000000) {
        warnings.push('Large revenue (>80M SEK). Consider K3 for better reporting capabilities.');
        // Note: This is a suggestion, not a hard requirement
      }
      break;

    case 'k3':
      // K3 is for larger companies but can be chosen voluntarily
      if (isListed) {
        warnings.push('Listed companies must use K4 (IFRS), not K3.');
        isValid = false;
      }
      if (revenue < 10000000) {
        warnings.push('K3 may be overly complex for smaller companies. K2 is typically sufficient.');
        // Note: This is a suggestion, companies can voluntarily choose K3
      }
      break;

    case 'k4':
      // K4 is IFRS - only for listed companies or voluntary adoption
      if (!isListed && revenue < 50000000) {
        warnings.push('K4 (IFRS) is very complex and typically only used by listed companies or large international groups.');
        // Note: Companies can voluntarily adopt K4, but it's rare
      }
      break;

    default:
      warnings.push('Unknown framework. Please select K1, K2, K3, or K4.');
      isValid = false;
  }

  // Cash accounting method restrictions
  if (accountingMethod === 'cash') {
    if (revenue >= 3000000) {
      warnings.push('Cash accounting (kontantmetoden) is only allowed for companies with revenue < 3M SEK.');
      isValid = false;
    }
    if (framework === 'k3' || framework === 'k4') {
      warnings.push('Cash accounting is not allowed with K3 or K4 frameworks.');
      isValid = false;
    }
  }

  return {
    isValid,
    warnings,
    framework
  };
}

/**
 * Get display name for framework
 * @param {string} framework - Framework code (k1/k2/k3/k4)
 * @returns {string} Display name
 */
export function getFrameworkName(framework) {
  const names = {
    k1: 'K1 - Microcompany',
    k2: 'K2 - Small/Medium',
    k3: 'K3 - Larger Companies',
    k4: 'K4 - Listed Companies'
  };
  return names[framework] || framework;
}

/**
 * Check if accounting method is allowed for framework and company size
 * @param {string} method - accrual or cash
 * @param {string} framework - k1/k2/k3/k4
 * @param {number} revenue - Annual revenue in SEK
 * @returns {boolean} Whether method is allowed
 */
export function isAccountingMethodAllowed(method, framework, revenue = 0) {
  if (method === 'accrual') {
    return true; // Accrual is always allowed
  }

  // Cash method (kontantmetoden) restrictions
  if (method === 'cash') {
    // Only allowed for small companies
    if (revenue >= 3000000) {
      return false;
    }
    // Not allowed with K3/K4
    if (framework === 'k3' || framework === 'k4') {
      return false;
    }
    return true;
  }

  return false;
}
