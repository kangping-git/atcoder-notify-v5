import { gsap } from 'gsap';
import { getFontPoints } from './scenes/getFontPoints';
import { SplitText } from 'gsap/all';
import './styles/default.scss';
gsap.registerPlugin(SplitText);

window.addEventListener('load', () => {
    const bg = document.getElementById('background') as HTMLDivElement;
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let beforeWidth = window.innerWidth;
    let beforeHeight = window.innerHeight;
    bg.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }
    let scrollY = 0;
    let scrollNow = 0;
    window.addEventListener('wheel', (e) => {
        scrollNow -= e.deltaY / 10;
    });
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        beforeWidth = window.innerWidth;
        beforeHeight = window.innerHeight;
    });

    function tick() {
        requestAnimationFrame(tick);
        if (!ctx) {
            return;
        }
        scrollY = (scrollY * 29 + scrollNow) / 30;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 0.2;
        for (let i = 50; i < canvas.width; i += 50) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, beforeHeight);
        }
        for (let i = scrollY % 50; i < canvas.height; i += 50) {
            ctx.moveTo(0, i);
            ctx.lineTo(beforeWidth, i);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = 'rgb(55,55,55)';
        for (let x = 50; x < canvas.width; x += 50) {
            for (let y = scrollY % 50; y < canvas.height; y += 50) {
                ctx.moveTo(x, y - 2);
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
            }
        }
        ctx.fill();
    }

    tick();

    const nav = document.getElementById('nav-mobile') as HTMLDivElement;
    if (window.matchMedia('(max-width: 600px)').matches) {
        gsap.set('#nav-mobile li', { transform: 'rotateX(90deg)', opacity: 0, display: 'none' });
    }
    window.matchMedia('(max-width: 600px)').addEventListener('change', (e) => {
        if (e.matches) {
            gsap.set('#nav-mobile', { display: 'none' });
            gsap.set('#nav-mobile li', { transform: 'rotateX(90deg)', opacity: 0, display: 'none' });
        } else {
            gsap.set('#nav-mobile li', { display: 'block' });
            gsap.set('#nav-mobile li', { transform: 'rotateX(0deg)', opacity: 1 });
        }
    });
    document.getElementById('hamburger-button')!.addEventListener('click', () => {
        if (document.getElementById('hamburger-button')!.classList.contains('disabled')) {
            return;
        }
        const isOpen = nav.classList.toggle('open');
        document.getElementById('hamburger-button')!.classList.add('disabled');
        if (isOpen) {
            gsap.set('#nav-mobile li', { display: 'block' });
            gsap.set('#nav-mobile', { display: 'block' });
            gsap.to('#nav-mobile li', {
                duration: 0.5,
                transform: 'rotateX(0deg)',
                opacity: 1,
                stagger: 0.1,
            }).eventCallback('onComplete', () => {
                document.getElementById('hamburger-button')!.classList.remove('disabled');
            });
        } else {
            gsap.to('#nav-mobile li', {
                duration: 0.5,
                transform: 'rotateX(90deg)',
                opacity: 0,
                stagger: 0.1,
            }).eventCallback('onComplete', () => {
                gsap.set('#nav-mobile li', { transform: 'rotateX(0deg)', display: 'none' });
                gsap.set('#nav-mobile', { display: 'none' });
                document.getElementById('hamburger-button')!.classList.remove('disabled');
            });
        }
    });
});

declare global {
    interface Window {
        gotoText: (text: string, fontSize?: number, point_num?: number) => void;
    }
}
