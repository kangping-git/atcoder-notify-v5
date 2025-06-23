import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './default';
import './styles/login.scss';
gsap.registerPlugin(SplitText);
gsap.registerPlugin(ScrollTrigger);

window.addEventListener('load', () => {
    const splitText = new SplitText('h1', {
        type: 'chars',
        linesClass: 'lineChildren',
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
});
