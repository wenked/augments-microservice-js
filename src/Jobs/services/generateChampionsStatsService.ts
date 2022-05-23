import { Prisma, PrismaClient } from "@prisma/client";
import chalk from "chalk";
import chillout from "chillout";
import log from "../../logger";

interface ChampionStatsJobProps {
	avg_placement: null | number;
}

export default async function generateChampionsStatsService() {
	try {
		const prisma = new PrismaClient();
		const champions = await prisma.champion.findMany();

		await chillout.forEach(champions, async (champion, key) => {
			log.info(
				`Gerando estatísticas de ${chalk.bold.blueBright(
					champion.name
				)} de ${chalk.bold.greenBright(`${key + 1}/${champions.length}`)}  campeões...`
			);

			const [championStats] = await prisma.$queryRaw<ChampionStatsJobProps[]>(Prisma.sql`SELECT 
            AVG(placement) as avg_placement
        FROM
            tft_augments.champions_match_data
        WHERE
            api_name = ${champion.api_name};`);

			await prisma.champion.update({
				data: {
					avg_placement: championStats.avg_placement,
				},
				where: {
					id: champion.id,
				},
			});
		});

		log.info(`${chalk.bold.blueBright(`${champions.length}`)} campeões gerados com sucesso!`);
	} catch (error) {
		log.error(`Error: generateChampionsStatsService -> ${chalk.bold.red(error)}`);
	}
}
