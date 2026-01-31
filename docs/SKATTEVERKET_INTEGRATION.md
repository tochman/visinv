# Skatteverket API Integration

## Overview

This document provides detailed information about the Swedish Tax Authority (Skatteverket) API integration for Svethna. The integration enables automated digital submission of tax reports directly to Skatteverket, ensuring compliance with Swedish tax reporting requirements.

## Purpose

The integration aims to:
1. **Automate VAT reporting** - Generate and submit VAT declarations (momsdeklaration) from invoice data
2. **Automate employer reporting** - Generate and submit employer declarations (arbetsgivardeklaration) from payroll data
3. **Ensure compliance** - Meet Swedish legal requirements for digital tax reporting
4. **Reduce manual work** - Eliminate manual data entry and file uploads
5. **Improve accuracy** - Validate declarations before submission using Skatteverket's validation API

## Legal Requirements

### VAT (Moms) Declaration
- **Mervärdesskattelagen (2023:200)** - Swedish VAT Act
- **Frequency**: Monthly, quarterly, or yearly based on business turnover
- **Deadline**: Typically 26th of the month following the reporting period
- **Applies to**: All businesses registered for VAT in Sweden

### Employer (Arbetsgivardeklaration) Declaration
- **Skatteförfarandelagen (2011:1244)** - Tax Procedure Act
- **Frequency**: Monthly
- **Deadline**: 12th of the month following the reporting period
- **Applies to**: All businesses with employees in Sweden
- **Note**: From January 2025, absence data (frånvaro) must also be reported for Försäkringskassan

## API Documentation

### Official Resources
- **Developer Portal**: https://www7.skatteverket.se/portal/apier-och-oppna-data/utvecklarportalen
- **VAT Declaration API**: https://www7.skatteverket.se/portal/apier-och-oppna-data/utvecklarportalen/api/momsdeklaration/1.0.19/
- **Employer Declaration API**: https://www7.skatteverket.se/portal/apier-och-oppna-data/utvecklarportalen/api/arbetsgivardeklaration-inlamning/1.0.0/

### API Capabilities

#### Momsdeklaration (VAT) API (v1.0.19)

**Common HTTP Methods:**
- **POST** - Submit new VAT declarations
- **GET** - Retrieve declaration status and results
- **PUT** - Update draft declarations

**Key Operations:**
- Create and manage VAT declaration drafts
- Validate declarations against business rules
- Submit declarations with BankID authentication
- Retrieve submission status and decisions
- Download submission receipts

**Typical Endpoints:**
- `POST /v1/declarations` - Submit a new VAT declaration
- `GET /v1/declarations/{id}` - Retrieve a specific VAT declaration by ID
- `GET /v1/declarations` - List submitted VAT declarations
- `GET /v1/declarations/{id}/status` - Get submission status

**Data Format:**
- Request/Response: JSON or XML
- VAT declaration XML must comply with Skatteverket's schema
- Authentication via OAuth2 with organization certificates

#### Arbetsgivardeklaration (Employer) API (v1.0.0)

**Key API Operations:**

1. **Läsa in underlag (Submit Payroll Data)**
   - **Method**: POST
   - **Purpose**: Upload employer declaration data to Skatteverket
   - **Input**: AG declaration data (employee salaries, contributions, tax withheld)
   - **Output**: Declaration ID (inläsnings-ID) for tracking
   - **Process**: Asynchronous - data is validated in background

2. **Hämta kontrollresultat (Fetch Control Results)**
   - **Method**: GET
   - **Purpose**: Poll for validation results of submitted data
   - **Input**: Declaration ID (inläsnings-ID)
   - **Output**: Validation results (errors, warnings, summary checks)
   - **Usage**: Poll periodically until validation is complete

3. **Förbered granskning (Prepare for Review)**
   - **Method**: POST
   - **Purpose**: Create review record when validation passes
   - **Input**: Employer registration ID + reporting period
   - **Output**: Deep link to Skatteverket's signing portal
   - **Final Step**: Authorized person signs with BankID (external to API)

**Workflow:**
```
1. POST payroll data → Receive declaration ID
2. GET control results (polling) → Validation complete
3. POST prepare review → Receive deep link
4. User signs via BankID (external) → Declaration submitted
```

**Data Format:**
- Request/Response: JSON
- Authentication via OAuth2 with client credentials
- Requires organization e-legitimation for final signing

## Authentication Requirements

### Registration Process
1. Register organization at Skatteverket's Developer Portal
2. Complete onboarding and agreements
3. Obtain API credentials (certificates, API keys)
4. Configure test environment access
5. Validate integration in test environment
6. Request production access

### BankID (e-legitimation)
- **Required for**: Final submission and signing of declarations
- **Supported methods**: BankID mobile app, BankID desktop client
- **User requirement**: Must be authorized to sign on behalf of organization
- **Security level**: Strong authentication per Skatteverket requirements

### Certificate-based Authentication
- API calls authenticated using certificates provided by Skatteverket
- OAuth 2.0 flow for authorization
- Client ID and Client Secret for API access
- Organization e-legitimation certificate required
- Secure storage of credentials required

**Authentication Flow:**
1. Obtain client credentials (Client ID, Client Secret) from Skatteverket
2. Request OAuth2 access token using client credentials
3. Include access token in API requests (Bearer token)
4. Refresh token when expired
5. BankID signature required for final declaration submission

## Data Flow

### VAT Declaration Flow
```
Invoice Data → VAT Calculation → Declaration Generation → 
Draft Review → Validation → BankID Signing → API Submission → 
Confirmation Receipt → Decision Document
```

### Employer Declaration Flow
```
Payroll Data → Contribution Calculation → Declaration Generation → 
API Submission → Declaration ID → Validation Results → 
Review Request → Deep Link → BankID Signing (external) → 
Submission Confirmation
```

## API Endpoint Details

### VAT Declaration API Endpoints

**Base URL (Production):** `https://api.skatteverket.se/moms/v1`  
**Base URL (Test):** `https://test-api.skatteverket.se/moms/v1`

**Example Endpoints:**

```http
POST /v1/declarations
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "organizationNumber": "556677-8899",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31",
  "vatOutput": {
    "rate25": { "base": 100000, "vat": 25000 },
    "rate12": { "base": 50000, "vat": 6000 },
    "rate6": { "base": 20000, "vat": 1200 }
  },
  "vatInput": {
    "rate25": { "base": 40000, "vat": 10000 }
  },
  "netVat": 22200
}
```

```http
GET /v1/declarations/{declarationId}
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "declarationId": "abc123",
  "status": "submitted",
  "organizationNumber": "556677-8899",
  "submittedDate": "2024-02-15T10:30:00Z",
  "decision": {
    "status": "accepted",
    "date": "2024-02-15T11:00:00Z"
  }
}
```

### Employer Declaration API Endpoints

**Base URL (Production):** `https://api.skatteverket.se/agd/v1`  
**Base URL (Test):** `https://test-api.skatteverket.se/agd/v1`

**1. Submit Payroll Data (Läsa in underlag)**

```http
POST /v1/inlamning/underlag
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "arbetsgivarregId": "556677-8899",
  "redovisningsperiod": "2024-01",
  "anstallda": [
    {
      "personnummer": "19901231-1234",
      "bruttolön": 35000,
      "skatteavdrag": 10500,
      "arbetsgivaravgift": 10990,
      "frånvaro": {
        "sjukfrånvaro": 5,
        "föräldraledighet": 0
      }
    }
  ]
}
```

**Response:**
```json
{
  "inläsningsId": "xyz789",
  "status": "received",
  "timestamp": "2024-02-05T09:15:00Z"
}
```

**2. Fetch Control Results (Hämta kontrollresultat)**

```http
GET /v1/inlamning/kontrollresultat/{inläsningsId}
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "inläsningsId": "xyz789",
  "status": "completed",
  "resultat": {
    "fel": [],
    "varningar": [],
    "sammanställning": {
      "totalBruttolön": 35000,
      "totalSkatteavdrag": 10500,
      "totalArbetsgivaravgift": 10990
    }
  }
}
```

**3. Prepare Review (Förbered granskning)**

```http
POST /v1/inlamning/granskning
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "arbetsgivarregId": "556677-8899",
  "redovisningsperiod": "2024-01"
}
```

**Response:**
```json
{
  "granskningsId": "grans456",
  "djuplänk": "https://www.skatteverket.se/granskning?id=grans456&token=abc...",
  "giltigTill": "2024-02-06T23:59:59Z"
}
```

**Note:** The exact endpoint URLs and request/response formats are subject to Skatteverket's API specifications. Consult the official API documentation for production use.

## Technical Architecture

### Database Tables (Proposed)
- `skatteverket_credentials` - Encrypted API credentials per organization
- `vat_declarations` - VAT declaration records, drafts, and submissions
- `employer_declarations` - Employer declaration records and submissions
- `tax_submission_log` - Audit trail of all API interactions
- `payroll_data` - Employee payroll information for declarations

### API Client Services
- `SkatteverketAuthService` - Handle authentication and credentials
- `VatDeclarationService` - Generate and submit VAT declarations
- `EmployerDeclarationService` - Generate and submit employer declarations
- `BankIDService` - Integrate BankID authentication flow
- `SkatteverketAPIClient` - Low-level HTTP client for API calls

### Frontend Components
- Tax Reporting Dashboard
- VAT Declaration Form & Review
- Employer Declaration Form & Review
- Submission History & Status
- API Connection Settings

## Implementation Phases

### Phase 1: Foundation (US-290, US-291)
- API registration and credential management
- BankID authentication integration
- Test environment connection
- Security and encryption implementation

### Phase 2: VAT Reporting (US-300-303)
- VAT calculation from invoice data
- Declaration generation and validation
- Draft management
- API submission to Skatteverket
- History and archive

### Phase 3: Employer Reporting (US-310-314)
- Payroll data management
- Employer contribution calculations
- Absence data tracking (for Försäkringskassan)
- Declaration generation
- API submission workflow
- History and archive

### Phase 4: Dashboard & Notifications (US-320-321)
- Tax filing dashboard with deadlines
- Upcoming and overdue alerts
- Email and in-app notifications
- Quick actions and status overview

### Phase 5: Integration (US-330-331)
- Automatic VAT calculation from invoices
- Journal entry automation
- Accounting integration
- Data validation and reconciliation

## User Stories Summary

See [FEATURES.md](./FEATURES.md) for complete user story details:

| ID | Title | Category |
|----|-------|----------|
| US-290 | Skatteverket API Registration | API Connection |
| US-291 | Skatteverket BankID Authentication | API Connection |
| US-300 | VAT Declaration Generation | VAT Reporting |
| US-301 | VAT Declaration Submission | VAT Reporting |
| US-302 | VAT Declaration Draft Management | VAT Reporting |
| US-303 | VAT Report History & Archive | VAT Reporting |
| US-310 | Payroll Data Management | Employer Reporting |
| US-311 | Employer Declaration Generation | Employer Reporting |
| US-312 | Employer Declaration Submission | Employer Reporting |
| US-313 | Employer Declaration Draft Management | Employer Reporting |
| US-314 | Employer Declaration History & Archive | Employer Reporting |
| US-320 | Tax Reporting Dashboard | Dashboard |
| US-321 | Tax Filing Notifications | Dashboard |
| US-330 | Automatic VAT Calculation | Integration |
| US-331 | Journal Entry Integration | Integration |

## VAT Rates in Sweden (2024-2025)

- **25%** - Standard rate (normal moms) - Most goods and services
- **12%** - Reduced rate (reducerad moms) - Food, restaurants, hotels
- **6%** - Reduced rate (reducerad moms) - Books, newspapers, cultural services, passenger transport
- **0%** - Exempt (momsfri) - Certain services, exports to non-EU countries

## Employer Contributions (Arbetsgivaravgifter)

### Standard Rates (2024-2025)
- **Social security fees** (Socialavgifter): ~31.42% of gross salary
  - Old-age pension (Ålderspensionsavgift): 10.21%
  - Survivor's pension (Efterlevandepensionsavgift): 0.60%
  - Sickness benefit (Sjukförsäkringsavgift): 3.55%
  - Parental benefit (Föräldraförsäkringsavgift): 2.60%
  - Work injury (Arbetsskadeavgift): 0.20%
  - Labour market (Arbetsmarknadsavgift): 2.64%
  - General payroll tax (Allmän löneavgift): 11.62%

### Reduced Rates
- **Young employees** (18-23 years): Reduced employer contributions
- **Certain regions**: Special payroll tax reductions available

## Security Considerations

### Data Protection
- API credentials encrypted at rest in Supabase
- Certificate storage in secure key vault
- No plaintext storage of sensitive credentials
- Access control via RLS policies

### Audit Trail
- Log all API interactions with Skatteverket
- Record submission timestamps and users
- Track BankID authentication events
- Maintain history of all declarations

### Compliance
- GDPR compliance for personal data (personnummer)
- Secure transmission of all data (TLS/HTTPS)
- Data retention per Swedish accounting law (7 years)
- Access restricted to authorized users only

## Testing Strategy

### Test Environment
- Use Skatteverket's test API endpoints
- Mock data for validation testing
- BankID test mode for signing flows
- No production impact during development

### Validation Testing
- Test all VAT rate combinations
- Test employer contribution calculations
- Validate XML schema compliance
- Test error handling and retries

### Integration Testing
- End-to-end submission flow
- BankID authentication flow
- API error scenarios
- Network failure handling

## Error Handling

### Common API Errors
- **Authentication failures**: Invalid credentials, expired certificates
- **Validation errors**: Missing required fields, invalid amounts
- **Business rule violations**: Incorrect VAT calculations, invalid period
- **Network errors**: Timeouts, connection failures

### User-Facing Messages
- Clear error messages in Swedish and English
- Guidance on how to fix validation errors
- Link to help documentation
- Contact support option for complex issues

## Monitoring & Alerts

### System Monitoring
- API connection status
- Submission success/failure rates
- Response time metrics
- Error frequency tracking

### User Alerts
- Upcoming filing deadlines
- Submission confirmations
- Validation failures
- API connection issues

## Future Enhancements

### Phase 6+ (Future Scope)
- **Automatic bank reconciliation** - Match tax payments to declarations
- **Multi-year reporting** - Historical data analysis and reporting
- **Tax planning tools** - Forecast VAT and employer costs
- **Accountant access** - Shared access for external accountants
- **Mobile app** - Submit declarations from mobile devices
- **AI-powered validation** - Predict and prevent common errors

## Support Resources

### Skatteverket Support
- **Phone**: 0771-567 567
- **Email**: Via Skatteverket's website contact form
- **Opening hours**: Monday-Friday 8:00-16:30

### Developer Support
- **Developer Portal**: Technical documentation and examples
- **Test environment**: For integration testing
- **Technical support**: Via developer portal contact

## References

### Legal Framework
- Mervärdesskattelagen (2023:200) - Swedish VAT Act
- Skatteförfarandelagen (2011:1244) - Tax Procedure Act
- Bokföringslagen (1999:1078) - Accounting Act
- GDPR - General Data Protection Regulation

### Technical Documentation
- [Skatteverket Developer Portal](https://www7.skatteverket.se/portal/apier-och-oppna-data/utvecklarportalen)
- [VAT Declaration API Docs](https://www7.skatteverket.se/portal/apier-och-oppna-data/utvecklarportalen/api/momsdeklaration/1.0.19/)
- [Employer Declaration API Docs](https://www7.skatteverket.se/portal/apier-och-oppna-data/utvecklarportalen/api/arbetsgivardeklaration-inlamning/1.0.0/)

### Related Svethna Documentation
- [FEATURES.md](./FEATURES.md) - Complete feature list including Skatteverket user stories
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture patterns
- [DATABASE.md](./DATABASE.md) - Database schema
- [USER_STORIES_SWEDISH_COMPLIANCE.md](./USER_STORIES_SWEDISH_COMPLIANCE.md) - Swedish invoice compliance requirements

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-29  
**Status**: Planning Phase
