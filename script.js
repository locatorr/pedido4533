document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIG =================

    const ORIGEM = [-3.1190, -60.0217]; // Manaus
    const DESTINO = [-3.7327, -38.5270]; // CEP 60175-005 Fortaleza

    const DURACAO_VIAGEM = 72 * 60 * 60 * 1000; // 3 dias em ms
    const CHAVE_INICIO = "inicio_viagem";

    // ================= ROTAS =================

    const ROTAS = {
        "58036": {
            destinoNome: "Fortaleza - CE",
            destinoDesc: "Rota: Manaus → Fortaleza",
            waypoints: [
                [-60.0217, -3.1190],
                [-38.5270, -3.7327]
            ]
        }
    };

    // ================= VARIÁVEIS =================

    let map;
    let fullRoute = [];
    let carMarker;
    let polyline;

    document.getElementById('btn-login')?.addEventListener('click', verificarCodigo);

    verificarSessaoSalva();

    function verificarCodigo() {

        const code = document.getElementById('access-code').value.trim();

        if (!ROTAS[code]) {
            alert("Código não encontrado.");
            return;
        }

        localStorage.setItem('codigoAtivo', code);

        if (!localStorage.getItem(CHAVE_INICIO)) {
            localStorage.setItem(CHAVE_INICIO, Date.now());
        }

        carregarInterface(code);
    }

    function verificarSessaoSalva() {

        const codigo = localStorage.getItem('codigoAtivo');

        if (codigo && ROTAS[codigo]) {
            document.getElementById('access-code').value = codigo;
            carregarInterface(codigo);
        }
    }

    function carregarInterface(codigo) {

        const rota = ROTAS[codigo];

        buscarRota(rota.waypoints).then(() => {

            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('info-card').style.display = 'flex';

            iniciarMapa();

        });

    }

    // ================= BUSCAR ROTA =================

    async function buscarRota(pontos) {

        const coordenadas = pontos.map(p => `${p[0]},${p[1]}`).join(';');

        const url = `https://router.project-osrm.org/route/v1/driving/${coordenadas}?overview=full&geometries=geojson`;

        const data = await fetch(url).then(r => r.json());

        fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    // ================= MAPA =================

    function iniciarMapa() {

        map = L.map('map', { zoomControl: false }).setView(ORIGEM, 5);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        // rota completa cinza
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

        carMarker = L.marker(ORIGEM, {
            icon: truckIcon,
            zIndexOffset: 1000
        }).addTo(map);

        iniciarMovimento();
    }

    // ================= MOVIMENTO EM TEMPO REAL =================

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

    // ================= CALCULAR POSIÇÃO =================

    function calcularPosicao(progresso) {

        const posReal = progresso * (fullRoute.length - 1);

        const idx = Math.floor(posReal);

        const t = posReal - idx;

        const p1 = fullRoute[idx];
        const p2 = fullRoute[idx + 1] || p1;

        const lat = p1[0] + (p2[0] - p1[0]) * t;
        const lng = p1[1] + (p2[1] - p1[1]) * t;

        return [lat, lng];
    }

    // ================= LINHA RESTANTE =================

    function atualizarLinha(pos) {

        const idx = encontrarIndiceMaisProximo(pos);

        map.removeLayer(polyline);

        polyline = L.polyline(
            [pos, ...fullRoute.slice(idx + 1)],
            {
                dashArray: '10,10',
                color: '#2563eb',
                weight: 5
            }
        ).addTo(map);
    }

    function encontrarIndiceMaisProximo(pos) {

        let menor = Infinity;
        let indice = 0;

        fullRoute.forEach((p, i) => {

            const d = Math.hypot(p[0] - pos[0], p[1] - pos[1]);

            if (d < menor) {
                menor = d;
                indice = i;
            }

        });

        return indice;
    }

});
