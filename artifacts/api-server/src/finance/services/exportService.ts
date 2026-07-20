import { db, transactionsTable } from "@workspace/db";
import { eq, and, sql, gte, lt, desc } from "drizzle-orm";

export interface ExportFilters {
  branchId?: number;
  startDate?: Date;
  endDate?: Date;
  category?: string;
  type?: string;
}

export interface ExportRow {
  id: number;
  date: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  referenceType: string | null;
  referenceCode: string | null;
  sourceModule: string | null;
  status: string;
}

export async function getExportData(filters: ExportFilters): Promise<ExportRow[]> {
  const conditions = [];
  if (filters.branchId) {
    conditions.push(eq(transactionsTable.branchId, filters.branchId));
  }
  if (filters.category) {
    conditions.push(eq(transactionsTable.category, filters.category));
  }
  if (filters.type) {
    conditions.push(eq(transactionsTable.type, filters.type));
  }
  if (filters.startDate) {
    conditions.push(sql`${transactionsTable.createdAt} >= ${filters.startDate}`);
  }
  if (filters.endDate) {
    conditions.push(sql`${transactionsTable.createdAt} <= ${filters.endDate}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(whereClause)
    .orderBy(desc(transactionsTable.createdAt));

  return rows.map((row) => ({
    id: row.id,
    date: row.createdAt.toISOString(),
    type: row.type,
    category: row.category,
    description: row.description,
    amount: parseFloat(row.amount),
    referenceType: row.referenceType,
    referenceCode: row.referenceCode,
    sourceModule: row.sourceModule,
    status: row.status,
  }));
}

export function generateCSV(data: ExportRow[]): string {
  const headers = ["ID", "Tanggal", "Tipe", "Kategori", "Deskripsi", "Jumlah", "Referensi", "Kode Referensi", "Modul Sumber", "Status"];
  const rows = data.map((row) => [
    row.id,
    row.date,
    row.type,
    row.category,
    row.description,
    row.amount,
    row.referenceType || "",
    row.referenceCode || "",
    row.sourceModule || "",
    row.status,
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  return csvContent;
}

export function generateExcel(data: ExportRow[]): string {
  const headers = ["ID", "Tanggal", "Tipe", "Kategori", "Deskripsi", "Jumlah", "Referensi", "Kode Referensi", "Modul Sumber", "Status"];
  const rows = data.map((row) => [
    row.id,
    row.date,
    row.type,
    row.category,
    row.description,
    row.amount,
    row.referenceType || "",
    row.referenceCode || "",
    row.sourceModule || "",
    row.status,
  ]);

  let xml = '<?xml version="1.0"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '  <Worksheet ss:Name="Finance Export">\n';
  xml += '    <Table>\n';

  xml += '      <Row>\n';
  for (const header of headers) {
    xml += `        <Cell><Data ss:Type="String">${header}</Data></Cell>\n`;
  }
  xml += '      </Row>\n';

  for (const row of rows) {
    xml += '      <Row>\n';
    for (const cell of row) {
      xml += `        <Cell><Data ss:Type="String">${cell}</Data></Cell>\n`;
    }
    xml += '      </Row>\n';
  }

  xml += '    </Table>\n';
  xml += '  </Worksheet>\n';
  xml += '</Workbook>';

  return xml;
}

export function generatePDFPlaceholder(data: ExportRow[]): string {
  return `
    <html>
    <head>
      <title>Finance Export</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Finance Export</h1>
      <p>Tanggal: ${new Date().toLocaleDateString("id-ID")}</p>
      <p>Total Transaksi: ${data.length}</p>
      <table>
        <tr>
          <th>ID</th>
          <th>Tanggal</th>
          <th>Tipe</th>
          <th>Kategori</th>
          <th>Deskripsi</th>
          <th>Jumlah</th>
        </tr>
        ${data.map((row) => `
        <tr>
          <td>${row.id}</td>
          <td>${new Date(row.date).toLocaleDateString("id-ID")}</td>
          <td>${row.type}</td>
          <td>${row.category}</td>
          <td>${row.description}</td>
          <td>Rp ${row.amount.toLocaleString("id-ID")}</td>
        </tr>
        `).join("")}
      </table>
    </body>
    </html>
  `;
}
