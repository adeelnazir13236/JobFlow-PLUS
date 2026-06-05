# JOBFLOW PLUS User Manual

Version: 1.0  
Product: JOBFLOW PLUS  
Audience: System Admins, Organization Admins, Agents, Staff/Technicians, and Customer Portal Users

## 1. Introduction

JOBFLOW PLUS is a multi-tenant SaaS application for service businesses. It helps organizations manage customers, jobs, contracts, recurring services, quotations, invoices, payments, follow-ups, WhatsApp notifications, customer portal access, reports, technician field operations, and GPS job verification.

Each organization works inside its own isolated workspace. Users from one organization cannot view or manage another organization's data.

## 2. User Roles

### System Admin

The System Admin manages the whole JOBFLOW PLUS platform.

System Admin can:

- View global dashboard statistics
- Create and manage organizations
- Create organization admins
- Manage plans and features
- Assign subscriptions
- Manage organization billing
- View system-wide records where allowed

System Admin should not be used for daily service operations unless required.

### Organization Admin

The Organization Admin manages one organization's operations.

Organization Admin can:

- Manage customers
- Schedule and manage jobs
- Manage users in the organization
- View reports if the plan allows
- Manage service requests
- Manage contracts, invoices, payments, quotations, and WhatsApp if enabled

### Agent

Agents usually handle customer communication and job coordination.

Agents can:

- View customers
- Add call logs
- Manage follow-ups
- Schedule jobs
- Create quotations if enabled

### Staff / Technician

Technicians use a simplified field workspace.

Technicians can:

- View assigned jobs
- Start, pause, resume, and complete jobs
- Add job notes
- Upload job photos
- Capture customer signatures
- Check in/check out with GPS if enabled

Technicians should not access system admin, organization billing, or full CRM administration.

### Customer Portal User

Customer portal users can access their own service information.

They can:

- View their jobs, contracts, invoices, payments, and quotations where enabled
- Create service requests
- Track request status

## 3. Login

Open the application in your browser:

```text
http://localhost:5173
```

Enter your email and password, then click **Sign in**.

Example seed logins:

```text
System Admin: system.admin@jobflowplus.com / 123456
Sample Cleaning Admin: admin@sample-cleaning.test / 123456
Sample Cleaning Agent: agent@sample-cleaning.test / 123456
Sample Cleaning Staff: staff@sample-cleaning.test / 123456
```

If login fails:

- Confirm backend is running on port `5000`
- Confirm frontend is running on port `5173`
- Confirm MySQL/MariaDB is running
- Confirm the database migrations are applied
- Confirm the organization and user are active

## 4. Main Navigation

The sidebar changes based on your role and plan permissions.

Common sections:

- Dashboard
- Customers
- Jobs
- Calendar
- Call Logs
- Follow-ups
- Contracts
- Quotations
- Invoices
- Payments
- Reports
- WhatsApp
- Service Requests
- Technician Workspace
- Users
- Settings

System Admin sees platform sections:

- System Dashboard
- Organizations
- Add Organization
- Add Org Admin
- Organization Billing
- Users
- Plans

Unavailable features are hidden or blocked based on subscription plan.

## 5. System Admin Guide

### 5.1 System Dashboard

The System Dashboard shows global SaaS information such as:

- Total organizations
- Active organizations
- Inactive organizations
- Total users
- Total customers
- Total jobs
- Recent organizations

### 5.2 Organizations

Go to:

```text
System Admin > Organizations
```

You can:

- List organizations
- Search organizations
- Filter by status or plan
- View organization details
- Edit organization profile
- Activate or deactivate organization

### 5.3 Organization Detail

Organization detail shows:

- Organization profile
- Status
- Current subscription
- Plan prices
- Billing cycle
- Start and end date
- Recent organization billing invoices
- Users
- Recent customers
- Recent jobs
- Recent call logs
- Feature overrides

### 5.4 Create Organization

Go to:

```text
System Admin > Add Organization
```

Enter:

- Name
- Email
- Phone
- Address
- Plan
- Status

The plan dropdown uses active plans from the Plans page.

### 5.5 Add Organization Admin

Go to:

```text
System Admin > Add Org Admin
```

Select an organization and create the admin user. The user will be linked to that organization.

### 5.6 Plans and Feature Permissions

Go to:

```text
System Admin > Plans
```

Plans control which modules an organization can use.

Features include:

- DASHBOARD
- CUSTOMERS
- JOBS
- FOLLOW_UPS
- CALL_LOGS
- REPORTS
- CONTRACTS
- RECURRING_JOBS
- QUOTATIONS
- INVOICES
- PAYMENTS
- WHATSAPP
- CUSTOMER_PORTAL
- TECHNICIAN_WORKSPACE
- GPS_TRACKING
- AI_ASSISTANT

If an organization does not have a feature, related menu items are hidden and APIs return:

```text
Feature not available in your current plan.
```

### 5.7 Organization Billing

Go to:

```text
System Admin > Organization Billing
```

Use this section to:

- Generate organization subscription invoices
- View organization billing invoices
- Record organization billing payments
- Track outstanding balances

Billing amount comes from the assigned plan and billing cycle unless an invoice amount is manually overridden.

## 6. Customers

### 6.1 Customer List

Go to:

```text
Customers
```

Use this page to view and search customer records.

### 6.2 Add Customer

Go to:

```text
Customers > Add Customer
```

Enter:

- Customer name
- Phone
- WhatsApp
- Email
- Area
- City
- Address
- Latitude
- Longitude
- Payment amount per job
- Status
- Notes
- System/service details

Latitude and longitude are used for GPS job verification.

Example coordinate entry:

```text
Latitude: 24.904250
Longitude: 67.026472
```

### 6.3 Customer Detail

Customer detail shows:

- Contact information
- Address
- Latitude and longitude
- Google Maps link
- Payment amount per job
- System details
- Job history
- Payment status
- Contract invoices
- Call history
- Follow-ups

If latitude and longitude are saved, click **Open in Google Maps** to view the customer location.

## 7. Jobs

### 7.1 Jobs List

Go to:

```text
Jobs
```

Jobs can have these statuses:

- SCHEDULED
- IN_PROGRESS
- PAUSED
- COMPLETED
- CANCELLED
- RESCHEDULED

### 7.2 Schedule Job

Go to:

```text
Jobs > Schedule Job
```

Select:

- Customer
- Scheduled date
- Scheduled time
- Agent
- Staff/technician
- Status
- Remarks

### 7.3 Job Detail

Job detail shows:

- Customer
- Schedule
- Assigned staff
- Contract information if generated from contract
- Payment/follow-up information
- Status

### 7.4 Complete Job

Click **Complete** from the jobs list or job detail page.

When a job is completed:

- Job status becomes completed
- Completion date is saved
- Follow-up may be created
- Payment/invoice foundation may be updated
- Contract recurring logic may generate the next job
- Contract billing may generate invoice if billing rule threshold is reached

## 8. Calendar

Go to:

```text
Calendar
```

The calendar shows scheduled jobs. If a job is rescheduled, the job should appear on its updated scheduled date.

## 9. Call Logs

Go to:

```text
Call Logs
```

Use call logs to record customer call outcomes.

Common responses:

- Interested
- Not interested
- Call later
- Wrong number
- No answer

## 10. Follow-Ups

Go to:

```text
Follow-ups
```

Follow-ups help agents and admins track pending customer actions after calls or jobs.

You can:

- View pending follow-ups
- Mark follow-up done
- Skip follow-up
- Call customer

## 11. Quotations / Estimates

### 11.1 Create Quotation

Go to:

```text
Quotations > Add Quotation
```

Select an existing customer or use quick-add customer where available.

A quotation contains:

- Customer
- Title
- Description
- Quotation date
- Valid until
- Items
- Discount
- Tax
- Notes
- Terms

### 11.2 Quotation Actions

You can:

- Edit quotation
- Download PDF
- Send WhatsApp if enabled
- Mark as sent
- Accept/reject
- Convert to job
- Convert to contract

## 12. Contracts / AMC

Contracts manage recurring service agreements.

### 12.1 Create Contract

Go to:

```text
Contracts > Add Contract
```

Enter:

- Customer
- Contract title
- Description
- Start date
- End date
- Contract value

Contracts usually begin as `DRAFT`.

### 12.2 Contract Services

Contract services define recurring job schedules.

Fields include:

- Service name
- Frequency type
- Frequency interval
- Total jobs
- Next job date
- Preferred time
- Assigned technician

Important rule:

The system generates the first job when the contract becomes active. It generates the next job only after the current generated job is completed.

### 12.3 Billing Rules

Billing rules are separate from service schedules.

Example:

- Annual contract
- 24 service visits
- Monthly billing
- Invoice after every 2 completed jobs

This allows billing cycles to differ from job frequency.

## 13. Invoices

Invoices can be generated from:

- Contract billing rules
- Manual/foundation invoice flows

Invoice statuses include:

- DRAFT
- GENERATED
- SENT
- PARTIALLY_PAID
- PAID
- OVERDUE
- CANCELLED

Invoice detail may include:

- Customer
- Contract
- Invoice number
- Date
- Due date
- Amount
- Paid amount
- Balance
- PDF download

## 14. Payments

Payments record money received from customers against jobs or invoices.

Payments are different from invoices:

- Invoice means amount requested from customer
- Payment means amount received from customer

When payment is recorded against an invoice:

- Paid amount increases
- Balance decreases
- Invoice payment status updates

## 15. WhatsApp Notifications

If WhatsApp is enabled for the organization, users can:

- Configure WhatsApp settings
- Manage templates
- View message logs
- Send quotation/invoice/payment/job/contract messages

The current implementation supports a mock/provider-ready foundation.

## 16. Customer Portal

Customer Portal allows customers to log in separately.

Portal users can:

- View quotations
- View contracts
- View jobs
- View invoices
- View payments
- Create service requests

Portal access depends on the organization's plan and `CUSTOMER_PORTAL` feature.

## 17. Service Requests

Customers can create service requests from the portal.

Organization staff can view service requests from:

```text
Service Requests
```

Staff/admin can:

- Review request
- Change status
- Convert request to job
- Close request
- Cancel request

## 18. Reports & Analytics

Reports may include:

- Executive dashboard
- Financial reports
- Contract reports
- Job reports
- Customer reports
- Service request reports

Reports are controlled by the `REPORTS` feature.

## 19. Technician Workspace

Technician Workspace is a simplified field operations interface.

Go to:

```text
Technician Workspace
```

Technician menu:

- Dashboard
- My Jobs
- Today
- Upcoming
- Completed
- Profile

### 19.1 Technician Dashboard

Shows:

- Today's jobs
- Pending jobs
- Completed today
- Upcoming jobs
- Recent activity

### 19.2 My Jobs

Shows jobs assigned to the technician.

Technicians can:

- View job
- Start job
- Resume job
- Complete job

Staff users can only see their own assigned jobs.

### 19.3 Technician Job Detail

Shows:

- Job information
- Customer information
- Contract/service information
- Checklist
- Notes
- Attachments/photos
- Customer signature
- Activity timeline
- GPS verification if enabled

### 19.4 Job Status Workflow

Technician workflow:

```text
SCHEDULED or RESCHEDULED -> IN_PROGRESS -> PAUSED -> IN_PROGRESS -> COMPLETED
```

Every action is logged in the activity timeline.

### 19.5 Notes

Technicians can add notes such as:

- Customer unavailable
- Additional materials required
- Service completed successfully

### 19.6 Attachments and Photos

Technicians can upload:

- Before photos
- After photos
- General attachments

Allowed formats:

- JPG
- PNG
- WEBP

### 19.7 Customer Signature

Technicians can capture customer signature from the browser.

The signature is saved with:

- Signed by name
- Signature image
- Signed date/time

## 20. GPS Tracking and Geo Verification

GPS Tracking is controlled by the `GPS_TRACKING` feature.

### 20.1 Customer Location

Customer records support:

- Latitude
- Longitude
- Address

GPS verification currently uses the customer latitude and longitude.

If coordinates are missing, verification status becomes:

```text
LOCATION_NOT_AVAILABLE
```

### 20.2 Check-In

On technician job detail, click:

```text
Check-In
```

The browser asks for location permission.

If allowed:

- Latitude is captured
- Longitude is captured
- Accuracy is captured if available
- Distance from customer location is calculated
- GPS log is created
- Job check-in time is saved

### 20.3 Check-Out

Click:

```text
Check-Out
```

Check-out is allowed only after check-in.

### 20.4 Verification Status

The system uses a 100 meter default radius.

Statuses:

- VERIFIED: technician is within allowed radius
- OUT_OF_RANGE: technician is outside allowed radius
- LOCATION_NOT_AVAILABLE: customer coordinates are missing
- NOT_CHECKED: no GPS check has happened yet

### 20.5 Google Maps Links

The GPS section can show:

- Customer location map link
- Check-in map link
- Check-out map link

Customer detail also shows an **Open in Google Maps** button when coordinates exist.

## 21. Subscription and Feature Access

Each organization has a subscription.

If organization status is inactive:

- Users from that organization are blocked

If organization is active but subscription is inactive:

- Users may log in
- Feature-based modules are hidden or blocked
- Protected APIs return feature unavailable errors

System Admin can reactivate subscription or change plan.

## 22. Common Workflows

### 22.1 New Customer to Job

1. Add customer
2. Add location coordinates if GPS will be used
3. Schedule job
4. Assign technician
5. Technician opens workspace
6. Technician checks in
7. Technician starts job
8. Technician adds notes/photos/signature
9. Technician completes job
10. Technician checks out
11. Admin reviews job/payment/follow-up

### 22.2 Quotation to Job

1. Create quotation
2. Add items
3. Send/download PDF
4. Mark accepted
5. Convert to job
6. Schedule and assign staff

### 22.3 Quotation to Contract

1. Create quotation
2. Add items
3. Customer accepts
4. Convert to contract
5. Add service schedule
6. Add billing rule
7. Activate contract
8. First job is generated

### 22.4 Contract Recurring Job Flow

1. Activate contract
2. First recurring job is generated
3. Technician completes current job
4. System creates next job
5. Billing rule checks completed job count
6. Invoice is generated when threshold is reached

## 23. Troubleshooting

### App Does Not Open

Check backend:

```powershell
http://localhost:5000/health
```

Check frontend:

```text
http://localhost:5173
```

### Cannot Login

Check:

- Database service is running
- Backend is running
- User status is ACTIVE
- Organization status is ACTIVE
- Password is correct

### Database Error: Column Does Not Exist

Run migrations:

```powershell
cd "C:\working folder\Projects\JobFlow-PLUS\backend"
npx prisma migrate dev
npx prisma generate
```

### Feature Not Available

Ask System Admin to check:

- Organization subscription status
- Assigned plan
- Plan features
- Organization feature overrides

### GPS Permission Denied

Allow location permission in the browser and try again.

On mobile, make sure:

- Location services are enabled
- Browser has location permission
- Page is opened in a supported browser

## 24. Manual Testing Checklist

### System Admin

- Login as System Admin
- View system dashboard
- Create organization
- Edit organization
- Assign plan
- View subscription details
- Generate billing invoice
- Record organization billing payment

### Organization Admin

- Login as organization admin
- Add customer
- Add latitude/longitude
- Open customer in Google Maps
- Schedule job
- Assign technician
- Create quotation
- Convert quotation to job
- Create contract
- Activate contract

### Technician

- Login as staff/technician
- Open Technician Workspace
- View assigned jobs
- Open job detail
- Check in with GPS
- Start job
- Add note
- Upload photo
- Capture signature
- Pause/resume job
- Complete job
- Check out with GPS

### Customer Portal

- Login as portal user
- View jobs/contracts/invoices/payments
- Create service request
- Confirm admin can review request

## 25. Current Limitations

The following are not implemented yet:

- Live technician tracking
- Route optimization
- Native mobile app
- Online payment gateway
- Two-way WhatsApp inbox
- Public booking portal
- AI Assistant

GPS currently verifies against customer latitude/longitude. Job-specific one-time service location can be added later if needed.

