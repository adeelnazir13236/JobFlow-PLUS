# JOBFLOW PLUS UAT Report

Date: 2026-06-05  
Environment: Local development  
Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`  
Database: `jobflow_plus` on local MySQL/MariaDB  
Tester: Codex acting as UAT tester

## 1. Objective

Perform a user acceptance test of JOBFLOW PLUS like a real user across the major workflows currently implemented:

- SaaS System Admin
- Organization Admin
- Tenant isolation
- Subscription and feature permission behavior
- Customer management
- Job management
- Technician Workspace
- GPS check-in/check-out verification
- Build and application health

This UAT focused on confirming that the application is usable, role-aware, tenant-safe, and operationally ready for deeper end-to-end business testing.

## 2. Test Summary

| Area | Result | Notes |
| --- | --- | --- |
| Backend health | PASS | `/health` returned 200 |
| Frontend availability | PASS | Vite frontend returned 200 |
| Frontend production build | PASS | `npm run build` completed successfully |
| System Admin login | PASS | Login successful |
| System Admin organization access | PASS | Organizations API returned records |
| Organization Admin login | PASS | Login successful |
| Organization tenant data | PASS | Customers/jobs loaded for own organization |
| Organization Admin blocked from System Admin APIs | PASS | Organizations API returned 403 |
| Technician login | PASS | Staff login successful |
| Technician Workspace access | PASS | Technician dashboard and jobs APIs loaded |
| Technician assigned jobs | PASS | Assigned jobs returned |
| Technician reports restriction | PASS | Reports API returned 403 |
| GPS feature on Professional plan | PASS | Maintenance staff has `GPS_TRACKING` |
| GPS check-in | PASS | Check-in created verified GPS log |
| Duplicate GPS check-in prevention | PASS | Duplicate check-in returned 400 |
| GPS check-out | PASS | Check-out created verified GPS log |
| GPS tenant isolation | PASS | Other organization technician could not access UAT job |

Overall UAT status: **PASS WITH OBSERVATIONS**

## 3. Environment Checks

### Backend Health

Request:

```text
GET http://localhost:5000/health
```

Result:

```json
{"status":"ok"}
```

Status: **PASS**

### Frontend Availability

Request:

```text
GET http://localhost:5173
```

Result:

```text
HTTP 200
```

Status: **PASS**

### Build Verification

Command:

```powershell
npm run build
```

Result:

```text
✓ built successfully
```

Status: **PASS**

Observation:

Vite reports a large chunk warning. This is not a functional blocker, but code splitting should be considered later for performance.

## 4. Authentication and Role UAT

### 4.1 System Admin Login

Credentials:

```text
system.admin@jobflowplus.com / 123456
```

Expected:

- Login succeeds
- User role is `SYSTEM_ADMIN`
- User receives all active features
- System Admin can access organizations

Actual:

- Login succeeded
- Role returned as `SYSTEM_ADMIN`
- Features included:
  - CUSTOMERS
  - JOBS
  - FOLLOW_UPS
  - CALL_LOGS
  - DASHBOARD
  - REPORTS
  - CONTRACTS
  - RECURRING_JOBS
  - QUOTATIONS
  - INVOICES
  - PAYMENTS
  - WHATSAPP
  - CUSTOMER_PORTAL
  - AI_ASSISTANT
  - TECHNICIAN_WORKSPACE
  - GPS_TRACKING
- Organizations API returned 5 organizations

Status: **PASS**

### 4.2 Organization Admin Login

Credentials:

```text
admin@sample-cleaning.test / 123456
```

Expected:

- Login succeeds
- User role is `ADMIN`
- User belongs to Sample Cleaning Company
- User can access own customers/jobs
- User cannot access System Admin organization API

Actual:

- Login succeeded
- Role returned as `ADMIN`
- Organization returned as `Sample Cleaning Company`
- Customers returned: 4
- Jobs returned: 8
- System Admin organizations API returned 403

Status: **PASS**

## 5. Tenant Isolation UAT

### Test

Attempted to access a Maintenance organization UAT job as a Sample Cleaning technician.

UAT job:

```text
Job ID: 251
Organization: Sample Maintenance Company
```

User:

```text
staff@sample-cleaning.test / 123456
```

Expected:

- Access denied or not found
- No cross-organization data exposure

Actual:

```text
HTTP 404
```

Status: **PASS**

Interpretation:

Returning 404 is acceptable because it avoids revealing whether another organization's record exists.

## 6. Customer Management UAT

### Customer Location Support

Customer records now support:

- Address
- Area
- City
- Latitude
- Longitude
- Google Maps link

Expected:

- Customer details page shows latitude and longitude
- If coordinates exist, user can open Google Maps directly

Actual:

- Latitude and longitude fields are visible in customer details
- Customer form supports editing latitude and longitude
- Customer detail includes **Open in Google Maps** button when coordinates exist

Status: **PASS**

Observation:

Coordinates must be entered in decimal format.

Example:

```text
Latitude: 24.904250
Longitude: 67.026472
```

## 7. Technician Workspace UAT

### 7.1 Technician Login

Credentials:

```text
staff@sample-cleaning.test / 123456
```

Expected:

- Login succeeds
- Staff user has Technician Workspace feature
- Technician dashboard loads
- Assigned jobs load
- Restricted reports remain blocked

Actual:

- Login succeeded
- Role returned as `STAFF`
- Organization returned as `Sample Cleaning Company`
- `TECHNICIAN_WORKSPACE` feature available
- Technician dashboard loaded
- Assigned jobs returned: 8
- Technician profile employee code: `SAM-TECH-001`
- Reports API returned 403

Status: **PASS**

### 7.2 Technician Workspace for Professional Plan

Credentials:

```text
staff@sample-maintenance.test / 123456
```

Expected:

- Technician Workspace is available
- GPS Tracking is available through Professional plan

Actual:

- `TECHNICIAN_WORKSPACE`: true
- `GPS_TRACKING`: true
- Assigned jobs returned: 9

Status: **PASS**

## 8. GPS Tracking UAT

### 8.1 Test Data Created

To perform a realistic GPS test, a dedicated UAT customer and job were created.

Created records:

```text
Customer ID: 115
Job ID: 251
Organization: Sample Maintenance Company
Assigned Staff: staff@sample-maintenance.test
Latitude: 24.904250
Longitude: 67.026472
```

### 8.2 GPS Check-In

Request:

```text
POST /api/technician/jobs/251/check-in
```

Payload:

```json
{
  "latitude": 24.904250,
  "longitude": 67.026472,
  "accuracy": 12,
  "notes": "UAT check-in exact location"
}
```

Expected:

- Check-in succeeds
- Job check-in time is saved
- GPS log is created
- Distance is within allowed radius
- Verification status is `VERIFIED`

Actual:

```text
locationVerificationStatus: VERIFIED
isVerified: true
```

Status: **PASS**

### 8.3 Duplicate Check-In Prevention

Action:

Repeated check-in request for same job.

Expected:

- Duplicate check-in is blocked

Actual:

```text
HTTP 400
```

Status: **PASS**

### 8.4 GPS Check-Out

Request:

```text
POST /api/technician/jobs/251/check-out
```

Payload:

```json
{
  "latitude": 24.904250,
  "longitude": 67.026472,
  "accuracy": 13,
  "notes": "UAT check-out exact location"
}
```

Expected:

- Check-out succeeds after check-in
- Job check-out time is saved
- GPS log is created
- Verification remains `VERIFIED`

Actual:

```text
locationVerificationStatus: VERIFIED
locationLogs: 2
```

Status: **PASS**

## 9. Subscription and Feature Permission UAT

### Test: Organization Admin Blocked from System Admin APIs

User:

```text
admin@sample-cleaning.test
```

Request:

```text
GET /api/organizations
```

Expected:

```text
403 Forbidden
```

Actual:

```text
403 Forbidden
```

Status: **PASS**

### Test: Technician Blocked from Reports

User:

```text
staff@sample-cleaning.test
```

Request:

```text
GET /api/reports
```

Expected:

```text
403 Forbidden
```

Actual:

```text
403 Forbidden
```

Status: **PASS**

## 10. Observations

### Observation 1: Existing Seed Data Needs Rerun for Coordinates

Some existing customers in the current local database do not have latitude/longitude because they were created before GPS fields were added.

Impact:

- GPS verification for those old customers returns `LOCATION_NOT_AVAILABLE`
- This is expected unless coordinates are manually added or seed data is rerun

Recommendation:

For demo/testing, run:

```powershell
cd "C:\working folder\Projects\JobFlow-PLUS\backend"
npm run seed:test
```

Or edit customers manually and add latitude/longitude.

### Observation 2: Sample Cleaning GPS Depends on Override

The Starter plan does not include GPS by default. The seed file now adds `GPS_TRACKING` override for Sample Cleaning Company, but if seed was not rerun after the GPS update, Sample Cleaning staff may not have GPS access.

Impact:

- Technician Workspace works
- GPS buttons/API may be unavailable for Sample Cleaning until override is added

Recommendation:

System Admin can enable `GPS_TRACKING` override for Sample Cleaning Company, or rerun seed data.

### Observation 3: Frontend Bundle Size Warning

The frontend production build passes, but Vite reports a chunk size warning.

Impact:

- No immediate functional issue
- Could affect load performance as the app grows

Recommendation:

Later, add route-level code splitting for large modules such as reports, technician workspace, portal, and system admin.

## 11. Defects Found

No blocking defects found during this UAT pass.

No critical tenant isolation issue was found.

No login blocker was found.

No GPS workflow blocker was found.

## 12. UAT Decision

Result: **PASS WITH OBSERVATIONS**

JOBFLOW PLUS is ready for broader manual testing by real business users across:

- System Admin
- Organization Admin
- Agent
- Technician
- Customer Portal User

Before production use, complete a deeper browser-based pass and verify PDF output, WhatsApp provider settings, contract billing edge cases, and mobile GPS permission behavior on actual phones.

## 13. Recommended Next UAT Round

Perform browser-based testing for:

- Full quotation lifecycle
- Quotation to job
- Quotation to contract
- Contract activation
- Recurring job generation
- Contract invoice generation
- Payment against invoice
- Customer portal service request
- Service request conversion to job
- WhatsApp notification logs
- Technician mobile workflow
- GPS permission on Android Chrome
- GPS permission on iPhone Safari

## 14. Sign-Off

| Role | Name | Status | Date |
| --- | --- | --- | --- |
| UAT Tester | Codex | Completed | 2026-06-05 |
| Product Owner | Pending | Awaiting review |  |
| Business User | Pending | Awaiting review |  |

## 15. Expanded All-Module UAT Addendum

Date: 2026-06-05  
Reason: User requested UAT coverage for all other implemented JOBFLOW PLUS features, not only the initial smoke/core workflow pass.

### 15.1 Expanded Scope

This addendum expands the UAT coverage to include:

- Authentication
- System Admin
- Plans and feature permissions
- Organization subscriptions
- Organization billing
- Customers
- Jobs
- Calendar
- Follow-ups
- Call logs
- Quotations
- Contracts / AMC
- Contract invoices
- Invoices
- Payments
- PDF downloads
- Reports
- WhatsApp
- Customer Portal
- Service Requests
- Technician Workspace
- GPS Tracking
- Tenant isolation

Testing was performed primarily through API-level user acceptance checks against the running local app. This confirms backend behavior, permissions, tenant boundaries, and data availability. A final browser walkthrough is still recommended for visual layout, PDF appearance, and mobile usability.

### 15.2 Expanded UAT Result Matrix

| Module | Test Case | User / Organization | Result | Evidence / Notes |
| --- | --- | --- | --- | --- |
| Auth | System Admin login | `system.admin@jobflowplus.com` | PASS | Role returned `SYSTEM_ADMIN` |
| Auth | Organization Admin login | `admin@sample-cleaning.test` | PASS | Role returned `ADMIN` |
| Auth | Technician login | `staff@sample-maintenance.test` | PASS | Role returned `STAFF` |
| System Admin | List organizations | System Admin | PASS | `GET /api/organizations` returned 200 |
| Plans | List plans | System Admin | PASS | `GET /api/plans` returned 200 |
| Plans | List feature catalog | System Admin | PASS | `GET /api/plans/features` returned 200 |
| Organization Billing | Billing summary | System Admin | PASS | `GET /api/organization-billing/summary` returned 200 |
| Organization Billing | Billing invoices | System Admin | PASS | `GET /api/organization-billing/invoices` returned 200 |
| Customers | List customers | Maintenance Admin | PASS | `GET /api/customers` returned 200 |
| Customers | Customer detail | Maintenance Admin | PASS | `GET /api/customers/:id` returned 200 |
| Customers | Customer call logs | Maintenance Admin | PASS | `GET /api/customers/:id/call-logs` returned 200 |
| Jobs | List jobs | Maintenance Admin | PASS | `GET /api/jobs` returned 200 |
| Jobs | Calendar jobs | Maintenance Admin | PASS | `GET /api/jobs/calendar` returned 200 |
| Jobs | Job detail | Maintenance Admin | PASS | `GET /api/jobs/:id` returned 200 |
| Follow-ups | Pending follow-ups | Maintenance Admin | PASS | `GET /api/followups/pending` returned 200 |
| Call Logs | List call logs | Maintenance Admin | PASS | `GET /api/call-logs` returned 200 |
| Quotations | List quotations | Maintenance Admin | PASS | `GET /api/quotations` returned 200 |
| Quotations | Quotation detail | Maintenance Admin | PASS | `GET /api/quotations/:id` returned 200 |
| PDF | Quotation PDF download | Maintenance Admin | PASS | `GET /api/quotations/:id/pdf` returned 200 |
| Contracts | List contracts | Maintenance Admin | PASS | `GET /api/contracts` returned 200 |
| Contracts | Contract detail | Maintenance Admin | PASS | `GET /api/contracts/:id` returned 200 |
| Contracts | Contract invoices | Maintenance Admin | PASS | `GET /api/contracts/:id/invoices` returned 200 |
| Invoices | List invoices | Maintenance Admin | PASS | `GET /api/invoices` returned 200 |
| Invoices | Invoice detail | Maintenance Admin | PASS | `GET /api/invoices/:id` returned 200 |
| PDF | Invoice PDF download | Maintenance Admin | PASS | `GET /api/invoices/:id/pdf` returned 200 |
| Payments | List payments | Maintenance Admin | PASS | `GET /api/payments` returned 200 |
| Payments | Payment detail | Maintenance Admin | PASS | `GET /api/payments/:id` returned 200 |
| PDF | Payment receipt download | Maintenance Admin | PASS | `GET /api/payments/:id/receipt` returned 200 |
| Reports | Executive dashboard report | Maintenance Admin | PASS | `GET /api/reports/executive-dashboard` returned 200 |
| Reports | Financial revenue report | Maintenance Admin | PASS | `GET /api/reports/financial/revenue` returned 200 |
| Reports | Job summary report | Maintenance Admin | PASS | `GET /api/reports/jobs/summary` returned 200 |
| Reports | Customer summary report | Maintenance Admin | PASS | `GET /api/reports/customers/summary` returned 200 |
| Reports | Service request report | Maintenance Admin | PASS | `GET /api/reports/service-requests` returned 200 |
| WhatsApp | Settings | Cleaning Admin | PASS | `GET /api/whatsapp/settings` returned 200 |
| WhatsApp | Templates | Cleaning Admin | PASS | `GET /api/whatsapp/templates` returned 200 |
| WhatsApp | Logs | Cleaning Admin | PASS | `GET /api/whatsapp/logs` returned 200 |
| WhatsApp | Send quotation message | Solar Admin / Enterprise | PASS | Mock send created log ID 26 with status `SENT` |
| Customer Portal | Portal login | Green Villa Portal | PASS | Login succeeded using `login` field |
| Customer Portal | Portal dashboard | Green Villa Portal | PASS | `GET /api/portal/dashboard` returned 200 |
| Customer Portal | Portal quotations | Green Villa Portal | PASS | `GET /api/portal/quotations` returned 200 |
| Customer Portal | Portal contracts | Green Villa Portal | PASS | `GET /api/portal/contracts` returned 200 |
| Customer Portal | Portal jobs | Green Villa Portal | PASS | `GET /api/portal/jobs` returned 200 |
| Customer Portal | Portal invoices | Green Villa Portal | PASS | `GET /api/portal/invoices` returned 200 |
| Customer Portal | Portal payments | Green Villa Portal | PASS | `GET /api/portal/payments` returned 200 |
| Customer Portal | Portal service requests | Green Villa Portal | PASS | `GET /api/portal/service-requests` returned 200 |
| Service Requests | Create request from portal | Green Villa Portal | PASS | Created Service Request ID 14 |
| Service Requests | Internal admin visibility | Cleaning Admin | PASS | Service Request ID 14 visible in internal list and detail |
| Technician | Dashboard | Maintenance Staff | PASS | `GET /api/technician/dashboard` returned 200 |
| Technician | Assigned jobs | Maintenance Staff | PASS | `GET /api/technician/jobs` returned 200 |
| Technician | Profile | Maintenance Staff | PASS | `GET /api/technician/profile` returned 200 |
| GPS | Check-in | Maintenance Staff | PASS | Job ID 251 check-in verified |
| GPS | Duplicate check-in block | Maintenance Staff | PASS | Duplicate check-in returned 400 |
| GPS | Check-out | Maintenance Staff | PASS | Job ID 251 check-out verified |
| Tenant Isolation | Cross-org technician job access | Cleaning Staff against Maintenance job | PASS | Returned 404 |
| Permissions | Organization admin blocked from System Admin APIs | Cleaning Admin | PASS | `GET /api/organizations` returned 403 |
| Permissions | Technician blocked from Reports | Cleaning Staff | PASS | Reports access returned 403 |

### 15.3 Corrected Findings From First Broad Pass

During the first expanded API pass, some tests appeared to fail because the wrong organization was used for a feature-gated module:

- Maintenance organization has Reports/GPS, but not WhatsApp or Customer Portal.
- Cleaning organization has WhatsApp and Customer Portal overrides, but not Quotations.
- Portal login requires request field `login`, not `email`.

After retesting with the correct organization and payload shape:

- WhatsApp settings/templates/logs passed for Cleaning Admin.
- Customer Portal login and portal lists passed for Green Villa Portal.
- Internal Service Requests passed for Cleaning Admin.
- WhatsApp quotation send passed for Solar Admin on Enterprise plan.

These are not product defects; they confirm that feature permissions are working.

### 15.4 UAT Records Created

The expanded UAT created these test records:

| Record | ID | Purpose |
| --- | --- | --- |
| Customer | 115 | GPS UAT customer in Sample Maintenance Company |
| Job | 251 | GPS UAT job assigned to Maintenance Staff |
| Service Request | 14 | Portal-created service request from Green Villa Portal |
| WhatsApp Log | 26 | Mock quotation WhatsApp send from Solar Admin |

These records can remain as UAT evidence or be removed before production/demo cleanup.

### 15.5 Manual-Only Checks Still Recommended

The following items need human browser/mobile review because API checks cannot fully verify visual or device-specific behavior:

- PDF layout quality and single-page formatting in browser/PDF viewer
- Customer portal screen layout on mobile
- Technician job detail layout on real phone
- Browser GPS permission prompt on Android Chrome
- Browser GPS permission prompt on iPhone Safari
- Signature pad usability on touch devices
- Image upload preview with real camera photos
- WhatsApp real provider credentials and delivery behavior
- Organization billing invoice UI review
- Full quotation-to-contract visual workflow
- Full contract recurring job workflow using real dates

### 15.6 Expanded UAT Decision

Expanded result: **PASS WITH MANUAL FOLLOW-UP ITEMS**

The implemented modules are reachable, role-aware, and feature-gated correctly under API-level UAT. No blocker was found in the tested backend workflows. The next best step is a browser-based UAT session using the same checklist, especially for mobile technician and customer portal flows.
