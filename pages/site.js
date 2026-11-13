import Alpine from 'alpinejs';
import './style.css';

const pages = new Set(['home', 'guide', 'addons', 'versions']);

function routeFromHash() {
    const [name] = window.location.hash.slice(1).split('-');
    return pages.has(name) ? name : 'home';
}

Alpine.data('site', () => ({
    page: routeFromHash(),
    addonTab: 'date',
    demoTime: '10:08:32',
    init() {
        const updateRoute = () => {
            this.page = routeFromHash();
            const addonRoute = window.location.hash.slice(1).match(/^addons-(date|region|timer|progress|counter)$/);
            this.addonTab = addonRoute?.[1] || 'date';
            this.$nextTick(() => {
                const id = window.location.hash.slice(1);
                if (id.includes('-') && document.getElementById(id)) {
                    document.getElementById(id).scrollIntoView();
                }
            });
        };
        window.addEventListener('hashchange', updateRoute);
        const updateTime = () => {
            this.demoTime = new Intl.DateTimeFormat('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
            }).format(new Date());
        };
        updateTime();
        const interval = window.setInterval(updateTime, 1000);
        window.addEventListener('pagehide', () => window.clearInterval(interval), { once: true });
        updateRoute();
    },
    navigate(name, event) {
        if (!pages.has(name)) return;
        event.preventDefault();
        if (window.location.hash === `#${name}`) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.location.hash = name;
            window.scrollTo({ top: 0 });
        }
    },
    scrollToSection(id, event) {
        event.preventDefault();
        if (id.startsWith('addons-')) this.addonTab = id.slice(7);
        if (window.location.hash !== `#${id}`) window.location.hash = id;
        this.$nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }));
    },
}));

Alpine.start();
