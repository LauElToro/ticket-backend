import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../../application/services/payment.service';
import { OrderRepository } from '../../infrastructure/repositories/OrderRepository';
import { prisma } from '../../infrastructure/database/prisma';

export class PaymentController {
  private paymentService: PaymentService;
  private orderRepository: OrderRepository;

  constructor() {
    this.paymentService = new PaymentService();
    this.orderRepository = new OrderRepository();
  }

  async createMercadoPagoPreference(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { orderId, payerEmail, payerName, payerDni, tickets } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'No autenticado' },
        });
      }

      // Obtener la orden
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: { message: 'Orden no encontrada' },
        });
      }

      // Verificar que la orden pertenece al usuario
      if (order.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: { message: 'No autorizado' },
        });
      }

      // Construir items para MercadoPago
      let items: Array<{ title: string; quantity: number; unit_price: number }> = [];
      
      // Si se pasan tickets desde el frontend, usarlos (preferido)
      if (tickets && Array.isArray(tickets) && tickets.length > 0) {
        // Obtener tipos de entrada del evento
        const eventWithTypes = await prisma.event.findUnique({
          where: { id: order.eventId },
          include: { ticketTypes: true },
        });
        
        items = tickets.map((ticket: any) => {
          const ticketType = eventWithTypes?.ticketTypes.find((tt: any) => tt.id === ticket.ticketTypeId);
          return {
            title: `${ticketType?.name || 'Entrada'} - ${order.event.title}`,
            quantity: ticket.quantity || 1,
            unit_price: Number(ticketType?.price || 0),
          };
        });
      } else if (order.tickets && order.tickets.length > 0) {
        // Si hay tickets creados (pago en efectivo), usarlos
        const ticketsByType: Record<string, number> = {};
        const ticketTypesMap: Record<string, any> = {};
        
        order.tickets.forEach((ticket: any) => {
          const typeId = ticket.ticketTypeId;
          if (!ticketsByType[typeId]) {
            ticketsByType[typeId] = 0;
            ticketTypesMap[typeId] = ticket.ticketType;
          }
          ticketsByType[typeId]++;
        });
        
        items = Object.entries(ticketsByType).map(([typeId, quantity]) => ({
          title: `${ticketTypesMap[typeId].name} - ${order.event.title}`,
          quantity: quantity as number,
          unit_price: Number(ticketTypesMap[typeId].price),
        }));
      } else {
        // Fallback: crear un item único con el total
        items.push({
          title: order.event.title,
          quantity: 1,
          unit_price: Number(order.totalAmount),
        });
      }

      const preference = await this.paymentService.createMercadoPagoPreference({
        orderId,
        items,
        payerEmail: payerEmail || order.user.email,
        payerName: payerName || order.user.name,
        payerDni: payerDni || order.user.dni,
      });

      res.json({
        success: true,
        data: preference,
      });
    } catch (error) {
      next(error);
    }
  }
}

