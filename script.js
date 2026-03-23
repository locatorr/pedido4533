document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIG =================

    const CEP_ORIGEM = "69250000";   // Manaus (ajuste se quiser)
    const CEP_DESTINO = "32185362";

    const DURACAO_VIAGEM = 72 * 60 * 60 * 1000; // 3 dias
    const CHAVE_INICIO = "inicio_viagem";

    const API_KEY = "SUA_API_KEY_AQUI";

    let map;
    let fullRoute = [];
    let carMarker;
    let polyline;

    document.getElementById('btn-login')?.addEventListener('click', iniciarSistema);

    async function iniciarSistema() {

        const code = document.getElementById('access-code').value.trim();

        if (code !== "58036") {
            alert("Código inválido");
            return;
        }

        localStorage.setItem(CHAVE_INICIO, Date.now());

        const origem = await geocodificarCEP(CEP_ORIGEM);
        const destino = await geocodificarCEP(CEP_DESTINO);

        await gerarRotaReal(origem, destino);
        iniciarMapa(origem);

        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('info-card').style.display = 'flex';
    }

    // ================= CEP → COORDENADA =================

    async function geocodificarCEP(cep) {

        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&country=Brazil&postalcode=${cep}`);
        const data = await res.json();

        if (!data.length) {
            alert("CEP não encontrado: " + cep);
            throw new Error("Erro no CEP");
        }

        return [
            parseFloat(data[0].lat),
            parseFloat(data[0].lon)
        ];
    }

    // ================= ROTA REAL =================

    async function gerarRotaReal(origem, destino) {

        const res = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car/geojson`, {
            method: 'POST',
            headers: {
                'Authorization': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: [
                    [origem[1], origem[0]],
                    [destino[1], destino[0]]
                ]
            })
        });

        const data = await res.json();

        const coords = data.features[0].geometry.coordinates;

        // converter para [lat, lng]
        fullRoute = coords.map(c => [c[1], c[0]]);
    }

    // ================= MAPA =================

    function iniciarMapa(origem) {

        map = L.map('map').setView(origem, 5);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        // rota completa (fundo)
        L.polyline(fullRoute, {
            color: '#94a3b8',
            weight: 4
        }).addTo(map);

        polyline = L.polyline([], {
            color: '#2563eb',
            weight: 5
        }).addTo(map);

        const truckIcon = L.divIcon({
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

        carMarker = L.marker(origem, { icon: truckIcon }).addTo(map);

        iniciarMovimento();
    }

    // ================= MOVIMENTO =================

    function iniciarMovimento() {

        const inicio = parseInt(localStorage.getItem(CHAVE_INICIO));

        setInterval(() => {

            const agora = Date.now();

            let progresso = (agora - inicio) / DURACAO_VIAGEM;
            if (progresso > 1) progresso = 1;

            const pos = calcularPosicao(progresso);

            carMarker.setLatLng(pos);
            map.panTo(pos, { animate: true });

            atualizarLinha(progresso);

        }, 2000);
    }

    // ================= POSIÇÃO =================

    function calcularPosicao(progresso) {

        const index = Math.floor(progresso * (fullRoute.length - 1));
        return fullRoute[index];
    }

    // ================= LINHA =================

    function atualizarLinha(progresso) {

        const index = Math.floor(progresso * (fullRoute.length - 1));

        polyline.setLatLngs(fullRoute.slice(0, index));
    }

});
