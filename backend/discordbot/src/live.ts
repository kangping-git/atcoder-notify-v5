import { EventSource } from 'eventsource';
import { nextTick } from 'process';

const sseURL = `http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}/sse/`;

export async function connectSSE() {
    let sse = new EventSource(sseURL);
    sse.addEventListener('open', (ev) => {
        console.log(ev);
    });
    sse.addEventListener('submission', (ev) => {
        console.log(ev.data);
    });
}
function ACEvent() {}
