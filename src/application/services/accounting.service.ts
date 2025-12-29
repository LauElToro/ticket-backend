import { PrismaClient, Decimal } from '@prisma/client';

const prisma = new PrismaClient();

export interface AccountingConfigData {
  profitMargin: number;
  fixedCosts: number;
  variableCostsPercent: number;
  taxesPercent: number;
  commissionsPercent: number;
  platformFeePercent: number;
}

export class AccountingService {
  /**
   * Obtiene la configuración contable de un usuario
   */
  static async getConfig(userId: string) {
    let config = await prisma.accountingConfig.findUnique({
      where: { userId },
    });

    // Si no existe, crear una configuración por defecto
    if (!config) {
      config = await prisma.accountingConfig.create({
        data: {
          userId,
          profitMargin: new Decimal(0),
          fixedCosts: new Decimal(0),
          variableCostsPercent: new Decimal(0),
          taxesPercent: new Decimal(0),
          commissionsPercent: new Decimal(0),
          platformFeePercent: new Decimal(0),
        },
      });
    }

    return {
      profitMargin: Number(config.profitMargin),
      fixedCosts: Number(config.fixedCosts),
      variableCostsPercent: Number(config.variableCostsPercent),
      taxesPercent: Number(config.taxesPercent),
      commissionsPercent: Number(config.commissionsPercent),
      platformFeePercent: Number(config.platformFeePercent),
    };
  }

  /**
   * Actualiza la configuración contable de un usuario
   */
  static async updateConfig(userId: string, data: AccountingConfigData) {
    const config = await prisma.accountingConfig.upsert({
      where: { userId },
      update: {
        profitMargin: new Decimal(data.profitMargin),
        fixedCosts: new Decimal(data.fixedCosts),
        variableCostsPercent: new Decimal(data.variableCostsPercent),
        taxesPercent: new Decimal(data.taxesPercent),
        commissionsPercent: new Decimal(data.commissionsPercent),
        platformFeePercent: new Decimal(data.platformFeePercent),
      },
      create: {
        userId,
        profitMargin: new Decimal(data.profitMargin),
        fixedCosts: new Decimal(data.fixedCosts),
        variableCostsPercent: new Decimal(data.variableCostsPercent),
        taxesPercent: new Decimal(data.taxesPercent),
        commissionsPercent: new Decimal(data.commissionsPercent),
        platformFeePercent: new Decimal(data.platformFeePercent),
      },
    });

    return {
      profitMargin: Number(config.profitMargin),
      fixedCosts: Number(config.fixedCosts),
      variableCostsPercent: Number(config.variableCostsPercent),
      taxesPercent: Number(config.taxesPercent),
      commissionsPercent: Number(config.commissionsPercent),
      platformFeePercent: Number(config.platformFeePercent),
    };
  }

  /**
   * Calcula métricas contables basadas en ingresos y configuración
   */
  static async calculateMetrics(userId: string, revenue: number) {
    const config = await this.getConfig(userId);

    const variableCosts = (revenue * config.variableCostsPercent) / 100;
    const taxes = (revenue * config.taxesPercent) / 100;
    const commissions = (revenue * config.commissionsPercent) / 100;
    const platformFee = (revenue * config.platformFeePercent) / 100;
    const totalCosts = config.fixedCosts + variableCosts + taxes + commissions + platformFee;
    const grossProfit = revenue - totalCosts;
    const profitMargin = (grossProfit / revenue) * 100;
    const netProfit = grossProfit - (revenue * config.profitMargin) / 100;

    return {
      revenue,
      variableCosts,
      taxes,
      commissions,
      platformFee,
      fixedCosts: config.fixedCosts,
      totalCosts,
      grossProfit,
      profitMargin,
      netProfit,
    };
  }
}

