import { EMPTY } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { OrdersController } from './orders.controller';

describe('OrdersController', () => {
    it('should convert empty microservice responses into a proper RpcException', async () => {
        const ordersClient = {
            send: jest.fn().mockReturnValue(EMPTY),
        };

        const controller = new OrdersController(ordersClient as any);

        await expect(controller.findOne('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
            RpcException,
        );
    });
});
