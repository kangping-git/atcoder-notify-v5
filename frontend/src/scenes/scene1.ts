import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import '../default';

window.addEventListener('load', () => {
    const messages = [
        'Never Miss a Beat in Your Next AtCoder Contest',
        'Real-Time Submission Alerts, Straight to Your Inbox',
        'Stay Ahead with Instant Contest & Submission Notifications',
        'Track Contests, Submissions & Ratings—all in One Place',
        'Your Personal AtCoder Assistant: Contests, Submits, Stats',
        'Automated Contest Reminders and Submission Feedback',
        'From Upcoming Contests to AC Results—Always Informed',
        'Contest Schedules, Submission Status, Rating Changes—Live',
        'Level Up Your AtCoder Workflow with Instant Updates',
        'All Your AtCoder Notifications, Unified and Automated',
    ];
    const randomIndex = Math.floor(Math.random() * messages.length);
    const randomMessage = messages[randomIndex];
    const messageElement = document.querySelector('span#subtitle') as HTMLSpanElement;
    if (messageElement) {
        messageElement.textContent = randomMessage;
    }

    gsap.set('h1', { opacity: 1 });
    gsap.set('span#subtitle', { opacity: 1 });
    const split = SplitText.create('h1', { type: 'chars' });
    const splitSubtitle = SplitText.create('span#subtitle', { type: 'chars,words' });
    gsap.from(split.chars, {
        duration: 2,
        y: 0,
        autoAlpha: 0,
        stagger: 0.025,
        rotate: 60,
        ease: 'elastic.out',
    });
    gsap.from(splitSubtitle.words, {
        duration: 2,
        y: 0,
        autoAlpha: 0,
        stagger: 0.1,
        rotate: 'random(-30, 30)',
        ease: 'elastic.out',
        delay: 0.7,
    });
});
