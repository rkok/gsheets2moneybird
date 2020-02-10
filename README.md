gsheets2moneybird
=================

Google Sheets to Moneybird invoice exporter

## Setup

1. Copy `config/config.json.example` to `config/config.json` and configure as needed
2. Run the application: `node ./` and follow the steps shown.  
   Repeat this step until all dependencies are met.
   Dependencies are:
   - Google Sheets service account token
   - Moneybird config file
   - Moneybird token

## How to use

Run: `node ./ <clientname>`

This will read invoice rows from the client's Google Sheet
and create a new draft invoice in Moneybird for the Dummy Client. 

## Assumptions

This was written for my own particular use case, so
you'll probably have to tweak some things.

There should be one Google Sheet per client, with these columns:

1. Date
2. Amount of hours worked
3. Hourly rate (optional, uses config.defaultRate if not set)
4. Client name (optional) - 
   for sub-clients, gets prepended to the invoice row if set
5. Description of the work
6. Invoice number - if this is set, the row will not be included
   in new invoices

Column names are hardcoded in `src/sheetParser.js`.
