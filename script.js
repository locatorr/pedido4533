document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIG =================

    const ORIGEM = [-1.798, -61.384]; // CEP 69250-000
    const DESTINO = [-19.967, -44.198]; // CEP 32185-362

    const DURACAO_VIAGEM = 72 * 60 * 60 * 1000; // 3 dias
    const CHAVE_INICIO = "inicio_viagem";

    let map;
    let fullRoute = [];
    let carMarker;
    let polyline;

    document.getElementById('btn-login')?.addEventListener('click', iniciarSistema);

    function iniciarSistema() {

        const code = document.getElementById('access-code').value.trim();

        if (code !== "58036") {
            alert("Código inválido");
            return;
        }

        // SEMPRE REINICIA
        localStorage.setItem(CHAVE_INICIO, Date.now());

        gerarRotaFake();
        iniciarMapa();

        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('info-card').style.display = 'flex';
    }

    // ================= ROTA DIRETA (SEM API) =================

    function gerarRotaFake() {

        fullRoute = [];

        const passos = 500; // quanto maior, mais suave

        for (let i = 0; i <= passos; i++) {

            const t = i / passos;

            const lat = ORIGEM[0] + (DESTINO[0] - ORIGEM[0]) * t;
            const lng = ORIGEM[1] + (DESTINO[1] - ORIGEM[1]) * t;

            fullRoute.push([lat, lng]);
        }
    }

    // ================= MAPA =================

    function iniciarMapa() {

        map = L.map('map', { zoomControl: false }).setView(ORIGEM, 5);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        // rota total
        L.polyline(fullRoute, {
            color: '#94a3b8',
            weight: 4,
            opacity: 0.5
        }).addTo(map);

        polyline = L.polyline([], {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10'
        }).addTo(map);

        const truckIcon = L.divIcon({
            className: 'custom-marker',
            html: `
            <div style="text-align:center">
                <div style="
                    background:#2563eb;
                    color:white;
                    font-size:11px;
                    padding:3px 6px;
                    border-radius:6px;
                    margin-bottom:3px;
                    font-weight:bold;
                ">
                🚚 EM ROTA
                </div>
                <div style="font-size:32px;">🚛</div>
            </div>
            `,
            iconSize: [40,40],
            iconAnchor: [20,20]
        });

        // COMEÇA NO CEP INICIAL
        carMarker = L.marker(ORIGEM, {
            icon: truckIcon
        }).addTo(map);

        iniciarMovimento();
    }

    // ================= MOVIMENTO =================

    function iniciarMovimento() {

        const inicio = parseInt(localStorage.getItem(CHAVE_INICIO));

        setInterval(() => {

            const agora = Date.now();

            let progresso = (agora - inicio) / DURACAO_VIAGEM;

            if (progresso > 1) progresso = 1;

            const posicao = calcularPosicao(progresso);

            carMarker.setLatLng(posicao);

            map.panTo(posicao, { animate: true });

            atualizarLinha(posicao);

        }, 2000);
    }

    // ================= POSIÇÃO =================

    function calcularPosicao(progresso) {

        const index = Math.floor(progresso * (fullRoute.length - 1));

        return fullRoute[index];
    }

    // ================= LINHA =================

    function atualizarLinha(pos) {

        const index = fullRoute.findIndex(p => p[0] === pos[0] && p[1] === pos[1]);

        map.removeLayer(polyline);

        polyline = L.polyline(
            fullRoute.slice(index),
            {
                dashArray: '10,10',
                color: '#2563eb',
                weight: 5
            }
        ).addTo(map);
    }

});
