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
    let numDots = Math.floor((window.innerHeight * window.innerWidth) / 400);
    console.log(numDots);
    const dots = Array.from({ length: numDots }, initDot);
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        dots.forEach((dot) => {
            dot.x *= window.innerWidth / beforeWidth;
            dot.y *= window.innerHeight / beforeHeight;
        });
        beforeWidth = window.innerWidth;
        beforeHeight = window.innerHeight;
    });

    function initDot() {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const depth = Math.random() * 100 + 50;

        return {
            x,
            y,
            depth,
            nowX: x,
            nowY: y,
            theta: Math.random() * 360,
            speed: Math.random() * 0.5 + 0.5,
            delta: Math.random() * 360,
            isStatic: false,
        };
    }

    window.addEventListener('wheel', (e) => {
        dots.forEach((dot) => {
            dot.y -= e.deltaY * 0.1 * (dot.depth / 100);

            if (dot.nowY > window.innerHeight) {
                const overflow = dot.y - dot.nowY;
                dot.y = overflow;
                dot.x = Math.random() * window.innerWidth;
                dot.nowX = dot.x;
                dot.nowY = 0;
            } else if (dot.nowY < 0) {
                const overflow = dot.y - dot.nowY;
                dot.y = window.innerHeight + overflow;
                dot.x = Math.random() * window.innerWidth;
                dot.nowX = dot.x;
                dot.nowY = window.innerHeight;
            }
        });
    });

    function tick() {
        requestAnimationFrame(tick);
        if (!ctx) {
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        dots.forEach((dot) => {
            const dx = dot.x - dot.nowX;
            const dy = dot.y - dot.nowY;
            dot.nowX += dx * 0.05;
            dot.nowY += dy * 0.05;

            dot.theta += dot.speed / 60;
            dot.theta %= 360;
            if (!dot.isStatic) {
                dot.x += (Math.cos(((dot.theta + dot.delta) / 180) * Math.PI) * dot.depth) / 900;
                dot.y += (Math.sin((dot.theta / 180) * Math.PI) * dot.depth) / 600;
            }
            ctx.fillStyle = 'rgba(255, 255, 255, ' + dot.depth / 400 + ')';
            ctx.beginPath();
            ctx.arc(dot.nowX, dot.nowY, dot.depth / 70, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        });
    }

    /**
     * お蔵入り
     */
    function gotoText(text: string, fontSize?: number, point_count?: number) {
        const point_num = point_count || numDots;
        if (point_num > numDots) {
            numDots = point_num;
            dots.push(...Array.from({ length: numDots - dots.length }, initDot));
        } else if (point_num < numDots) {
            dots.splice(numDots, dots.length - numDots);
        }
        const points = getFontPoints(text, {
            maxPoints: numDots,
            canvasHeight: window.innerHeight,
            canvasWidth: window.innerWidth,
            font: (fontSize || 300) + 'px "Playfair Display", serif',
        });
        dots.forEach((dot, i) => {
            dot.x = points[i].x;
            dot.y = points[i].y;
            dot.isStatic = true;
        });
    }
    window.gotoText = gotoText;

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
