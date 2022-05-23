import log from "../logger";

import {
	generateAugmentsStats,
	generatePlayerDataService,
	getAugmentsMatchDataService,
	getChampionsMatchDataService,
} from "./services";

interface AugmentStatsJobProps {
	generate_augment_stats: boolean;
	generate_player_data: boolean;
	grab_match_data: boolean;
	id: number;
}

export default async function augmentStatsJob({
	generate_augment_stats,
	generate_player_data,
	grab_match_data,
	id,
}: AugmentStatsJobProps) {
	log.info(`Augment Stats Job: ${id}`);

	try {
		// await generatePlayerDataService(id);
		// await getMatchDataService(id);
		// await getAugmentMatchDataService(id);
		await getChampionsMatchDataService();
	} catch (error) {
		log.error(`Error in augmentStatsJob: ${error}`);
		throw new Error("Error in augmentStatsJob");
	}
}
