gsheets2moneybird
=================

Google Sheets to Moneybird invoice exporter

## Setup

1. Copy `config/local.js.example` to `config/local.js` and configure as needed
2. Run the application: `npm start` and follow the steps shown.
   Repeat this step until all dependencies are met.
   Dependencies are:
   - Google Sheets service account token
   - Moneybird config file
   - Moneybird token

## How to use

For a list of options, just run: `npm start`

The application will read invoice rows from clients' Google Sheets
and create a new draft invoices in Moneybird, linked to the Dummy Client. 

Once you've sent an invoice to the client, put the invoice number
back into the relevant Google Sheet rows, so they won't be included
in new invoices. 

Below are some examples.

### Show invoiceable amount of money for all clients

`npm start -- --status`

### Create invoices in MoneyBird

`npm start -- --create-invoice`

### Create invoice for only 'fooClient' and 'barClient'

`npm start -- --create-invoice --clients fooClient,barClient`

### Show revenue for January 2020

`npm start -- --status --month 2020-01`

### Download unpaid invoice PDFs

`npm start -- --dl-pdf`

## Assumptions

This was written for my own particular use case, so
you'll probably have to tweak some things.

There should be one Google Sheet per client, with these columns:

1. Date
2. Amount of hours worked
3. Hourly rate (optional, uses config.defaultFee if not set)
4. Client name (optional) - 
   for sub-clients, gets prepended to the invoice row if set
5. Description of the work
6. Invoice number - if this is set, the row will not be included
   in new invoices

Column names can be configured in [config/local.js](config/local.js)

Currency is hardcoded to Euro.

Dutch (DD-MM-YYYY) date formats are assumed for '00-00-0000'-style dates, and
numbers are formatted Dutch-style during `--status`.
