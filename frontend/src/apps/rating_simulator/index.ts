import { draw } from './calc';
import './style.scss';

export let canvasData = {
    width: 0,
    height: 0,
};

window.addEventListener('load', () => {
    let isSmartphone = false;
    let username = '';
    if (window.innerWidth <= 768) {
        isSmartphone = true;
    }
    let times = 1;
    let isCustom = false;
    const timesRadios = document.getElementsByName('contestTimes') as NodeListOf<HTMLInputElement>;
    timesRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            if (target.checked) {
                if (target.value === 'custom') {
                    times = parseInt((document.getElementById('contestTimeCustomInput') as HTMLInputElement).value, 10);
                    isCustom = true;
                } else {
                    times = parseInt(target.value, 10);
                    isCustom = false;
                }
            }
        });
    });
    let customInput = document.getElementById('contestTimeCustomInput') as HTMLInputElement;
    customInput.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value, 10);
        if (isNaN(value) || value <= 0) {
            customInput.value = '1';
            times = 1;
        } else {
            times = value;
        }
    });
    let usernameInput = document.getElementById('username') as HTMLInputElement;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    usernameInput.addEventListener('input', (e) => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            username = (e.target as HTMLInputElement).value.trim();
            if (username.length === 0) {
                username = 'user';
            }
        }, 200);
    });
    let isHeuristic = false;
    let isLongHeuristic = false;
    const heuristicCheckbox = document.getElementById('ratingHeuristic') as HTMLInputElement;
    heuristicCheckbox.addEventListener('change', (e) => {
        isHeuristic = (e.target as HTMLInputElement).checked;
        isLongHeuristic = false;
    });
    const heuristicLongCheckbox = document.getElementById('ratingHeuristicLong') as HTMLInputElement;
    heuristicLongCheckbox.addEventListener('change', (e) => {
        isHeuristic = (e.target as HTMLInputElement).checked;
        isLongHeuristic = (e.target as HTMLInputElement).checked;
    });
    const algoCheckbox = document.getElementById('ratingAlgo') as HTMLInputElement;
    algoCheckbox.addEventListener('change', (e) => {
        isHeuristic = false;
    });

    const canvas = document.getElementById('ratingCanvas') as HTMLCanvasElement;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    canvasData.width = canvas.width;
    canvasData.height = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Failed to get canvas context');
        return;
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            isSmartphone = true;
        } else {
            isSmartphone = false;
        }
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        canvasData.width = canvas.width;
        canvasData.height = canvas.height;
    });
    async function tick() {
        if (!ctx) {
            return;
        }
        await draw(ctx, username || 'user', times, isHeuristic, isLongHeuristic, usernameInput);
        requestAnimationFrame(tick);
    }
    tick();
});
