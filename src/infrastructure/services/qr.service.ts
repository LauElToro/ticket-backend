import crypto from 'crypto';
import QRCode from 'qrcode';
import { config } from '../config';

export class QRService {
  /**
   * Genera un código QR único para una entrada
   */
  static generateQRCode(ticketId: string, eventId: string, ownerId: string): string {
    const data = JSON.stringify({
      ticketId,
      eventId,
      ownerId,
      timestamp: Date.now(),
    });
    
    // Firmar el QR con el secret key
    const signature = crypto
      .createHmac('sha256', config.qr.secretKey)
      .update(data)
      .digest('hex');
    
    return `${data}.${signature}`;
  }

  /**
   * Genera un hash único para validación rápida
   */
  static generateQRHash(ticketId: string, eventId: string, ownerId: string): string {
    const data = `${ticketId}-${eventId}-${ownerId}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Valida un código QR
   */
  static validateQRCode(qrCode: string): { valid: boolean; data?: any } {
    try {
      const [data, signature] = qrCode.split('.');
      if (!data || !signature) {
        return { valid: false };
      }

      const expectedSignature = crypto
        .createHmac('sha256', config.qr.secretKey)
        .update(data)
        .digest('hex');

      if (signature !== expectedSignature) {
        return { valid: false };
      }

      const parsed = JSON.parse(data);
      return { valid: true, data: parsed };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Genera una imagen QR en formato base64 o buffer
   */
  static async generateQRImage(qrCode: string, options?: { size?: number; format?: 'png' | 'svg' }): Promise<string> {
    const size = options?.size || 300;
    const format = options?.format || 'png';

    try {
      if (format === 'svg') {
        return await QRCode.toString(qrCode, { type: 'svg', width: size });
      }
      return await QRCode.toDataURL(qrCode, { width: size, margin: 2 });
    } catch (error) {
      throw new Error('Error al generar imagen QR');
    }
  }

  /**
   * Genera un buffer PNG del QR
   */
  static async generateQRBuffer(qrCode: string, options?: { size?: number }): Promise<Buffer> {
    const size = options?.size || 300;
    try {
      return await QRCode.toBuffer(qrCode, { width: size, margin: 2 });
    } catch (error) {
      throw new Error('Error al generar buffer QR');
    }
  }

  /**
   * Genera un código de transferencia único
   */
  static generateTransferCode(ticketId: string, fromUserId: string): string {
    const data = `${ticketId}-${fromUserId}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16).toUpperCase();
  }

  /**
   * Genera un QR personal para un usuario (para recibir transferencias)
   */
  static generatePersonalQRCode(userId: string): { qrCode: string; qrHash: string } {
    const data = JSON.stringify({
      type: 'USER_QR',
      userId,
      timestamp: Date.now(),
    });
    
    const signature = crypto
      .createHmac('sha256', config.qr.secretKey)
      .update(data)
      .digest('hex');
    
    const qrCode = `${data}.${signature}`;
    const qrHash = crypto.createHash('sha256').update(qrCode).digest('hex');
    
    return { qrCode, qrHash };
  }

  /**
   * Valida y extrae el userId de un QR personal
   */
  static validatePersonalQRCode(qrCode: string): { valid: boolean; userId?: string } {
    try {
      const [data, signature] = qrCode.split('.');
      if (!data || !signature) {
        return { valid: false };
      }

      const expectedSignature = crypto
        .createHmac('sha256', config.qr.secretKey)
        .update(data)
        .digest('hex');

      if (signature !== expectedSignature) {
        return { valid: false };
      }

      const parsed = JSON.parse(data);
      if (parsed.type !== 'USER_QR' || !parsed.userId) {
        return { valid: false };
      }

      return { valid: true, userId: parsed.userId };
    } catch {
      return { valid: false };
    }
  }
}

