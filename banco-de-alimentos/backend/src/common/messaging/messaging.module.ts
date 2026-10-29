// src/common/messaging/messaging.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

export const ENTREGAS_EXCHANGE = 'entregas';
export const ENTREGAS_QUEUE = 'auditoria.entregas';
export const ENTREGA_REGISTRADA_ROUTING_KEY = 'entrega.registrada';

@Global()
@Module({
    imports: [
        RabbitMQModule.forRootAsync(RabbitMQModule, {
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                uri: config.getOrThrow<string>('RABBITMQ_URL'),
                exchanges: [
                    {
                        name: ENTREGAS_EXCHANGE,
                        type: 'topic',
                        options: { durable: true },
                    },
                ],
                queues: [
                    {
                        name: ENTREGAS_QUEUE,
                        exchange: ENTREGAS_EXCHANGE,
                        routingKey: ENTREGA_REGISTRADA_ROUTING_KEY,
                        options: { durable: true },
                    },
                ],
                connectionInitOptions: { wait: true, timeout: 10000 },
            }),
        }),
    ],
    exports: [RabbitMQModule],
})
export class MessagingModule { }