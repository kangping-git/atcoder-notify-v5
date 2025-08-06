import './default';
import './styles/dashboard.scss';

window.addEventListener('load', () => {
    document.getElementById('link_atcoder_account')!.addEventListener('click', () => {
        (document.getElementById('link_dialog') as HTMLDialogElement).showModal();
    });
    document.getElementById('link_button')!.addEventListener('click', async () => {
        let username = (document.getElementById('atcoder_account') as HTMLInputElement).value;
        fetch('/accounts/link/atcoder?username=' + encodeURIComponent(username))
            .then((v) => v.json())
            .then((out) => {
                if (!out.success) {
                    alert(out.reason);
                    return;
                }
                (document.getElementById('link_dialog') as HTMLDialogElement).close();
            });
    });
    document.getElementById('close_button')!.addEventListener('click', async () => {
        (document.getElementById('link_dialog') as HTMLDialogElement).close();
    });
});
