import { PrismaClient } from "@prisma/client";
import axios from "axios";
import chillout from "chillout";
import log from "../../logger";
import agumentData from "../../static/augments_stats_formated.json";
import { sleep } from "../../utils";

export default async function getAugmentsMatchDataService(id: number) {
	try {
		log.info(`Busca dados de partida -> Historic ID ${id}`);
		let requestCount = 0;

		const prisma = new PrismaClient();
		await prisma.historic_stats.update({
			data: {
				progresso: 0.66,
				status: "Buscando dados das partidas",
			},
			where: {
				id,
			},
		});

		const matches = await prisma.matches.findMany();

		await chillout.forEach(matches, async (match: any, key: number) => {
			log.info(`Buscando dados de ${key + 1}/${matches.length} partidas...`);

			const augmentMatchDataExists = await prisma.augments_match_data.findMany({
				where: {
					matchid: match.matchid,
				},
			});

			if (augmentMatchDataExists.length > 0) {
				log.info(`Dados de partida ${match.matchid} já existem`);
				await prisma.historic_stats.update({
					data: {
						progresso: 0.66 + (key / matches.length) * 0.14,
					},
					where: { id },
				});

				return;
			}

			if (requestCount === 99) {
				log.info(`Request count ${requestCount},Aguardando 1 minuto`);
				await sleep(60000);
				requestCount = 0;
			}

			const { data: matchData } = await axios.get(
				`https://americas.api.riotgames.com/tft/match/v1/matches/${match.matchid}?api_key=${process.env.RIOT_API_KEY}`
			);

			requestCount++;

			await chillout.forEach(matchData.info.participants, async (participant: any, key: number) => {
				log.info(participant);
				const augments = participant.augments;

				await chillout.forEach(augments, async (augment: any, key: number) => {
					let round = "";

					if (key === 0) {
						round = "stage14";
					}

					if (key === 1) {
						round = "stage33";
					}

					if (key === 2) {
						round = "stage46";
					}

					const formattedAugment = agumentData.find((item) => item.api === augment);
					if (formattedAugment) {
						await prisma.augments_match_data.create({
							data: {
								api_name: formattedAugment.api,
								augment: formattedAugment.name,
								elo: match.elo,
								game_version: matchData.info.gameVersion,
								matchid: match.matchid,
								placement: `${participant.placement}`,
								round,
								tier: formattedAugment.tier,
							},
						});
					} else {
						await prisma.augments_match_data.create({
							data: {
								api_name: augment,
								augment: "-",
								elo: match.elo,
								game_version: matchData.info.gameVersion,
								matchid: match.matchid,
								placement: `${participant.placement}`,
								round,
								tier: "-",
							},
						});
					}
				});

				await prisma.historic_stats.update({
					data: {
						progresso: 0.66 + (key / matches.length) * 0.14,
					},
					where: { id },
				});
			});
		});
	} catch (error) {
		log.error(`Error in getMatchDataService: ${error}`);
		throw new Error("Error in getMatchDataService");
	}
}
