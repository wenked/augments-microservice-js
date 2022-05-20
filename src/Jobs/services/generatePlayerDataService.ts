import log from "../../logger";
import { PrismaClient } from "@prisma/client";
import chillout from "chillout";
import axios from "axios";
import { sleep } from "../../utils";

export default async function generatePlayerDataService(id: number) {
	log.info(`Gerando player data -> Historic ID ${id}`);
	let request_count = 0;

	try {
		const prisma = new PrismaClient();
		const ranks = ["challenger", "grandmaster", "master"];

		await prisma.historic_stats.update({
			where: {
				id,
			},
			data: {
				status: "Buscando players",
				progresso: 0.33,
			},
		});

		await chillout.forOf(ranks, async (rank) => {
			log.info(`Buscando players ${rank}`);
			if (request_count === 99) {
				log.info(`Request count ${request_count},Aguardando 1 minuto`);
				await sleep(60000);
				request_count = 0;
			}

			const { data } = await axios.get(
				`https://na1.api.riotgames.com/tft/league/v1/${rank}?api_key=${process.env.RIOT_API_KEY}`
			);
			const players = data?.entries;

			request_count++;
			await chillout.forEach(players, async (player: any, key: number) => {
				log.info(`Buscando dados de ${key}/${players.length}`);

				if (request_count === 99) {
					log.info(`Request count ${request_count},Aguardando 1 minuto`);
					await sleep(60000);
					request_count = 0;
				}

				const { data: player_data } = await axios.get(
					`https://na1.api.riotgames.com/tft/summoner/v1/summoners/${player.summonerId}?api_key=${process.env.RIOT_API_KEY}`
				);
				request_count++;

				log.info(`Player: ${player_data}`);

				if (request_count === 99) {
					log.info(`Request count ${request_count},Aguardando 1 minuto`);
					await sleep(60000);
					request_count = 0;
				}

				const { data: match_data } = await axios.get(
					`https://americas.api.riotgames.com/tft/match/v1/matches/by-puuid/${player_data.puuid}/ids?count=20&api_key=${process.env.RIOT_API_KEY}`
				);

				request_count++;

				log.info(`Match: ${match_data}`);

				await chillout.forOf(match_data, async (match_id: string) => {
					const existMatch = await prisma.matches.findMany({
						where: {
							matchid: match_id,
						},
					});

					if (existMatch.length > 0) {
						log.info(`Match ${match_id} já existe`);
						return chillout.StopIteration;
					}

					await prisma.matches.create({
						data: {
							matchid: match_id,
							elo: rank,
						},
					});
				});

				await prisma.historic_stats.update({
					where: {
						id,
					},
					data: {
						status: `Buscando ${rank} players`,
						progresso: 0.33 + (key / players.length) * 0.33,
					},
				});
			});
		});
	} catch (error) {
		log.error(`Error in generatePlayerDataService: ${error}`);
		throw new Error("Error in generatePlayerDataService");
	}
}
