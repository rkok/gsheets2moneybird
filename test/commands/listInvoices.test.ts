import { runListInvoices } from '../../src/commands/listInvoices';

const invoices = [
  { id: '1', invoice_id: '2024-0001', contact_id: 'c', invoice_date: '2024-01-31', total_unpaid: '0.00' },
  { id: '2', invoice_id: '2024-0002', contact_id: 'c', invoice_date: '2024-02-01', total_unpaid: '12.00' }
];

const runJson = async (args: Record<string, unknown>) => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const mb = { init: jest.fn(), getAllSalesInvoices: jest.fn().mockResolvedValue(invoices) };
  await runListInvoices({ command: 'list-invoices', format: 'json', ...args }, mb);
  const result = JSON.parse(log.mock.calls[0][0]);
  log.mockRestore();
  return { mb, invoiceIds: result.map((invoice: { invoice_id: string }) => invoice.invoice_id) };
};

describe('runListInvoices', () => {
  it('passes month as a Moneybird period filter', async () => {
    const { mb } = await runJson({ month: '2024-02' });
    expect(mb.getAllSalesInvoices).toHaveBeenCalledWith('state:all,period:20240201..20240301');
  });

  it('passes year as a Moneybird period filter and filters unpaid locally', async () => {
    const { mb, invoiceIds } = await runJson({ year: 2024, unpaid: true });
    expect(mb.getAllSalesInvoices).toHaveBeenCalledWith('state:all,period:20240101..20241231');
    expect(invoiceIds).toEqual(['2024-0002']);
  });
});
