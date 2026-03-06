document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIG =================
    const CHECKPOINT_INICIO = [-3.1190, -60.0217]; // Manaus
    const CHAVE_INICIO_RESTANTE = 'inicio_viagem_restante';

    // ponto da rota onde ficará parado (entre João Pessoa e Paranaguá)
    const POSICAO_PRF = 0.70;

    // ================= ROTAS =================
    const ROTAS = {
        "58036": {
            destinoNome: "Paranaguá - PR",
            destinoDesc: "Rota: Manaus → Paraíba → Paranaguá",
            
            waypoints: [
                [-60.0217, -3.1190],   // Manaus
                [-34.8641, -7.1150],   // João Pessoa
                [-48.5095, -25.5163]   // Paranaguá
            ]
        }
    };

    // ================= VARIÁVEIS =================
    let map, polyline, carMarker;
    let fullRoute = [];
    let rotaAtual = null;

    document.getElementById('btn-login')?.addEventListener('click', verificarCodigo);
    verificarSessaoSalva();

    function verificarCodigo() {
        const code = document.getElementById('access-code').value.trim();

        if (!ROTAS[code]) {
            alert("Código não encontrado.");
            return;
        }

        localStorage.setItem('codigoAtivo', code);
        carregarInterface(code);
    }

    function verificarSessaoSalva() {
        const codigo = localStorage.getItem('codigoAtivo');

        if (codigo && ROTAS[codigo]) {
            document.getElementById('access-code').value = codigo;
        }
    }

    function carregarInterface(codigo) {

        rotaAtual = ROTAS[codigo];

        buscarRotaComParada(rotaAtual.waypoints).then(() => {

            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('info-card').style.display = 'flex';

            iniciarMapa();

        });

    }

    async function buscarRotaComParada(pontos) {

        const coordenadas = pontos.map(p => `${p[0]},${p[1]}`).join(';');

        const url = `https://router.project-osrm.org/route/v1/driving/${coordenadas}?overview=full&geometries=geojson`;

        const data = await fetch(url).then(r => r.json());

        fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }

    function iniciarMapa() {

        map = L.map('map', { zoomControl: false }).setView(CHECKPOINT_INICIO, 5);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        // rota completa
        L.polyline(fullRoute, {
            color: '#94a3b8',
            weight: 4,
            opacity: 0.5
        }).addTo(map);

        polyline = L.polyline(fullRoute, {
            color: '#2563eb',
            weight: 5,
            dashArray: '10,10'
        }).addTo(map);

        // cálculo da posição onde ficará parado
        const posReal = POSICAO_PRF * (fullRoute.length - 1);

        const idx = Math.floor(posReal);
        const t = posReal - idx;

        const p1 = fullRoute[idx];
        const p2 = fullRoute[idx + 1] || p1;

        const lat = p1[0] + (p2[0] - p1[0]) * t;
        const lng = p1[1] + (p2[1] - p1[1]) * t;

        const pos = [lat, lng];

        const truckIcon = L.divIcon({
            className: 'custom-marker',
            html: `
            <div style="text-align:center">
                <div style="
                    background:#ef4444;
                    color:white;
                    font-size:11px;
                    padding:3px 6px;
                    border-radius:6px;
                    margin-bottom:3px;
                    font-weight:bold;
                ">
                🚔 RETIDO NA PRF
                </div>
                <div style="font-size:32px;">🚛</div>
            </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        carMarker = L.marker(pos, {
            icon: truckIcon,
            zIndexOffset: 1000
        }).addTo(map);

        map.setView(pos, 6);

        const badge = document.getElementById('time-badge');
        if (badge) {
            badge.innerText = "RETIDO NA PRF";
        }

        desenharLinhaRestante(pos, idx);
    }

    function desenharLinhaRestante(pos, idx) {

        map.removeLayer(polyline);

        polyline = L.polyline(
            [pos, ...fullRoute.slice(idx + 1)],
            { dashArray: '10,10', color: '#2563eb', weight: 5 }
        ).addTo(map);
    }

});


