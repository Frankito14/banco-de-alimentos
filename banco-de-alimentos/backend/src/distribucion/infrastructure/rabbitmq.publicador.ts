import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  ENTREGA_REGISTRADA_ROUTING_KEY,
  ENTREGAS_EXCHANGE,
} from '../../common/messaging/messaging.module';
import type { EntregaRendicion } from '../../rendicion-cuentas/dto/rendicion-cuentas.dto';
import type { Entrega } from '../domain/entities';
import type { PublicadorDeEntregas } from '../application/ports';


@Injectable()
export class RabbitMqPublicadorDeEntregas implements PublicadorDeEntregas {
  private readonly logger = new Logger(RabbitMqPublicadorDeEntregas.name);
  private pendientes: EntregaRendicion[] = [];

  constructor(private readonly amqp: AmqpConnection) {}

  async publicar(entrega: Entrega) {
    const fecha = (entrega.fechaRecepcion ?? entrega.fechaEntrega).toISOString();
    this.pendientes.push(
      ...entrega.lotes.map((lote) => ({
        entregaId: entrega.id,
        loteId: lote.loteId,
        comedorId: entrega.comedorId,
        cantidad: lote.cantidad,
        fecha,
      })),
    );
    await this.enviarPendientes();
  }

  @Interval(30_000)
  async enviarPendientes() {
    while (this.pendientes.length > 0) {
      try {
        await this.amqp.publish(ENTREGAS_EXCHANGE, ENTREGA_REGISTRADA_ROUTING_KEY, this.pendientes[0], {
          persistent: true,
        });
        this.pendientes.shift();
      } catch (err) {
        this.logger.warn(
          `RabbitMQ no disponible, quedan ${this.pendientes.length} mensajes pendientes: ${(err as Error).message}`,
        );
        return;
      }
    }
  }
}
