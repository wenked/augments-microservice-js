import { PrismaClient } from "@prisma/client";
import chalk from "chalk";
import log from "../logger";

import {
	generateAugmentsStats,
	generateChampionsStatsService,
	generatePlayerDataService,
	getAugmentsMatchDataService,
	getChampionsMatchDataService,
} from "./services";

interface GenerateStatsJobProps {
	id: number;
	service: string;
}

export default async function generateStatsJob({ id, service }: GenerateStatsJobProps) {
	log.info(
		`generateStatsJob  historicId: ${chalk.bold.green(id)} service: ${chalk.bold.green(service)}`
	);
	const prisma = new PrismaClient();
	try {
		switch (service) {
			case "generate_augment_stats":
				await generateAugmentsStats(id, prisma);
				break;
			case "generate_champion_stats":
				await generateChampionsStatsService(id, prisma);
				break;
			case "generate_player_data":
				await generatePlayerDataService(id, prisma);
				break;
			case "grab_champion_match_data":
				await getChampionsMatchDataService(id, prisma);
				break;
			case "grab_match_data":
				await getAugmentsMatchDataService(id, prisma);
				break;
			default:
				break;
		}
	} catch (error) {
		log.error(`Error in generateStatsJob: ${error}`);
		await prisma.historic_stats.update({
			data: {
				status: "error",
			},
			where: {
				id: id,
			},
		});
		throw new Error("Error in generateStatsJob");
	}
}
