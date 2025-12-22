import { OrderRepository } from '../../infrastructure/repositories/OrderRepository';
import { AppError } from '../../infrastructure/middleware/error.middleware';

export class OrderService {
  private orderRepository: OrderRepository;

  constructor() {
    this.orderRepository = new OrderRepository();
  }

  async create(data: any, userId: string) {
    return this.orderRepository.create(data, userId);
  }

  async confirmPayment(orderId: string, paymentData: any, userId: string) {
    return this.orderRepository.confirmPayment(orderId, paymentData, userId);
  }

  async getById(id: string, userId: string) {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new AppError('Orden no encontrada', 404, 'ORDER_NOT_FOUND');
    }
    
    if (order.userId !== userId) {
      throw new AppError('No autorizado', 403, 'FORBIDDEN');
    }

    return order;
  }
}

