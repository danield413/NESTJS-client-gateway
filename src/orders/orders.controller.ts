import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ORDER_SERVICE } from 'src/config/services';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import {
  catchError,
  defaultIfEmpty,
  firstValueFrom,
  mergeMap,
  of,
  throwError,
} from 'rxjs';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { StatusDto } from './dto/status.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(ORDER_SERVICE) private readonly ordersClient: ClientProxy,
  ) { }

  private toRpcError(error: unknown): string | object {
    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      return error;
    }

    return { message: 'Unknown microservice error' };
  }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersClient.send('createOrder', createOrderDto).pipe(
      defaultIfEmpty(null),
      mergeMap((response) => {
        if (response !== null) {
          return of(response);
        }

        return throwError(
          () =>
            new RpcException({
              status: 502,
              message:
                'Orders microservice did not return a response for createOrder',
              details:
                'If your handler uses @EventPattern, call emit() from the gateway. If it uses @MessagePattern, ensure it returns a value.',
            }),
        );
      }),
      catchError((error: unknown) => {
        return throwError(() => new RpcException(this.toRpcError(error)));
      }),
    );
  }

  @Get()
  findAll(@Query() orderPaginationDto: OrderPaginationDto) {
    return this.ordersClient.send('findAllOrders', orderPaginationDto);
  }

  @Get('id/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const order = await firstValueFrom<unknown>(
        this.ordersClient.send('findOneOrder', { id }),
      );

      return order;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'no elements in sequence'
      ) {
        throw new RpcException({
          status: 'NOT_FOUND',
          message: `Order with id ${id} was not found`,
          details: error.message,
        });
      }

      throw new RpcException(this.toRpcError(error));
    }
  }

  @Get(':status')
  findAllByStatus(
    @Param() statusDto: StatusDto,
    @Query() paginationDto: PaginationDto,
  ) {
    try {
      return this.ordersClient.send('findAllOrders', {
        ...paginationDto,
        status: statusDto.status,
      });
    } catch (error) {
      throw new RpcException(this.toRpcError(error));
    }
  }

  @Patch(':id')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: StatusDto,
  ) {
    try {
      return this.ordersClient.send('changeOrderStatus', {
        id,
        status: statusDto.status,
      });
    } catch (error) {
      throw new RpcException(this.toRpcError(error));
    }
  }
}
