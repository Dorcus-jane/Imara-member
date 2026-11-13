import { Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { StatementData } from '../data/types';
import { formatDate, formatUGX } from './format';

export function statementText(s: StatementData): string {
  return [
    'IMARA SACCO',
    'Member statement',
    `${s.member.fullName} · ${s.member.memberNumber}`,
    `${s.monthLabel} (${s.rangeLabel})`,
    '',
    `Opening savings: ${formatUGX(s.opening)}`,
    `Deposits this period: ${formatUGX(s.depositsInPeriod)}`,
    `Closing savings: ${formatUGX(s.closing)}`,
    '',
    `Loans approved: ${formatUGX(s.loansApproved)}`,
    `Repayments: ${formatUGX(s.repayments)}`,
    '',
    `Updated ${formatDate(s.updatedOn)} · Example data`,
  ].join('\n');
}

export async function shareStatement(s: StatementData): Promise<void> {
  await Share.share({ message: statementText(s) });
}

function statementHtml(s: StatementData): string {
  const row = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:6px 0;color:${bold ? '#18352B' : '#626F66'};font-weight:${bold ? 600 : 400}">${label}</td>` +
    `<td style="padding:6px 0;text-align:right;color:#18352B;font-weight:${bold ? 700 : 500}">${value}</td></tr>`;
  return `<html><body style="font-family:Helvetica,Arial,sans-serif;padding:40px;color:#18352B;background:#ffffff">
    <div style="font-size:11px;letter-spacing:1.5px;color:#626F66">IMARA SACCO</div>
    <h1 style="margin:6px 0 4px;font-size:28px">Member statement</h1>
    <div style="color:#626F66;font-size:14px">${s.member.fullName} · ${s.member.memberNumber}</div>
    <div style="color:#626F66;font-size:14px;margin-bottom:24px">${s.monthLabel} (${s.rangeLabel})</div>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      ${row('Opening savings', formatUGX(s.opening))}
      ${row('Deposits this period', formatUGX(s.depositsInPeriod))}
      ${row('Closing savings', formatUGX(s.closing), true)}
    </table>
    <hr style="border:none;border-top:1px solid #DFE3DA;margin:16px 0"/>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      ${row('Loans approved', formatUGX(s.loansApproved))}
      ${row('Repayments', formatUGX(s.repayments))}
    </table>
    <p style="margin-top:28px;font-size:12px;color:#626F66">Updated ${formatDate(s.updatedOn)} · Example data.
    This statement contains personal financial information. Share it only with people you trust.</p>
  </body></html>`;
}

// Makes a PDF and opens the phone's share sheet so it can be saved or sent.
export async function downloadStatementPdf(s: StatementData): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: statementHtml(s) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Imara member statement' });
  }
}
