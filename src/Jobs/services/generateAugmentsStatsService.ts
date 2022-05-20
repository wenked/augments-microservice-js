import { Prisma, PrismaClient } from "@prisma/client";
import chillout from "chillout";
import log from "../../logger";

interface AugmentStatsJobProps {
	api_name: string;
	avgPlacement: null | number;
	avgPlacement_14: null | number;
	avgPlacement_33: null | number;
	avgPlacement_46: null | number;
	name: null | string;
	tier: string;
}

export default async function generateAugmentsStats(id: number) {
	try {
		const prisma = new PrismaClient();
		await prisma.historic_stats.update({
			data: {
				progresso: 0.8,
				status: "Gerando estatísticas dos augments",
			},
			where: {
				id,
			},
		});

		const api_names = await prisma.augments_match_data.findMany({
			distinct: "api_name",
			select: {
				api_name: true,
			},
		});

		await chillout.forEach(api_names, async (api_name: any, key: number) => {
			const augmentName = api_name.api_name;
			log.info(`Gerando estatísticas ${augmentName} de ${key}/${api_names.length} augments...`);

			const [augmentStats] = await prisma.$queryRaw<[AugmentStatsJobProps]>(Prisma.sql`SELECT 
            (SELECT DISTINCT
                    augment
                FROM
                    augments_match_data
                WHERE
                    api_name = ${augmentName}) AS name,
            (SELECT DISTINCT
                    api_name
                FROM
                    augments_match_data
                WHERE
                    api_name = ${augmentName}) AS api_name,
            (SELECT DISTINCT
                    tier
                FROM
                    augments_match_data
                WHERE
                    api_name = ${augmentName}) AS tier,
            (SELECT 
                    AVG(placement)
                FROM
                    augments_match_data
                WHERE
                    api_name = ${augmentName}) AS avgPlacement,
            (SELECT 
                    AVG(placement)
                FROM
                    augments_match_data
                WHERE
                    api_name = ${augmentName}
                        AND round = "stage14") AS avgPlacement_14,
            (SELECT 
                    AVG(placement)
                FROM
                    augments_match_data
                WHERE
                    api_name = ${augmentName}
                        AND round = "stage33") AS avgPlacement_33,
            (SELECT 
                    AVG(placement)
                FROM
                    augments_match_data
                WHERE
                    api_name = ${augmentName}
                        AND round = "stage46") AS avgPlacement_46;`);

			console.log(augmentStats);

			let stage14 = augmentStats.avgPlacement_14;
			let stage33 = augmentStats.avgPlacement_33;
			let stage46 = augmentStats.avgPlacement_46;

			if (stage14 === null) {
				stage14 = 0;
			}

			if (stage33 === null) {
				stage33 = 0;
			}

			if (stage46 === null) {
				stage46 = 0;
			}

			const augmentExists = await prisma.augments.findFirst({ where: { api_name: augmentName } });
			if (augmentExists) {
				await prisma.augments.update({
					data: {
						api_name: augmentStats.api_name,
						name: augmentStats.name,
						placement: augmentStats.avgPlacement,
						stage14: stage14,
						stage33: stage33,
						stage46: stage46,
						tier: augmentStats.tier,
					},
					where: {
						id: augmentExists.id,
					},
				});
			} else {
				await prisma.augments.create({
					data: {
						api_name: augmentStats.api_name,
						name: augmentStats.name,
						placement: augmentStats.avgPlacement,
						stage14: stage14,
						stage33: stage33,
						stage46: stage46,
						tier: augmentStats.tier,
					},
				});
			}

			await prisma.historic_stats.update({
				data: {
					progresso: (0.8 * (key + 1)) / api_names.length,
					status: "Gerando estatísticas dos augments",
				},
				where: {
					id,
				},
			});
		});
	} catch (error) {
		log.error(`Error in generateAugmentsStats: ${error}`);
		throw new Error("Error in generateAugmentsStats");
	}
}
