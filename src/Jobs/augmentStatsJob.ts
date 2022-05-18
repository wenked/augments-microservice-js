import log from "../logger";

import { generatePlayerDataService } from "./services";

interface AugmentStatsJobProps {
	id: number;
	generate_player_data: boolean;
	grab_match_data: boolean;
	generate_augment_stats: boolean;
}

export default async function augmentStatsJob({
	id,
	generate_player_data,
	grab_match_data,
	generate_augment_stats,
}: AugmentStatsJobProps) {
	log.info(`Augment Stats Job: ${id}`);

	try {
		await generatePlayerDataService(id);
	} catch (error) {
		log.error(`Error in augmentStatsJob: ${error}`);
		throw new Error("Error in augmentStatsJob");
	}
}
