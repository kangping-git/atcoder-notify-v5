import { createClient } from 'redis';

const redisClient = createClient({
    url: 'redis://localhost:6379',
});
async function main() {
    while (true) {
        const judgement = await redisClient.blPop('judgement', 0);
        if (judgement) {
            console.log('Received judgement:', judgement);
        } else {
            console.log('No judgement received, waiting...');
        }
    }
}

main();
