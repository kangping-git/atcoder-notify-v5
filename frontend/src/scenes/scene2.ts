import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import '../default';

interface FeatureExplain {
    title: string;
    subtitle?: string;
    description: string;
}
const featureExplains: Record<string, FeatureExplain> = {
    remind: {
        title: 'Contest Reminder',
        subtitle: 'Never miss an AtCoder contest again.',
        description:
            'We send <strong>timely reminders</strong> before each contest starts—complete with customizable countdowns and <strong>timezone-aware</strong> notifications.',
    },
    notify: {
        title: 'Submission Realtime Notify',
        subtitle: 'Know your results the instant they arrive.',
        description:
            'Receive <strong>instant alerts</strong> for every submission (AC, WA, TLE, etc.), so you’ll always be on top of your performance.',
    },
    web_dash: {
        title: 'Web Dashboard',
        subtitle: 'All your stats in one sleek interface.',
        description:
            'Browse your contest history, track <strong>rating changes over time</strong>, and visualize your progress with intuitive charts.',
    },
    custom: {
        title: 'Customization',
        subtitle: 'Notifications your way.',
        description:
            'Fine-tune where and when you get alerts—Discord, Slack, or email—with <strong>flexible filters</strong> and scheduling options.',
    },
};

let isSmartphone = false;

window.addEventListener('load', () => {
    isSmartphone = window.innerWidth <= 600;
    gsap.set('#scene2 h2', { opacity: 1 });
    gsap.set('#scene2 #feature-list', { opacity: 1 });
    const split = SplitText.create('#scene2 h2', { type: 'chars' });
    const splitFeatureList = SplitText.create('#scene2 #feature-list', { type: 'words,lines' });
    gsap.timeline({
        scrollTrigger: {
            trigger: '#scene2 h2',
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
                x: '-300px',
                y: '50px',
                stagger: 0.05,
                opacity: 1,
                ease: 'power3.out',
            },
        )
        .from(splitFeatureList.lines, {
            duration: 0.5,
            y: '50px',
            stagger: 0.2,
            opacity: 0,
            ease: 'power3.out',
        });
    let isHidden = true;
    let nowActiveElement: HTMLElement | null = null;
    document.querySelectorAll('#scene2 #feature-list li').forEach((li) => {
        const featureId = li.getAttribute('data-item') || '';
        // Create an arrow element and append it to each list item
        const arrow = document.createElement('span');
        arrow.textContent = '→';
        arrow.style.display = 'inline-block';
        arrow.style.marginLeft = '8px';
        li.appendChild(arrow);
        gsap.set(arrow, { opacity: 0.5 });
        // Animate the arrow to slide horizontally on hover
        const animation = gsap.to(arrow, {
            paused: true,
            duration: 0.2,
            x: isSmartphone ? 10 : 30,
            opacity: 1,
            ease: 'power3.out',
        });
        li.addEventListener('mouseenter', () => {
            animation.play();
        });
        li.addEventListener('mouseleave', () => {
            animation.reverse();
        });
        li.addEventListener('click', () => {
            if (isHidden) {
                gsap.to(document.getElementById('feature-view'), {
                    duration: 0.5,
                    opacity: 1,
                    width: '50vw',
                    ease: 'power1.out',
                });
                document.getElementById('feature-title')!.innerHTML =
                    featureExplains[featureId].title;
                document.getElementById('feature-description')!.innerHTML =
                    featureExplains[featureId].description;
                const featureTitleSplit = SplitText.create('#feature-title', { type: 'words' });
                const featureDescriptionSplit = SplitText.create('#feature-description', {
                    type: 'words',
                });
                gsap.fromTo(
                    featureTitleSplit.words.concat(featureDescriptionSplit.words),
                    {
                        transform: 'rotateX(90deg)',
                        opacity: 0,
                    },
                    {
                        delay: 0.5,
                        duration: 0.3,
                        transform: 'rotateX(0deg)',
                        stagger: 0.02,
                        opacity: 1,
                        ease: 'power3.out',
                    },
                );
                gsap.to(li, {
                    textShadow: '0px 0px 5px #ccc',
                    duration: 0.5,
                });

                isHidden = false;
            } else {
                const featureTitleSplit = SplitText.create('#feature-title', { type: 'words' });
                const featureDescriptionSplit = SplitText.create('#feature-description', {
                    type: 'words',
                });
                gsap.to(featureTitleSplit.words.concat(featureDescriptionSplit.words), {
                    duration: 0.3,
                    transform: 'rotateX(90deg)',
                    stagger: 0.02,
                    opacity: 0,
                    ease: 'power3.out',
                }).eventCallback('onComplete', () => {
                    document.getElementById('feature-title')!.innerHTML =
                        featureExplains[featureId].title;
                    document.getElementById('feature-description')!.innerHTML =
                        featureExplains[featureId].description;

                    const featureTitleSplit = SplitText.create('#feature-title', { type: 'words' });
                    const featureDescriptionSplit = SplitText.create('#feature-description', {
                        type: 'words',
                    });
                    gsap.fromTo(
                        featureTitleSplit.words.concat(featureDescriptionSplit.words),
                        {
                            transform: 'rotateX(90deg)',
                            opacity: 0,
                        },
                        {
                            duration: 0.3,
                            transform: 'rotateX(0deg)',
                            stagger: 0.02,
                            opacity: 1,
                            ease: 'power3.out',
                        },
                    );
                });

                gsap.to(nowActiveElement, {
                    textShadow: '0px 0px 10px rgba(0, 0, 0, 0)',
                    duration: 0.5,
                });
                gsap.to(li, {
                    textShadow: '0px 0px 5px #ccc',
                    duration: 0.5,
                });
            }
            nowActiveElement = li as HTMLElement;
        });
    });
});
