import '../styles/error.scss';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
gsap.registerPlugin(SplitText);
gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(Physics2DPlugin);
gsap.registerPlugin(DrawSVGPlugin);
import '../default';

window.addEventListener('load', () => {
    anime();
});

function anime() {
    const h1 = document.querySelector('h1') as HTMLHeadingElement;
    const p = document.querySelector('p') as HTMLParagraphElement;
    h1.innerText = '418 I’m a teapot';
    p.innerText = 'Sorry, I can’t brew coffee for you.';
    const errorTextSplit = SplitText.create('h1', { type: 'chars' });
    const errorDetailSplit = SplitText.create('p', { type: 'chars' });
    gsap.set('h1', { opacity: 1, rotate: 0, transform: '', autoAlpha: 1 });
    gsap.set('p', { opacity: 1, rotate: 0, transform: '', autoAlpha: 1 });
    gsap.set('#teapot path', { drawSVG: '0%' });
    gsap.set('#yuge path', { autoAlpha: 0 });
    gsap.timeline()
        .from(errorTextSplit.chars, {
            duration: 0.5,
            autoAlpha: 0,
            stagger: 0.05,
            rotate: 60,
            ease: 'elastic.out',
        })
        .from(
            errorDetailSplit.chars,
            {
                duration: 0.5,
                autoAlpha: 0,
                stagger: 0.05,
                rotate: 60,
                ease: 'elastic.out',
            },
            '-=0.5',
        )
        .to(
            '#teapot path',
            {
                duration: 1.5,
                drawSVG: '100%',
                ease: 'power1.in',
            },
            '+=1',
        )
        .to(
            'h1',
            {
                duration: 0.5,
                rotate: 20,
            },
            '<',
        )
        .eventCallback('onComplete', () => {
            let maxX = 0;
            errorTextSplit.chars.forEach((char) => {
                // x座標を取得
                const x = char.getBoundingClientRect().left;
                maxX = Math.max(maxX, x);
            });
            errorTextSplit.chars.reverse().forEach((char) => {
                const tl = gsap.timeline();
                const x = char.getBoundingClientRect().left;
                tl.to(char, {
                    duration: (maxX - x) / 200,
                    x: maxX - x,
                    ease: 'power1.in',
                });
                tl.to(char, {
                    duration: 2,
                    physics2D: {
                        velocity: 200,
                        angle: 0,
                        gravity: 200,
                    },
                    scale: 0.9,
                });
            });
            setTimeout(() => {
                gsap.timeline()
                    .to('#yuge path', {
                        duration: 1.5,
                        autoAlpha: 1,
                    })
                    .to(
                        'h1',
                        {
                            duration: 0.5,
                            autoAlpha: 0,
                        },
                        '<',
                    )
                    .to(
                        'p',
                        {
                            duration: 0.5,
                            autoAlpha: 0,
                        },
                        '<',
                    )
                    .to(
                        '#teapot path',
                        {
                            duration: 1.5,
                            drawSVG: '0%',
                        },
                        '+=1',
                    )
                    .to(
                        '#yuge path',
                        {
                            duration: 1.5,
                            autoAlpha: 0,
                        },
                        '<',
                    )
                    .eventCallback('onComplete', anime);
            }, 5000);
        });
}
