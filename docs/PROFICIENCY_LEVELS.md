# Proficiency Levels Documentation

This document describes the user proficiency system and how it affects feature visibility throughout the application.

## Overview

Svethna implements an adaptive UI based on user proficiency levels. This allows new users to see a simplified interface while experienced users can access advanced features.

## Proficiency Levels

| Level | Display Name | Description |
|-------|-------------|-------------|
| `novice` | Getting Started | Maximum guidance, simplified interface, auto-accepts AI suggestions |
| `basic` | Building Confidence | Growing comfortable, more features visible, some collapsed |
| `proficient` | Taking Control | Full toolkit available, all features accessible |
| `expert` | Full Power | All features unlocked, compact UI, keyboard shortcuts |

## Feature Visibility by Level

### Legend
- **visible** - Feature is shown normally
- **hidden** - Feature is completely hidden
- **collapsed** - Feature is available but collapsed/minimized by default
- **simplified** - Simplified version of the feature
- **standard** - Normal feature display
- **advanced** - Full feature with all options
- **expanded** - Feature expanded/prominent by default

---

## Navigation Menu

| Feature | Novice | Basic | Proficient | Expert |
|---------|--------|-------|------------|--------|
| Dashboard | visible | visible | visible | visible |
| Invoices | visible | visible | visible | visible |
| Clients | visible | visible | visible | visible |
| Products | visible | visible | visible | visible |
| Suppliers | **hidden** | visible | visible | visible |
| Supplier Invoices | **hidden** | visible | visible | visible |
| Templates | **hidden** | visible | visible | visible |
| Accounts (Chart) | **hidden** | **hidden** | visible | visible |
| Journal Entries | **hidden** | **hidden** | visible | visible |
| General Ledger | **hidden** | **hidden** | visible | visible |
| Balance Sheet | **hidden** | **hidden** | visible | visible |
| Income Statement | **hidden** | visible | visible | visible |
| VAT Report | **hidden** | visible | visible | visible |
| SIE Import | **hidden** | **hidden** | visible | visible |
| Teams | **hidden** | visible | visible | visible |
| Admin Panel | visible | visible | visible | visible |

**Note:** Admin panel visibility is role-based, not proficiency-based.

---

## Invoice Form

| Field/Feature | Novice | Basic | Proficient | Expert |
|---------------|--------|-------|------------|--------|
| Basic Fields (client, dates, items) | standard | standard | standard | standard |
| Invoice Number (manual) | **hidden** | visible | visible | visible |
| Currency Selector | **hidden** | collapsed | visible | visible |
| Template Selector | **hidden** | collapsed | visible | visible |
| Delivery Date | **hidden** | collapsed | visible | visible |
| Reverse VAT | **hidden** | **hidden** | visible | visible |
| Account Coding | **hidden** | simplified | standard | advanced |
| Notes/Terms | collapsed | collapsed | visible | visible |
| Reference | **hidden** | collapsed | visible | visible |
| Our Reference | **hidden** | collapsed | visible | visible |
| Your Reference | **hidden** | collapsed | visible | visible |
| Bulk Actions | **hidden** | **hidden** | visible | expanded |
| Recurring Invoice | **hidden** | collapsed | visible | visible |
| Copy Invoice | **hidden** | visible | visible | visible |

---

## Client Form

| Field/Feature | Novice | Basic | Proficient | Expert |
|---------------|--------|-------|------------|--------|
| Basic Fields (name, email, phone) | standard | standard | standard | standard |
| Organization Number | collapsed | visible | visible | visible |
| VAT Number | **hidden** | collapsed | visible | visible |
| Payment Terms | **hidden** | collapsed | visible | visible |
| Default Currency | **hidden** | **hidden** | visible | visible |
| Notes | collapsed | collapsed | visible | visible |

---

## Product Form

| Field/Feature | Novice | Basic | Proficient | Expert |
|---------------|--------|-------|------------|--------|
| Basic Fields (name, price) | standard | standard | standard | standard |
| SKU | **hidden** | collapsed | visible | visible |
| Unit | collapsed | visible | visible | visible |
| Account Number | **hidden** | **hidden** | visible | visible |
| Multi-Currency Prices | **hidden** | **hidden** | visible | visible |

---

## Supplier Invoice Form

| Field/Feature | Novice | Basic | Proficient | Expert |
|---------------|--------|-------|------------|--------|
| Account Coding | **hidden** | simplified | standard | advanced |
| Journal Preview | **hidden** | **hidden** | collapsed | expanded |
| Multiple Lines | simplified | standard | standard | standard |

---

## Dashboard

| Widget/Feature | Novice | Basic | Proficient | Expert |
|----------------|--------|-------|------------|--------|
| Quick Stats | standard | standard | standard | standard |
| Revenue Chart | simplified | standard | standard | advanced |
| Cash Flow Widget | **hidden** | **hidden** | visible | visible |
| Accounting Alerts | **hidden** | **hidden** | visible | visible |
| Overdue Invoices | standard | standard | standard | standard |

---

## Reports

| Feature | Novice | Basic | Proficient | Expert |
|---------|--------|-------|------------|--------|
| Balance Sheet | **hidden** | **hidden** | visible | visible |
| Income Statement | **hidden** | simplified | standard | advanced |
| VAT Report | **hidden** | simplified | standard | standard |
| General Ledger | **hidden** | **hidden** | visible | visible |
| Export Options | simplified (PDF) | standard (PDF+Excel) | standard | advanced (all formats) |

---

## Organization Settings

| Feature | Novice | Basic | Proficient | Expert |
|---------|--------|-------|------------|--------|
| Basic Info | standard | standard | standard | standard |
| Invoice Numbering | **hidden** | collapsed | visible | visible |
| Manual Numbering | **hidden** | **hidden** | visible | visible |
| Accounting Settings | **hidden** | **hidden** | visible | visible |
| Fiscal Year | **hidden** | **hidden** | visible | visible |
| Integrations | **hidden** | **hidden** | collapsed | visible |

---

## Journal Entries

| Feature | Novice | Basic | Proficient | Expert |
|---------|--------|-------|------------|--------|
| Manual Entry | **hidden** | **hidden** | visible | visible |
| Templates | **hidden** | **hidden** | visible | visible |
| Bulk Operations | **hidden** | **hidden** | **hidden** | visible |

---

## AI Behavior

| Setting | Novice | Basic | Proficient | Expert |
|---------|--------|-------|------------|--------|
| Auto-Accept Threshold | 0.85 | 0.95 | Never (1.1) | Never (1.1) |
| Show Suggestions | Yes | Yes | Yes | Yes |
| Show Explanations | Yes | Yes | No | No |

**Explanation:** 
- Novices get high-confidence AI suggestions auto-applied (>85% confidence)
- Basic users only see very high confidence auto-applied (>95%)
- Proficient and Expert users always review suggestions manually

---

## Confirmation Dialogs

| Action | Novice | Basic | Proficient | Expert |
|--------|--------|-------|------------|--------|
| Delete Invoice | Required | Required | Required | Skip |
| Delete Client | Required | Required | Required | Required |
| Delete Product | Required | Required | Required | Skip |
| Send Invoice | Required | Required | Skip | Skip |
| Approve Supplier Invoice | Required | Required | Required | Skip |
| Bulk Archive | Required | Required | Skip | Skip |
| Bulk Delete | Required | Required | Required | Required |

**Note:** Client deletion always requires confirmation regardless of proficiency level.

---

## UI Complexity Settings

| Setting | Novice | Basic | Proficient | Expert |
|---------|--------|-------|------------|--------|
| List Preview Count | 5 | 10 | 25 | 50 |
| Show Keyboard Shortcuts | No | No | Yes | Yes |
| Table Density | Comfortable | Comfortable | Standard | Compact |
| Show Technical IDs | No | Yes | Yes | Yes |
| Tooltip Detail | Detailed | Standard | Minimal | Minimal |

---

## Using Proficiency in Code

### The useProficiency Hook

```javascript
import useProficiency from '../hooks/useProficiency';

function MyComponent() {
  const {
    level,              // 'novice', 'basic', 'proficient', 'expert'
    isNovice,           // boolean
    isBasic,            // boolean
    isProficient,       // boolean
    isExpert,           // boolean
    isAtLeast,          // (level) => boolean
    showFeature,        // (featureId) => boolean
    getUIMode,          // (featureId) => mode string
    isCollapsed,        // (featureId) => boolean
    getAiThreshold,     // () => number
    needsConfirmation,  // (actionId) => boolean
    getUiSetting,       // (settingId) => value
  } = useProficiency();

  // Example: Hide feature for novices
  if (!showFeature('nav.suppliers')) {
    return null;
  }

  // Example: Check if at least proficient
  if (isAtLeast('proficient')) {
    // Show advanced options
  }

  // Example: Get UI mode for a feature
  const mode = getUIMode('invoice.accountCoding');
  // Returns: 'hidden', 'collapsed', 'simplified', 'standard', 'advanced', or 'expanded'
}
```

### Configuration Files

- **Feature visibility:** `src/config/proficiencyFeatures.js`
- **AI thresholds:** `src/config/proficiencyFeatures.js` (aiThresholds)
- **Confirmation dialogs:** `src/config/proficiencyFeatures.js` (confirmations)
- **UI complexity:** `src/config/proficiencyFeatures.js` (uiComplexity)

---

## Implementation Status

### Currently Implemented

| Component | Status | Notes |
|-----------|--------|-------|
| Sidebar Navigation | ✅ Complete | Filters nav items by proficiency |
| useProficiency Hook | ✅ Complete | Full API available |
| proficiencyFeatures Config | ✅ Complete | All features mapped |

### Pending Implementation

| Component | Priority | Notes |
|-----------|----------|-------|
| InvoiceModal | High | Many fields to control |
| ClientModal | Medium | Org number, VAT, notes |
| ProductModal | Medium | SKU, multi-currency |
| Dashboard | Medium | Widget visibility |
| OrganizationSettings | Low | Invoice numbering settings |
| SupplierInvoiceModal | Low | Account coding, journal preview |

---

## Setting User Proficiency

Users can change their proficiency level in Profile Settings (`/settings`). The setting is stored in the `profiles` table and synced via Redux.

Default proficiency for new users: `basic`

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall architecture patterns
- [FEATURES.md](./FEATURES.md) - Feature implementation status
- [US-124/125 Implementation](./FEATURES.md#us-124-user-proficiency) - User stories for proficiency system
