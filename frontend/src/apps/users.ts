import { openHistogram } from './histogram';
import './users.scss';

export const COLORS: Array<{ rating: number; color: string; alpha: number }> = [
    { rating: 0, color: '#808080', alpha: 0.15 },
    { rating: 400, color: '#804000', alpha: 0.15 },
    { rating: 800, color: '#008000', alpha: 0.15 },
    { rating: 1200, color: '#00C0C0', alpha: 0.2 },
    { rating: 1600, color: '#0000FF', alpha: 0.1 },
    { rating: 2000, color: '#C0C000', alpha: 0.25 },
    { rating: 2400, color: '#FF8000', alpha: 0.2 },
    { rating: 2800, color: '#FF0000', alpha: 0.1 },
];
COLORS.reverse();
export function getColorByRating(rating: number): string {
    const color = COLORS.find((c) => rating >= c.rating);
    if (color) {
        return color.color;
    }
    return 'black';
}

export function normalizeRating(rating: number): number {
    if (rating < 400) {
        return 400 / Math.exp((400 - rating) / 400);
    }
    return rating;
}

function getRankingText(place: number): string {
    const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
    const rem100 = place % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${place}th`;
    const rem10 = place % 10;
    return `${place}${suffixes[rem10] ?? 'th'}`;
}

let zIndex = 1000;

declare global {
    interface Window {
        openUserHistory: (user: string) => void;
    }
}
const windowObj = window;
export function handleWindow({
    window,
    x = 10,
    y = 10,
    width = 300,
    height = 200,
    deletable = true,
    isOverflowScroll = false,
    minimum = void 0,
    onClose = () => {},
}: {
    window: HTMLElement;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    deletable?: boolean;
    isOverflowScroll?: boolean;
    minimum?: {
        opened: (close: () => void) => void;
        closed: (open: () => void) => void;
    };
    onClose?: () => void;
}) {
    window.classList.add('window');
    window.style.top = `${y}vh`;
    window.style.left = `${x}vw`;
    window.style.width = width + 'px';
    window.style.height = height + 'px';
    window.style.zIndex = String(zIndex++);
    if (localStorage.getItem(`window-${window.querySelector('h2')?.textContent || 'unknown'}`)) {
        const position = JSON.parse(localStorage.getItem(`window-${window.querySelector('h2')?.textContent || 'unknown'}`) || '{}');
        if (position.x !== undefined && position.y !== undefined) {
            window.style.left = `${Math.min(windowObj.innerWidth - width / 5, Math.max((-width / 5) * 4, (position.x / 100) * windowObj.innerWidth))}px`;
            window.style.top = `${Math.min(windowObj.innerHeight - height / 5, Math.max((position.y / 100) * windowObj.innerHeight, 0))}px`;
        }
    }
    if (isOverflowScroll) {
        window.style.overflow = 'auto';
    } else {
        window.style.overflow = 'hidden';
    }
    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    titleBar.textContent = window.querySelector('h2')?.textContent || 'Window';
    const minButton = document.createElement('button');
    minButton.textContent = 'ー';
    minButton.className = 'min-button';
    let isOpened = true;
    minButton.addEventListener('click', toggle);
    let heightTemp = height;
    let widthTemp = width;
    function toggle() {
        isOpened = !isOpened;
        if (isOpened) {
            if (minimum) {
                minimum.opened(toggle);
            } else {
                window.style.height = `${heightTemp}px`;
                window.style.width = `${widthTemp}px`;
                height = heightTemp;
                width = widthTemp;
                window.style.overflow = isOverflowScroll ? 'auto' : 'hidden';
            }
        } else {
            if (minimum) {
                minimum.closed(toggle);
            } else {
                window.style.height = '20px';
                window.style.width = '300px';
                height = 20;
                width = 300;
                window.style.overflow = 'hidden';
            }
        }
    }
    titleBar.appendChild(minButton);
    if (deletable) {
        const closeButton = document.createElement('button');
        closeButton.textContent = 'x';
        closeButton.className = 'close-button';
        closeButton.addEventListener('click', () => {
            window.remove();
            if (onClose) {
                onClose();
            }
        });
        titleBar.appendChild(closeButton);
    }
    window.addEventListener('mousedown', (e) => {
        window.style.zIndex = String(zIndex++);
    });
    window.addEventListener('touchstart', (e) => {
        window.style.zIndex = String(zIndex++);
    });
    window.prepend(titleBar);
    function mouseDownHandler(e: PointerEvent) {
        if (e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        window.style.zIndex = String(zIndex++);

        const rect = window.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        function pointerMoveHandler(ev: PointerEvent) {
            ev.preventDefault();
            const x = Math.min(windowObj.innerWidth - width / 5, Math.max((-width / 5) * 4, ev.clientX - offsetX));
            const y = Math.min(windowObj.innerHeight - height / 5, Math.max(ev.clientY - offsetY, 0));
            window.style.left = `${x}px`;
            window.style.top = `${y}px`;
        }

        function pointerUpHandler(ev: PointerEvent) {
            document.removeEventListener('pointermove', pointerMoveHandler);
            document.removeEventListener('pointerup', pointerUpHandler);
            const name = window.querySelector('h2')?.textContent?.trim() ?? 'unknown';
            localStorage.setItem(
                `window-${name}`,
                JSON.stringify({
                    x: (window.offsetLeft / windowObj.innerWidth) * 100,
                    y: (window.offsetTop / windowObj.innerHeight) * 100,
                }),
            );
        }

        document.addEventListener('pointermove', pointerMoveHandler, { passive: false });
        document.addEventListener('pointerup', pointerUpHandler);
    }
    titleBar.addEventListener('pointerdown', mouseDownHandler);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && deletable) {
            window.remove();
            if (onClose) {
                onClose();
            }
        }
    });
}
let pageCursors = new Map<number, string>();
const filterWindow = document.createElement('div');
filterWindow.className = 'window user-filter-window';
filterWindow.innerHTML = `
                <h2>Filters</h2>
                name: <input type="text" id="nameFilter" /> <br />
                country: <input type="text" id="countryFilter" /> <br />
                algoRating: <input type="number" id="algoMinFilter" />~<input type="number" id="algoMaxFilter" /> <br />
                heuristicRating: <input type="number" id="heuristicMinFilter" /> ~ <input type="number" id="heuristicMaxFilter" /> <br />
                limit: <input type="number" id="limitFilter" /><br />
                sortBy:
                <select id="sortBy">
                    <option value="name">Name</option>
                    <option value="algoRating" selected>Algo Rating</option>
                    <option value="heuristicRating">Heuristic Rating</option>
                </select>
                <br />
                reverse: <input type="checkbox" id="reverse" /><br />
                <button id="applyFilters">Apply</button>`;
document.body.appendChild(filterWindow);
handleWindow({ window: filterWindow, x: 2, y: 10, width: 300, height: 600, deletable: false });

const inputs = {
    nameFilter: document.getElementById('nameFilter') as HTMLInputElement,
    countryFilter: document.getElementById('countryFilter') as HTMLInputElement,
    algoRatingMinFilter: document.getElementById('algoMinFilter') as HTMLInputElement,
    algoRatingMaxFilter: document.getElementById('algoMaxFilter') as HTMLInputElement,
    heuristicRatingMinFilter: document.getElementById('heuristicMinFilter') as HTMLInputElement,
    heuristicRatingMaxFilter: document.getElementById('heuristicMaxFilter') as HTMLInputElement,
    sortBy: document.getElementById('sortBy') as HTMLSelectElement,
    sortReverse: document.getElementById('reverse') as HTMLInputElement,
    limit: document.getElementById('limitFilter') as HTMLInputElement,
};
for (const input of Object.values(inputs)) {
    if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
        input.addEventListener('keydown', (e) => {
            if ('key' in e && e.key === 'Enter') {
                e.preventDefault();
                applyFilters();
            }
        });
    }
}

const applyFiltersButton = document.getElementById('applyFilters') as HTMLButtonElement;
const table = document.getElementById('userTableBody') as HTMLTableElement;

applyFiltersButton.addEventListener('click', () => {
    applyFilters();
});
let cursor = '';
let page = 0;
function applyFilters() {
    cursor = '';
    pageCursors.clear();
    pageCursors.set(1, '');
    page = 0;
    nth = 0;
    isLast = false;
    const nextButton = statsWindow.querySelector('#nextPage') as HTMLButtonElement;
    nextButton.disabled = false;
    getUsers();
    const params = getParams();
    fetch(`/api/v1/users/count?${new URLSearchParams(params)}`, {
        method: 'GET',
    })
        .then((response) => response.json())
        .then((data) => {
            statsWindow.querySelector('#statsContent')!.innerHTML = `<span>Total Users: ${data.count}</span>`;
            const histogramOpenerContainer = statsWindow.querySelector('#histogram-opener-container') as HTMLDivElement;
            if (data.count > 0) {
                histogramOpenerContainer.style.display = 'block';
            } else {
                histogramOpenerContainer.style.display = 'none';
            }
        });
}
export function getParams() {
    const params: Record<string, string> = {};
    if (inputs.nameFilter.value) {
        params.q = inputs.nameFilter.value;
    }
    if (inputs.countryFilter.value) {
        params.country = inputs.countryFilter.value;
    }
    if (inputs.algoRatingMinFilter.value) {
        params.minAlgo = inputs.algoRatingMinFilter.value;
    }
    if (inputs.algoRatingMaxFilter.value) {
        params.maxAlgo = inputs.algoRatingMaxFilter.value;
    }
    if (inputs.heuristicRatingMinFilter.value) {
        params.minHeuristic = inputs.heuristicRatingMinFilter.value;
    }
    if (inputs.heuristicRatingMaxFilter.value) {
        params.maxHeuristic = inputs.heuristicRatingMaxFilter.value;
    }
    if (inputs.sortBy.value) {
        params.sort = inputs.sortBy.value;
    }
    if (inputs.limit.value) {
        params.limit = inputs.limit.value;
    }
    if ((params.sort == 'name' && inputs.sortReverse.checked) || (params.sort !== 'name' && !inputs.sortReverse.checked)) {
        if (params.sort) {
            params.sort = '-' + params.sort;
        }
    }
    if (cursor) {
        params.cursor = cursor;
    }
    return params;
}
let nth = 0;
let isLast = false;
function getUsers(isBack = false) {
    if ((isLast && !isBack) || (page == 1 && isBack)) return;
    const params = getParams();
    if (isBack) {
        params.cursor = pageCursors.get(page - 2) || '';
        nth = (parseInt(inputs.limit.value) || 50) * (page - 2);
    }
    const nextPageButton = statsWindow.querySelector('#nextPage') as HTMLButtonElement;
    nextPageButton.disabled = true;
    const pastPageButton = statsWindow.querySelector('#backPage') as HTMLButtonElement;
    pastPageButton.disabled = true;

    fetch(`/api/v1/users?${new URLSearchParams(params)}`, {
        method: 'GET',
    })
        .then((response) => response.json())
        .then((data) => {
            table.innerHTML = '';
            data.users.forEach((user: any) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                        <td>${getRankingText(++nth)}</td>
                        <td>${user.name}</td>
                        <td>${getCountryFlag(user.country, true)} ${user.country}</td>
                        <td>${getUserRatingTag(user.algoRating)}</td>
                        <td>${getUserRatingTag(user.heuristicRating)}</td>
                        <td><button class="view-user" data-username="${user.name}">View</button></td>
                    `;
                table.appendChild(row);
                row.querySelector('.view-user')!.addEventListener('click', (e) => {
                    if ('clientX' in e && 'clientY' in e) {
                        const x: number = (e.clientX as number) || 0;
                        const y: number = (e.clientY as number) || 0;
                        createUserStatisticsWindow(user.name, (x / window.innerWidth) * 100, (y / window.innerHeight) * 100);
                    }
                });
            });
            cursor = data.nextCursor || '';
            if (!isBack) {
                page += 1;
                pageCursors.set(page, cursor);
            } else {
                page -= 1;
            }
            isLast = !data.nextCursor;
            if (isLast) {
                const nextPageButton = statsWindow.querySelector('#nextPage') as HTMLButtonElement;
                nextPageButton.disabled = true;
            } else {
                const nextPageButton = statsWindow.querySelector('#nextPage') as HTMLButtonElement;
                nextPageButton.disabled = false;
            }
            if (page > 1) {
                const pastPageButton = statsWindow.querySelector('#backPage') as HTMLButtonElement;
                pastPageButton.disabled = false;
            } else {
                const pastPageButton = statsWindow.querySelector('#backPage') as HTMLButtonElement;
                pastPageButton.disabled = true;
            }
        });
}

let openedUserSet = new Set<string>();
async function createUserStatisticsWindow(userName: string, x: number, y: number) {
    if (openedUserSet.has(userName)) {
        return;
    }
    openedUserSet.add(userName);
    const userStatsWindow = document.createElement('div');
    userStatsWindow.className = 'window user-stats-window';
    userStatsWindow.innerHTML = `
            <h2>${userName}'s Statistics</h2>
            <div class="stats-content">
                <p id="userStatsContent">Loading...</p>
            </div>`;
    document.body.appendChild(userStatsWindow);
    handleWindow({
        window: userStatsWindow,
        x: x,
        y: 5,
        deletable: true,
        height: 700,
        width: 600,
        isOverflowScroll: true,
        onClose: () => {
            openedUserSet.delete(userName);
        },
    });
    const baseData = await (await fetch(`/api/v1/users/${encodeURIComponent(userName)}/`)).json();
    const advanceData = await (await fetch(`/api/v1/users/${encodeURIComponent(userName)}/stats/`)).json();
    const statsContent = userStatsWindow.querySelector('#userStatsContent')!;
    statsContent.innerHTML = `
            <table class="user-stats-table">
            <tr>
                <th>Name</th>
                <td><a href="https://atcoder.jp/users/${baseData.name}" target="_blank">${baseData.name}</a></td>
            </tr>
            <tr>
                <th>Country</th>
                <td>${getCountryFlag(baseData.country)}</td>
            </tr>
            <tr>
                <th>Algo Rating</th>
                <td>${getUserRatingTag(baseData.algoRating)}</td>
            </tr>
            <tr>
                <th>Max Algo Rating</th>
                <td>${getUserRatingTag(advanceData.maxAlgoRating)}</td>
            </tr>
            <tr>
                <th>Heuristic Rating</th>
                <td>${getUserRatingTag(baseData.heuristicRating)}</td>
            </tr>
            <tr>
                <th>Max Heuristic Rating</th>
                <td>${getUserRatingTag(advanceData.maxHeuristicRating)}</td>
            </tr>
            <tr>
                <th>Algo APerf</th>
                <td>${baseData.algoAPerf !== null ? baseData.algoAPerf.toFixed(2) : '-'}</td>
            </tr>
            <tr>
                <th>Heuristic APerf</th>
                <td>${baseData.heuristicAPerf !== null ? baseData.heuristicAPerf.toFixed(2) : '-'}</td>
            </tr>
            <tr>
                <th>First AC Datetime</th>
                <td>${advanceData.firstAC ? new Date(advanceData.firstAC).toLocaleString() : '-'}</td>
            </tr>
            <tr>
                <th>Contest Count</th>
                <td>${advanceData.ContestCount || '-'}</td>
            </tr>
            <tr>
                <th>Submission Count</th>
                <td>${advanceData.submissionCount || 0}</td>
            </tr>
            <tr>
                <th>AC Count</th>
                <td>${advanceData.ACCount || 0}</td>
            </tr>
            <tr>
                <th>Algo Image</th>
                <td>${baseData.algoRating ? "<button class='open-user-algo-history'>Open</button>" : '-'}</td>
            </tr>
            <tr>
                <th>Heuristic Image</th>
                <td>${baseData.heuristicRating ? "<button class='open-user-heuristic-history'>Open</button>" : '-'}</td>
            </tr>
            <tr>
                <th>Submissions List</th>
                <td>${advanceData.submissionCount ? "<button class='open-user-submissions'>Open</button>" : '-'}</td>
            </tr>
            <tr>
                <th>History</th>
                <td>${baseData.algoRating | baseData.heuristicRating ? "<button class='open-user-history'>Open</button>" : '-'}</td>
            </tr>
            </table>
        `;
    const algoHistoryButton = userStatsWindow.querySelector('.open-user-algo-history') as HTMLButtonElement;
    const heuristicHistoryButton = userStatsWindow.querySelector('.open-user-heuristic-history') as HTMLButtonElement;
    const submissionsButton = userStatsWindow.querySelector('.open-user-submissions') as HTMLButtonElement;
    const historyButton = userStatsWindow.querySelector('.open-user-history') as HTMLButtonElement;
    algoHistoryButton?.addEventListener('click', () => {
        openUserAlgoHistory(userName);
    });
    heuristicHistoryButton?.addEventListener('click', () => {
        openUserHeuristicHistory(userName);
    });
    submissionsButton?.addEventListener('click', () => {
        openUserSubmissions(userName);
    });
    historyButton?.addEventListener('click', () => {
        openUserHistory(userName);
    });
}
let openedAlgoHistoryUserSet = new Set<string>();
function openUserAlgoHistory(user: string) {
    if (openedAlgoHistoryUserSet.has(user)) {
        return;
    }
    openedAlgoHistoryUserSet.add(user);
    const algoHistoryWindow = document.createElement('div');
    algoHistoryWindow.className = 'window user-algo-history-window';
    algoHistoryWindow.innerHTML = `
            <h2>${user}'s Algo History</h2>
            <div class="algo-history-content">
                <img src="/api/v1/users/${encodeURIComponent(user)}/rating.png" alt="${user}'s Algo History" />
            </div>`;
    document.body.appendChild(algoHistoryWindow);
    handleWindow({
        window: algoHistoryWindow,
        x: 5,
        y: 5,
        deletable: true,
        width: 700,
        height: 600,
        onClose: () => {
            openedAlgoHistoryUserSet.delete(user);
        },
    });
}
function getUserRatingTag(rating: number) {
    if (rating === -1 || rating === null || rating === undefined) {
        return `<span class="user-rating" style="color: gray;">-</span>`;
    }
    const color = COLORS.find((c) => rating >= c.rating);
    if (color) {
        return `<span class="user-rating" style="color: ${color.color};">${rating}</span>`;
    }
    return `<span class="user-rating" style="color: black">${rating}</span>`;
}
function getCountryFlag(country: string, nullIfUnknown = false) {
    if (country === 'XX' || country === 'Unknown') {
        return nullIfUnknown ? '' : country;
    }
    return `<img
            src="https://flagcdn.com/w40/${country.toLowerCase()}.png"
            srcset="https://flagcdn.com/w80/${country.toLowerCase()}.png 2x"
            height="20"
            class="country-flag"
            alt="${country}">`;
}
let openedHeuristicHistoryUserSet = new Set<string>();
function openUserHeuristicHistory(user: string) {
    if (openedHeuristicHistoryUserSet.has(user)) {
        return;
    }
    openedHeuristicHistoryUserSet.add(user);
    const HeuristicHistoryWindow = document.createElement('div');
    HeuristicHistoryWindow.className = 'window user-heuristic-history-window';
    HeuristicHistoryWindow.innerHTML = `
            <h2>${user}'s Heuristic History</h2>
            <div class="heuristic-history-content">
                <img src="/api/v1/users/${encodeURIComponent(user)}/rating.png?isHeuristic=true" alt="${user}'s Heuristic History" />
            </div>`;
    document.body.appendChild(HeuristicHistoryWindow);
    handleWindow({
        window: HeuristicHistoryWindow,
        x: 5,
        y: 5,
        deletable: true,
        width: 700,
        height: 600,
        onClose: () => {
            openedHeuristicHistoryUserSet.delete(user);
        },
    });
}
const openedSubmissionsUserSet = new Set<string>();
function openUserSubmissions(user: string) {
    if (openedSubmissionsUserSet.has(user)) {
        return;
    }
    openedSubmissionsUserSet.add(user);
    const submissionsWindow = document.createElement('div');
    submissionsWindow.className = 'window user-submissions-window';
    submissionsWindow.innerHTML = `
            <h2>${user}'s Submissions</h2>
            <div class="submissions-content">
                <table id="submissionsTable">
                    <thead>
                        <tr>
                            <th>Problem</th>
                            <th>Language</th>
                            <th>Time</th>
                            <th>Memory</th>
                            <th>Status</th>
                            <th>Link</th>
                        </tr>
                    </thead>
                    <tbody id="submissionsTableBody">
                    </tbody>
                </table>
            </div>`;
    document.body.appendChild(submissionsWindow);
    handleWindow({
        window: submissionsWindow,
        x: 5,
        y: 5,
        deletable: true,
        width: 800,
        height: 600,
        isOverflowScroll: true,
        onClose: () => {
            openedSubmissionsUserSet.delete(user);
        },
    });
    let submissionCursor = '';
    function getSubmissions() {
        fetch(`/api/v1/users/${encodeURIComponent(user)}/submissions?cursor=${submissionCursor}&limit=200`)
            .then((response) => response.json())
            .then((data) => {
                const submissionsTableBody = submissionsWindow.querySelector('#submissionsTableBody') as HTMLTableElement;
                if (submissionCursor == '') {
                    submissionsTableBody.innerHTML = '';
                }
                data.submissions.forEach((submission: any) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><a href="https://atcoder.jp/contests/${submission.contestId}/tasks/${submission.problemId}" target="_blank">${
                        submission.problemId
                    }</a></td>
                        <td>${submission.language}</td>
                        ${
                            submission.time == -1
                                ? ''
                                : `
                            <td>${submission.time} ms</td>
                            <td>${submission.memory} KB</td>`
                        }
                        <td colspan="${submission.time == -1 ? 3 : 1}"><span class="status-${submission.status == 'AC' ? 'AC' : 'Penalty'}">${
                        submission.status
                    }</span></td>
                        <td><a href="https://atcoder.jp/contests/${submission.contestId}/submissions/${
                        submission.submissionId
                    }" target="_blank">Detail</a></td>`;
                    submissionsTableBody.appendChild(row);
                });
                submissionCursor = data.nextCursor || '';
            });
    }
    submissionsWindow.addEventListener('scroll', (e) => {
        const target = e.target as HTMLElement;
        if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50 && submissionCursor) {
            getSubmissions();
        }
    });
    getSubmissions();
}
const openedHistoryUserSet = new Set<string>();
async function openUserHistory(user: string) {
    if (openedHistoryUserSet.has(user)) {
        return;
    }
    openedHistoryUserSet.add(user);
    const historyWindow = document.createElement('div');
    historyWindow.className = 'window user-history-window';
    historyWindow.innerHTML = `
            <h2>${user}'s History</h2>
            <div class="tabs">
                <span class="tab-select active" id="history-tab-algo">Algo</span>
                <span class="tab-select" id="history-tab-heuristic">Heuristic</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Contest</th>
                        <th>Place</th>
                        <th>Perf</th>
                        <th>New</th>
                        <th>Diff</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody class="history-content" id="historyTableBody">
                </tbody>
            </table>`;
    document.body.appendChild(historyWindow);
    const historyContent = historyWindow.querySelector('#historyTableBody') as HTMLDivElement;
    const algoTab = historyWindow.querySelector('#history-tab-algo') as HTMLSpanElement;
    const heuristicTab = historyWindow.querySelector('#history-tab-heuristic') as HTMLSpanElement;
    algoTab.addEventListener('click', () => {
        algoTab.classList.add('active');
        heuristicTab.classList.remove('active');
        displayHistoryTab(true);
    });
    heuristicTab.addEventListener('click', () => {
        heuristicTab.classList.add('active');
        algoTab.classList.remove('active');
        displayHistoryTab(false);
    });
    function displayHistoryTab(isAlgo: boolean) {
        historyContent.innerHTML = '';
        userHistory.forEach((val: any) => {
            if ((isAlgo && val.isHeuristic) || (!isAlgo && !val.isHeuristic)) return;
            const row = document.createElement('tr');
            let diff = val.newRating - val.oldRating;
            let diffStr;
            if (diff > 0) {
                diffStr = `+${diff}`;
            } else if (diff < 0) {
                diffStr = `${diff}`;
            } else {
                diffStr = `±${diff}`;
            }

            row.innerHTML = `
                    <td><a href="https://atcoder.jp/contests/${val.contest.id}" target="_blank">${val.contest.title}</a></td>
                    <td>${getRankingText(val.place)}</td>
                    <td>${getUserRatingTag(Math.floor(normalizeRating(val.performance)))}</td>
                    <td>${getUserRatingTag(val.newRating)}</td>
                    <td>${diffStr}</td>
                    <td>${new Date(val.contest.endTime).toLocaleString()}</td>`;
            historyContent.appendChild(row);
        });
    }

    handleWindow({
        window: historyWindow,
        x: 5,
        y: 5,
        deletable: true,
        width: 700,
        height: 600,
        onClose: () => {
            openedHistoryUserSet.delete(user);
        },
        isOverflowScroll: true,
    });

    const userHistory = await (await fetch(`/api/v1/users/${user}/history`)).json();
    userHistory.reverse();
    displayHistoryTab(true);
}
windowObj.openUserHistory = openUserHistory;

const statsWindow = document.createElement('div');
statsWindow.className = 'window user-stats-window';
statsWindow.innerHTML = `
        <h2>User Statistics</h2>
        <div class="stats-content">
            <p id="statsContent">Loading...</p>
            <div id="histogram-opener-container">
                <button id="openAlgoHistogram">Algo Histogram</button>
                <button id="openHeuristicHistogram">Heuristic Histogram</button>
            </div>
        </div>
        <button id="open" style="display: none;">+</button>
        <button id="backPage">Back Page</button>
        <button id="nextPage">Next Page</button>`;
(statsWindow.querySelector('#histogram-opener-container') as HTMLDivElement)!.style.display = 'none';
let isOpenedAlgoHistogram = false;
(statsWindow.querySelector('#openAlgoHistogram') as HTMLButtonElement)!.addEventListener('click', () => {
    if (isOpenedAlgoHistogram) {
        return;
    }
    isOpenedAlgoHistogram = true;
    let windowElement = openHistogram(true);
    handleWindow({
        window: windowElement,
        x: 5,
        y: 5,
        deletable: true,
        width: 500,
        height: 460,
        onClose: () => {
            isOpenedAlgoHistogram = false;
        },
    });
});
let isOpenedHeuristicHistogram = false;
(statsWindow.querySelector('#openHeuristicHistogram') as HTMLButtonElement)!.addEventListener('click', () => {
    if (isOpenedHeuristicHistogram) {
        return;
    }
    isOpenedHeuristicHistogram = true;
    let windowElement = openHistogram(false);
    handleWindow({
        window: windowElement,
        x: 5,
        y: 5,
        deletable: true,
        width: 500,
        height: 460,
        onClose: () => {
            isOpenedHeuristicHistogram = false;
        },
    });
});

document.body.appendChild(statsWindow);
handleWindow({
    window: statsWindow,
    x: 2,
    y: 50,
    height: 300,
    deletable: false,
    minimum: {
        opened: (toggle) => {
            (statsWindow.querySelector('h2') as HTMLElement)!.style.display = 'block';
            (statsWindow.querySelector('.stats-content') as HTMLElement)!.style.display = 'block';
            (statsWindow.querySelector('.title-bar') as HTMLElement)!.style.display = 'block';
            (statsWindow.querySelector('#open') as HTMLElement).style.display = 'none';
            (statsWindow.querySelector('.title-bar') as HTMLElement)!.style.color = 'black';
            (statsWindow.querySelector('.title-bar') as HTMLElement)!.style.height = '20px';
            (statsWindow.querySelector('.title-bar .min-button') as HTMLElement)!.style.display = 'block';
            (statsWindow.querySelector('#backPage') as HTMLElement).innerText = 'Back Page';
            (statsWindow.querySelector('#nextPage') as HTMLElement).innerText = 'Next Page';
            statsWindow.querySelector('#open')!.removeEventListener('click', toggle);
            statsWindow.style.height = '300px';
            statsWindow.style.width = '300px';
        },
        closed: (toggle) => {
            statsWindow.style.height = '160px';
            statsWindow.style.width = '55px';
            (statsWindow.querySelector('h2') as HTMLElement)!.style.display = 'none';
            (statsWindow.querySelector('.stats-content') as HTMLElement)!.style.display = 'none';
            (statsWindow.querySelector('.title-bar') as HTMLElement)!.style.color = 'white';
            (statsWindow.querySelector('.title-bar') as HTMLElement)!.style.height = '20px';
            (statsWindow.querySelector('.title-bar .min-button') as HTMLElement)!.style.display = 'none';
            (statsWindow.querySelector('#open') as HTMLElement).style.display = 'block';
            statsWindow.querySelector('#open')!.addEventListener('click', toggle);
            statsWindow.querySelector('#backPage')!.innerHTML = '&lt;';
            statsWindow.querySelector('#nextPage')!.innerHTML = '&gt;';
        },
    },
});
statsWindow.querySelector('#nextPage')!.addEventListener('click', () => {
    getUsers();
});
statsWindow.querySelector('#backPage')!.addEventListener('click', () => {
    getUsers(true);
});
applyFilters();
