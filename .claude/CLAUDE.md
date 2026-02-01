# gsheets2moneybird

A Node.js CLI tool that automates invoice generation by syncing time tracking data from Google Sheets to Moneybird (Dutch accounting platform).

## What it does

- Reads time tracking entries from Google Sheets
- Parses and aggregates billable hours per client
- Calculates invoice totals with configurable hourly rates
- Creates invoices in Moneybird via their API
- Downloads invoice PDFs for record keeping

## Structure

- `src/api/` - API integrations (Google Sheets, Moneybird)
- `src/types/` - TypeScript type definitions
- `src/model/` - Data models (InvoiceRow)
- `src/script/` - Helper scripts (OAuth token generation)
- `src/index.ts` - Main CLI entry point
- `config/` - Configuration files (not in repo, see setup requirements)

## Rules

Whenever running `node` or `npm` commands, prepend them with: `source /home/x/.nvm/nvm.sh --no-use && nvm use --delete-prefix --silent &&`

TODOs for this project are maintained in TODO.txt.
