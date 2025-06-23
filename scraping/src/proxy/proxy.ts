import { SocksProxyAgent } from 'socks-proxy-agent';
import axios from 'axios';
import { Main } from '..';
import { Logger } from '../utils/logger';

export namespace Proxy {
    let SocksHTTPProxy: SocksProxyAgent | null = null;
    let logger: Logger;

    export function initProxy(url: string) {
        logger = Main.getLogger().child('Proxy');
        SocksHTTPProxy = new SocksProxyAgent(url);
    }
    export function get(url: string, cookie: string, withText = false) {
        const agent = SocksHTTPProxy || undefined;
        if (agent) {
            logger.info('Using proxy', { url });
        } else {
            logger.info('Not using proxy', { url });
        }

        return axios.get(url, {
            httpsAgent: agent,
            headers: { Cookie: cookie },
            responseType: withText ? void 0 : 'text',
        });
    }
    export function isProxyEnabled() {
        return SocksHTTPProxy !== null;
    }
}
