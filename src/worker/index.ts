import client, { Connection, Channel, ConsumeMessage } from "amqplib";
import log from "../logger";
import augmentStatsJob from "../Jobs/augmentStatsJob";

export default async function Worker() {
	// consumer for the queue.
	// We use currying to give it the channel required to acknowledge the message
	try {
		const consumer =
			(channel: Channel) =>
			(msg: ConsumeMessage | null): void => {
				try {
					if (msg) {
						const message = JSON.parse(msg.content.toString());
						log.info(message);
						augmentStatsJob(message);

						channel.ack(msg);
					}
				} catch (error) {
					throw new Error("teste");
				}
			};
		const connection: Connection = await client.connect("amqp://localhost");
		// Create a channel
		const channel: Channel = await connection.createChannel();
		// Makes the queue available to the client
		await channel.assertQueue("augments_queue", { durable: true });
		await channel.prefetch(1);
		// Send some messages to the queue
		log.info(" [*] Waiting for messages in %s. To exit press CTRL+C", "augments_queue");
		// Start the consumer
		await channel.consume("augments_queue", consumer(channel));
	} catch (error) {
		log.error(`Error in worker: ${error}`);
	}
}
