import client, { Channel, Connection, ConsumeMessage } from "amqplib";
import generateStatsJob from "../Jobs/generateStatsJob";
import log from "../logger";

export default async function Worker() {
	try {
		const consumer =
			(channel: Channel) =>
			async (msg: null | ConsumeMessage): Promise<void> => {
				try {
					if (msg) {
						const message = JSON.parse(msg.content.toString());
						log.info(message);
						await generateStatsJob(message);

						channel.ack(msg);
					}
				} catch (error) {
					throw new Error("teste");
				}
			};
		const connection: Connection = await client.connect("amqp://localhost");

		const channel: Channel = await connection.createChannel();

		await channel.assertQueue("augments_queue", { durable: true });
		await channel.prefetch(1);

		log.info(" [*] Waiting for messages in %s. To exit press CTRL+C", "augments_queue");

		await channel.consume("augments_queue", consumer(channel));
	} catch (error) {
		log.error(`Error in worker: ${error}`);
	}
}
