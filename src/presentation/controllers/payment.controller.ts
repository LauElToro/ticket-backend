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
      
      // Obtener el evento con sus tandas para calcular precios
      const eventWithTandas = await prisma.event.findUnique({
        where: { id: order.eventId },
        include: {
          tandas: {
            where: { isActive: true },
            include: {
              tandaTicketTypes: {
                include: {
                  ticketType: true,
                },
              },
            },
            orderBy: {
              startDate: 'asc',
            },
          },
          ticketTypes: true,
        },
      });

      if (!eventWithTandas) {
        return res.status(404).json({
          success: false,
          error: { message: 'Evento no encontrado' },
        });
      }

      // Encontrar la tanda activa
      const now = new Date();
      let activeTanda = eventWithTandas.tandas.find((tanda) => {
        const startDate = tanda.startDate ? new Date(tanda.startDate) : null;
        const endDate = tanda.endDate ? new Date(tanda.endDate) : null;
        
        if (startDate && endDate) {
          return now >= startDate && now <= endDate;
        } else if (startDate) {
          return now >= startDate;
        } else if (endDate) {
          return now <= endDate;
        }
        return true;
      });

      if (!activeTanda) {
        activeTanda = eventWithTandas.tandas.find((t) => t.isActive) || eventWithTandas.tandas[0];
      }

      if (!activeTanda) {
        return res.status(400).json({
          success: false,
          error: { message: 'No hay tandas activas para este evento' },
        });
      }
      
      // Si se pasan tickets desde el frontend, usarlos (preferido)
      if (tickets && Array.isArray(tickets) && tickets.length > 0) {
        items = tickets.map((ticket: any) => {
          const ticketType = eventWithTandas.ticketTypes.find((tt: any) => tt.id === ticket.ticketTypeId);
          
          // Obtener el precio desde la tanda activa
          const tandaTicketType = activeTanda.tandaTicketTypes.find(
            (ttt) => ttt.ticketTypeId === ticket.ticketTypeId
          );
          
          if (!tandaTicketType) {
            throw new Error(`No se encontró precio para ${ticketType?.name || 'entrada'} en la tanda activa`);
          }
          
          // Convertir Decimal de Prisma a número
          const price = typeof tandaTicketType.price === 'object' && tandaTicketType.price !== null
            ? parseFloat(tandaTicketType.price.toString())
            : Number(tandaTicketType.price);
          
          if (isNaN(price) || price <= 0) {
            throw new Error(`Precio inválido para ${ticketType?.name || 'entrada'}: ${price}`);
          }
          
          return {
            title: `${ticketType?.name || 'Entrada'} - ${order.event.title}`,
            quantity: ticket.quantity || 1,
            unit_price: parseFloat(price.toFixed(2)), // Asegurar 2 decimales
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
        
        items = Object.entries(ticketsByType).map(([typeId, quantity]) => {
          // Obtener el precio desde la tanda activa
          const tandaTicketType = activeTanda.tandaTicketTypes.find(
            (ttt) => ttt.ticketTypeId === typeId
          );
          
          if (!tandaTicketType) {
            throw new Error(`No se encontró precio para ${ticketTypesMap[typeId].name} en la tanda activa`);
          }
          
          // Convertir Decimal de Prisma a número
          const price = typeof tandaTicketType.price === 'object' && tandaTicketType.price !== null
            ? parseFloat(tandaTicketType.price.toString())
            : Number(tandaTicketType.price);
          
          if (isNaN(price) || price <= 0) {
            throw new Error(`Precio inválido para ${ticketTypesMap[typeId].name}: ${price}`);
          }
          
          return {
            title: `${ticketTypesMap[typeId].name} - ${order.event.title}`,
            quantity: quantity as number,
            unit_price: parseFloat(price.toFixed(2)), // Asegurar 2 decimales
          };
        });
      } else {
        // Fallback: crear un item único con el total
        const totalPrice = Number(order.totalAmount);
        if (totalPrice <= 0 || isNaN(totalPrice)) {
          return res.status(400).json({
            success: false,
            error: { message: 'Total de la orden inválido' },
          });
        }
        
        items.push({
          title: order.event.title,
          quantity: 1,
          unit_price: totalPrice,
        });
      }

      // Validar que todos los items tengan precios válidos
      const invalidItems = items.filter(item => !item.unit_price || item.unit_price <= 0 || isNaN(item.unit_price));
      if (invalidItems.length > 0) {
        console.error('Items con precios inválidos:', invalidItems);
        return res.status(400).json({
          success: false,
          error: { message: 'Algunos items tienen precios inválidos', items: invalidItems },
        });
      }

      // Log para debugging
      console.log('Items para MercadoPago:', JSON.stringify(items, null, 2));

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

