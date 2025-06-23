import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

window.addEventListener('load', () => {
    gsap.set('#scene3 h2', { opacity: 1 });
    const split = SplitText.create('#scene3 h2', { type: 'chars' });
    gsap.timeline({
        scrollTrigger: {
            trigger: '#scene3 h2',
            start: 'top 80%',
        },
    })
        .fromTo(
            split.chars,
            {
                y: '200px',
            },
            {
                duration: 0.5,
                y: '50px',
                stagger: 0.05,
                opacity: 1,
                ease: 'power3.out',
            },
        )
        .fromTo(
            '#scene3 .app-container',
            {
                opacity: 0,
                y: '100px',
            },
            {
                duration: 0.5,
                y: '0px',
                opacity: 1,
                stagger: 0.1,
            },
        );

    const appContainer = document.querySelectorAll('.app-container');
    appContainer.forEach((app) => {
        app.addEventListener('mouseover', (e) => {
            gsap.to(app, {
                scale: 1.05,
                duration: 0.3,
                ease: 'power3.out',
            });
        });
        app.addEventListener('mouseout', (e) => {
            gsap.to(app, {
                scale: 1,
                duration: 0.3,
                ease: 'power3.out',
            });
        });
    });
});
