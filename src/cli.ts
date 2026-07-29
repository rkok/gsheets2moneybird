import cargs = require('command-line-args');
import cusage = require('command-line-usage');
import { CommandLineArgs } from './types/internal';

export const commandNames = ['create-invoice', 'dl-pdf', 'list-invoices', 'register-payment', 'status'] as const;
export type CommandName = typeof commandNames[number];

export const parseArgs = (): CommandLineArgs => {
  const args = cargs([
    { name: 'command', defaultOption: true },
    { name: 'clients' },
    { name: 'debug', type: Boolean },
    { name: 'financial-account-id', type: String },
    { name: 'format', type: String },
    { name: 'help', type: Boolean },
    { name: 'invoice', type: String },
    { name: 'manual-payment-action', type: String },
    { name: 'month', type: String },
    { name: 'payment-date', type: String },
    { name: 'test', type: Boolean },
    { name: 'unpaid', type: Boolean },
    { name: 'year', type: Number }
  ]) as CommandLineArgs;

  if (isCommand(args.command)) {
    args[args.command] = true;
  }

  return args;
};

export const isCommand = (command?: string): command is CommandName => {
  return commandNames.includes(command as CommandName);
};

export const usage = (): string => cusage([
  {
    content: `Usage: gs2mb <command> [options]\n\nCommands: ${commandNames.join(', ')}`
  },
  {
    header: 'Options',
    optionList: [
      {
        name: 'clients',
        typeLabel: '{underline client1[,client2,...]}',
        description: 'Filter names of clients to include'
      },
      {
        name: 'debug',
        type: Boolean,
        description: 'Enable debug logging'
      },
      {
        name: 'financial-account-id',
        type: String,
        description: 'Moneybird financial account ID for register-payment. Overrides config default; otherwise auto-picks when only one account exists.'
      },
      {
        name: 'format',
        type: String,
        description: 'Output format for list-invoices: human or json. Defaults to human.'
      },
      {
        name: 'help',
        type: Boolean,
        description: 'Print this usage guide.'
      },
      {
        name: 'invoice',
        type: String,
        description: 'Invoice number for register-payment, e.g. 2026-0034'
      },
      {
        name: 'manual-payment-action',
        type: String,
        description: 'Payment action for register-payment. Defaults to private_payment.'
      },
      {
        name: 'month',
        type: String,
        description: 'Year and month to calculate revenue for. Will INCLUDE hours which are already invoiced.'
      },
      {
        name: 'payment-date',
        type: String,
        description: 'Payment date for register-payment, YYYY-MM-DD'
      },
      {
        name: 'test',
        type: Boolean,
        description: 'Use data from test csv instead of Google Sheets'
      },
      {
        name: 'unpaid',
        type: Boolean,
        description: 'Only show unpaid invoices for list-invoices'
      },
      {
        name: 'year',
        type: Number
      }
    ]
  }
]);
