// src/auditoria/application/enviar-lote-nocturno.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Channel, GetMessage } from 'amqplib';
import { randomUUID } from 'crypto';
import { ENTREGAS_QUEUE } from '../common/messaging/messaging.module';
import { RendicionCuentasPort } from './dto/rendicion-cuentas.dto';

@Injectable()
export class RendicionCuentasService {
  private readonly logger = new Logger(RendicionCuentasService.name);

  constructor(
    private readonly amqp: AmqpConnection,
    @Inject('RendicionCuentasPort')
    private readonly rendicion: RendicionCuentasPort,
  ) { }

  @Cron('0 2 * * *', { timeZone: 'America/Argentina/Buenos_Aires' })
  async enviar_entregas_nocturno() {
    const channel = this.amqp.channel as unknown as Channel;
    const mensajes: GetMessage[] = [];


    // 1. Leer todo lo acumulado SIN confirmar
    while (true) {
      const msg = await channel.get(ENTREGAS_QUEUE, { noAck: false });
      if (!msg) break; // cola vacía
      mensajes.push(msg);
    }

    if (mensajes.length === 0) {
      this.logger.log('No hay entregas para enviar');
      return;
    }

    const entregas = mensajes.map((m) => JSON.parse(m.content.toString()));
    const loteId = randomUUID();

    try {
      // 2. Enviar el lote al sistema del Ministerio
      await this.rendicion.enviarLote({ loteId, entregas });

      // 3. Recién ahora confirmar: esto "vacía" la cola
      mensajes.forEach((m) => channel.ack(m));
      this.logger.log(`Lote ${loteId} enviado: ${mensajes.length} entregas`);
    } catch (err) {
      // 4. Falló: devolver todo a la cola para reintentar
      mensajes.forEach((m) => channel.nack(m, false, true));
      this.logger.error(`Falló el envío del lote ${loteId}`, err);
    }
  }
}