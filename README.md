# My Pay Tracker

My Pay Tracker is a simple browser-based work time and paycheck estimator.

It lets a user enter:

- Hourly wage
- Work date
- Clock-in time
- Clock-out time
- Unpaid break time
- Optional notes
- Federal tax settings based on W-4-style information
- State withholding, if applicable

The app then estimates:

- Hours worked
- Gross pay
- Federal income tax withholding
- Social Security
- Medicare
- State withholding
- Estimated take-home pay

It also keeps a history of previous pay periods.

## How to Use It

1. Open the app in a web browser.
2. Open **Pay & Tax Settings**.
3. Enter your hourly wage.
4. Select your federal filing status.
5. Enter any W-4-related information that applies to you, including dependents, other income, deductions, or extra withholding.
6. Enter state withholding if your state requires it. Texas users can leave this at $0.
7. Save the pay and tax settings.
8. Enter the date worked.
9. Enter clock-in and clock-out times.
10. Enter unpaid break minutes, if any.
11. Add optional notes.
12. Save the work day.

The app will calculate the work period totals and show an estimated take-home paycheck.

## Editing Work Days

Saved work days appear in the **Saved Work Days** section.

Use:

- **Edit** to correct a saved entry
- **Delete** to remove an entry

Saved work days are displayed in chronological order.

## Paycheck History

Use the **Paycheck History** tab to view previous payroll periods.

Each previous period shows:

- Hours worked
- Gross pay
- Federal withholding
- Social Security and Medicare
- Estimated take-home pay

## Tax Estimates

The app uses 2026 federal withholding estimates and employee payroll tax rates.

Federal withholding depends on the tax settings entered by the user.

Social Security and Medicare are calculated separately.

Tax calculations are estimates only. Actual payroll results can differ because of employer payroll systems, benefits, retirement contributions, insurance, local taxes, pretax deductions, or other payroll adjustments.

## Data Storage

The app stores settings and work entries locally in the browser using local storage.

That means:

- No account is required.
- Data stays on the device and browser being used.
- Clearing browser storage may erase saved data.
- Data does not automatically sync between devices.

## Payroll Period

The current version is designed around a Tuesday-based weekly payroll cycle with payment on Friday.

## Technology

The app is built with:

- HTML
- CSS
- JavaScript
- Browser local storage

No server or database is currently required.

## Future Ideas

Possible future improvements include:

- Installable Progressive Web App support
- Android app packaging
- Cloud backup and login
- Exporting paycheck history
- More detailed deductions
- Company-specific payroll settings
- Additional apps and tools

## Disclaimer

My Pay Tracker is a paycheck estimation tool and is not payroll, tax, legal, or financial advice.

Always compare estimates with an actual pay stub or official payroll system.

## Copyright

© 2026 API LLC. All rights reserved.
