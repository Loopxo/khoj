import csv from 'csv-writer';
import { Builder } from 'xml2js';
import XLSX from 'xlsx';
import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'xml' | 'jsonl';

export interface ExportOptions {
  format: ExportFormat;
  filters?: {
    scraperId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
    limit?: number;
  };
  fields?: string[];
  includeMetadata?: boolean;
}

export interface ExportResult {
  id: string;
  url: string;
  filename: string;
  size: number;
  recordCount: number;
  expiresAt: Date;
}

export class ExportService {
  private static readonly EXPORT_DIR = process.env.EXPORT_DIR || './exports';
  private static readonly EXPORT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  static async exportRuns(userId: string, options: ExportOptions): Promise<ExportResult> {
    logger.info(`Creating export for user ${userId}`, { options });

    // Create export record
    const exportRecord = await prisma.export.create({
      data: {
        userId,
        format: options.format.toUpperCase() as any,
        filters: options.filters || {},
        status: 'PENDING',
        expiresAt: new Date(Date.now() + this.EXPORT_TTL)
      }
    });

    try {
      // Fetch data based on filters
      const data = await this.fetchRunData(userId, options.filters);
      
      // Process and export data
      const result = await this.processExport(data, options);
      
      // Update export record
      await prisma.export.update({
        where: { id: exportRecord.id },
        data: {
          status: 'COMPLETED',
          url: result.url,
          size: result.size
        }
      });

      return {
        id: exportRecord.id,
        url: result.url,
        filename: result.filename,
        size: result.size,
        recordCount: data.length,
        expiresAt: exportRecord.expiresAt
      };

    } catch (error) {
      logger.error('Export failed:', error);
      
      await prisma.export.update({
        where: { id: exportRecord.id },
        data: { status: 'FAILED' }
      });

      throw error;
    }
  }

  private static async fetchRunData(userId: string, filters: any = {}) {
    const where: any = {
      scraper: { userId }
    };

    if (filters.scraperId) {
      where.scraperId = filters.scraperId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const runs = await prisma.run.findMany({
      where,
      include: {
        scraper: {
          select: { name: true, url: true }
        },
        version: {
          select: { prompt: true, version: true }
        },
        metrics: true
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 10000
    });

    return runs;
  }

  private static async processExport(data: any[], options: ExportOptions) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `khoj-export-${timestamp}.${options.format}`;
    const filepath = `${this.EXPORT_DIR}/${filename}`;

    // Ensure export directory exists
    await this.ensureExportDir();

    // Transform data for export
    const transformedData = this.transformDataForExport(data, options);

    let size: number;

    switch (options.format) {
      case 'csv':
        size = await this.exportToCSV(transformedData, filepath);
        break;
      case 'json':
        size = await this.exportToJSON(transformedData, filepath);
        break;
      case 'jsonl':
        size = await this.exportToJSONL(transformedData, filepath);
        break;
      case 'xlsx':
        size = await this.exportToXLSX(transformedData, filepath);
        break;
      case 'xml':
        size = await this.exportToXML(transformedData, filepath);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    const url = `/exports/${filename}`;

    return { url, filename, size };
  }

  private static transformDataForExport(data: any[], options: ExportOptions) {
    return data.map(run => {
      const baseData = {
        id: run.id,
        scraper_name: run.scraper.name,
        scraper_url: run.scraper.url,
        status: run.status,
        started_at: run.startedAt?.toISOString(),
        finished_at: run.finishedAt?.toISOString(),
        created_at: run.createdAt.toISOString()
      };

      // Add extracted data
      if (run.result && Array.isArray(run.result)) {
        run.result.forEach((item: any, index: number) => {
          Object.keys(item).forEach(key => {
            baseData[`data_${key}`] = item[key];
          });
          if (index === 0) return; // Only include first item for now
        });
      }

      // Add metadata if requested
      if (options.includeMetadata) {
        Object.assign(baseData, {
          prompt: run.version?.prompt,
          version: run.version?.version,
          execution_time: run.metrics?.executionTime,
          items_extracted: run.metrics?.itemsExtracted,
          memory_used: run.metrics?.memoryUsed,
          engine_used: run.metrics?.engineUsed,
          error_count: run.metrics?.errors,
          retry_count: run.metrics?.retries
        });
      }

      // Filter fields if specified
      if (options.fields && options.fields.length > 0) {
        const filtered: any = {};
        options.fields.forEach(field => {
          if (baseData[field] !== undefined) {
            filtered[field] = baseData[field];
          }
        });
        return filtered;
      }

      return baseData;
    });
  }

  private static async exportToCSV(data: any[], filepath: string): Promise<number> {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]).map(key => ({
      id: key,
      title: key.replace(/_/g, ' ').toUpperCase()
    }));

    const csvWriter = csv.createObjectCsvWriter({
      path: filepath,
      header: headers
    });

    await csvWriter.writeRecords(data);
    
    const fs = await import('fs');
    const stats = await fs.promises.stat(filepath);
    return stats.size;
  }

  private static async exportToJSON(data: any[], filepath: string): Promise<number> {
    const fs = await import('fs');
    const jsonData = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(filepath, jsonData, 'utf8');
    return Buffer.byteLength(jsonData, 'utf8');
  }

  private static async exportToJSONL(data: any[], filepath: string): Promise<number> {
    const fs = await import('fs');
    const jsonlData = data.map(item => JSON.stringify(item)).join('\n');
    await fs.promises.writeFile(filepath, jsonlData, 'utf8');
    return Buffer.byteLength(jsonlData, 'utf8');
  }

  private static async exportToXLSX(data: any[], filepath: string): Promise<number> {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Khoj Export');
    XLSX.writeFile(workbook, filepath);
    
    const fs = await import('fs');
    const stats = await fs.promises.stat(filepath);
    return stats.size;
  }

  private static async exportToXML(data: any[], filepath: string): Promise<number> {
    const builder = new Builder({
      rootName: 'khoj_export',
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });

    const xmlData = {
      metadata: {
        exported_at: new Date().toISOString(),
        record_count: data.length
      },
      runs: data.map(item => ({ run: item }))
    };

    const xml = builder.buildObject(xmlData);
    
    const fs = await import('fs');
    await fs.promises.writeFile(filepath, xml, 'utf8');
    return Buffer.byteLength(xml, 'utf8');
  }

  private static async ensureExportDir() {
    const fs = await import('fs');
    try {
      await fs.promises.access(this.EXPORT_DIR);
    } catch {
      await fs.promises.mkdir(this.EXPORT_DIR, { recursive: true });
    }
  }

  static async cleanupExpiredExports() {
    logger.info('Cleaning up expired exports');
    
    const expiredExports = await prisma.export.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: 'COMPLETED'
      }
    });

    const fs = await import('fs');
    
    for (const exportRecord of expiredExports) {
      try {
        if (exportRecord.url) {
          const filepath = `${this.EXPORT_DIR}/${exportRecord.url.split('/').pop()}`;
          await fs.promises.unlink(filepath);
        }
        
        await prisma.export.delete({
          where: { id: exportRecord.id }
        });
        
        logger.info(`Cleaned up expired export: ${exportRecord.id}`);
      } catch (error) {
        logger.error(`Failed to cleanup export ${exportRecord.id}:`, error);
      }
    }
  }

  static async getExportStats(userId: string) {
    const stats = await prisma.export.groupBy({
      by: ['format', 'status'],
      where: { userId },
      _count: true
    });

    const totalSize = await prisma.export.aggregate({
      where: { 
        userId,
        status: 'COMPLETED'
      },
      _sum: { size: true }
    });

    return {
      byFormat: stats,
      totalSize: totalSize._sum.size || 0
    };
  }
}

// Schedule cleanup of expired exports
setInterval(() => {
  ExportService.cleanupExpiredExports().catch(error => {
    logger.error('Failed to cleanup expired exports:', error);
  });
}, 60 * 60 * 1000); // Run every hour