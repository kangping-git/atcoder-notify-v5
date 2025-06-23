import '../default';
import '../styles/apps.scss';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);
window.addEventListener('load', () => {
    const splitText = new SplitText('h1', {
        type: 'chars',
        linesClass: 'lineChildren',
    });
    const splitTextDetails = new SplitText('#apps_detail', {
        type: 'chars',
        linesClass: 'lineChildren',
    });
    gsap.set('#apps_detail', {
        autoAlpha: 1,
        opacity: 1,
    });
    gsap.set('h1', {
        autoAlpha: 1,
        opacity: 1,
    });
    gsap.from(splitText.chars, {
        duration: 0.5,
        autoAlpha: 0,
        stagger: 0.05,
        rotate: 60,
        ease: 'elastic.out',
    });
    gsap.from(splitTextDetails.chars, {
        duration: 0.5,
        autoAlpha: 0,
        stagger: 0.01,
        rotate: 60,
        delay: 0.3,
        ease: 'elastic.out',
    });
    gsap.from('.app-container', {
        duration: 0.5,
        autoAlpha: 0,
        stagger: 0.2,
        y: 50,
        delay: 0.5,
        ease: 'power.out',
    });
});
