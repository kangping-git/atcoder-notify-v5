import './styles/error.scss';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);
import './default';

window.addEventListener('load', () => {
    anime();
});

function anime() {
    const errorTextSplit = SplitText.create('h1', { type: 'chars' });
    const errorDetailSplit = SplitText.create('p', { type: 'chars' });
    gsap.set('h1', { opacity: 1, rotate: 0, transform: '', autoAlpha: 1 });
    gsap.set('p', { opacity: 1, rotate: 0, transform: '', autoAlpha: 1 });
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
        );
}
