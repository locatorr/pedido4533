document.addEventListener('DOMContentLoaded', () => {

    // ================= CONFIGURAÇÕES =================
    // Origem: Belo Horizonte - MG
    const ORIGEM = [-19.9166, -43.9344]; 
    // Destino: São João da Ponte - MG
    const DESTINO = [-15.9289, -44.0078]; 

    // Tempo total de viagem: 15 horas
    const DURACAO_VIAGEM = 15 * 60 * 60 * 1000; 
    
    // DATA FIXA: O caminhão saiu dia 31/03/2026 às 08:00:00 da manhã
    // Nota: No JavaScript, o mês começa do zero (Janeiro = 0, Fevereiro = 1, Março = 2)
    const DATA_SAIDA_FIXA = new Date(2026, 2, 31, 8, 0, 0).getTime();

    // Local da parada (Curvelo - MG)
    const CURVELO = [-18.7564, -44.4308];

    let map;
    let fullRoute = [];
    let retainedMarker;
    let polyline;

    document.getElementById('btn-login')?.addEventListener('click', verificarCodigo);
    verificarSessaoSalva();

    // ================= LOGIN =================
    function verificarCodigo() {
        const inputElement = document.getElementById('access-code');
        if (!inputElement) return;

        const code = inputElement.value.trim();
        
        // Verifica se o código é exatamente 39450
        if (code !== "39450") {
            alert("Código de rastreio inválido. Tente novamente.");
            inputElement.value = ""; // Limpa o campo para o usuário tentar de novo
            localStorage.removeItem('codigoAtivo'); // Limpa qualquer sessão errada
            return;
        }

        // Se o código estiver certo, salva e carrega
        localStorage.setItem('codigoAtivo', code);
        carregarInterface();
    }

    function verificarSessaoSalva() {
        const codigo = localStorage.getItem('codigoAtivo');
        
        if (codigo) {
            if (codigo === "39450") {
                carregarInterface();
            } else {
                // Se tinha uma sessão salva com código velho/errado, apaga ela
                localStorage.removeItem('codigoAtivo');
            }
        }
    }

    function carregarInterface() {
        const overlay = document.getElementById('login-overlay');
        const btnLogin = document.getElementById('btn-login');
        
        if (btnLogin) btnLogin.innerText = "Consultando...";

        // Inicia a busca real na API do OpenRouteService
        buscarRotaNaAPI().then(() => {
            if (overlay) overlay.style.display = 'none'; // Esconde a tela de login
            document.getElementById('info-card').style.display = 'flex'; // Mostra o card de tempo
            iniciarMapa();
        }).catch(err => {
            alert("Erro na API de Rotas. Verifique o console.");
            if (btnLogin) btnLogin.innerText = "Rastrear Carga";
        });
    }

    // ================= BUSCA NA API (OpenRouteService) =================
    async function buscarRotaNaAPI() {
        const ORS_TOKEN = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQzY2QyNmU1ZWNlOTRjZDJhYTBiZDE0NGU5YmFlYzlhIiwiaCI6Im11cm11cjY0In0="; 

        const start = `${ORIGEM[1]},${ORIGEM[0]}`;
        const end = `${DESTINO[1]},${DESTINO[0]}`;
        
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_TOKEN}&start=${start}&end=${end}`;

        console.log("Consultando OpenRouteService...");

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro na API ORS: ${response.status}`);
        }

        const data = await response.json();
        
        fullRoute = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
        console.log("Rota carregada com sucesso! Total de pontos da estrada:", fullRoute.length);
    }

    // ================= MAPA =================
    function iniciarMapa() {
        if (map) return;

        // Centraliza o mapa inicialmente em Curvelo
        map = L.map('map', { zoomControl: false }).setView(CURVELO, 9);

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ).addTo(map);

        // Desenha a rota inteira (BH -> São João da Ponte)
        polyline = L.polyline(fullRoute, {
            color: '#2563eb', 
            weight: 5,
            dashArray: '10,10',
            opacity: 0.8
        }).addTo(map);

        // Ícone customizado do Caminhão Parado (ÍCONE ORIGINAL)
        const truckStatusIcon = L.divIcon({
            className: 'custom-marker',
            html: `
            <div style="text-align:center; width: 140px; margin-left: -70px;">
                <div style="
                    background:#ef4444; /* Vermelho para indicar problema */
                    color:white;
                    font-size:11px;
                    padding:4px 8px;
                    border-radius:6px;
                    margin-bottom:2px;
                    font-weight:bold;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    display: inline-block;
                ">
                ⚠️ VEICULO RETIDO NA PRF
                </div>
                <div style="font-size:32px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));">🚛</div>
            </div>
            `,
            iconSize: [0, 0], // Zera o tamanho base para o offset manual do CSS acima funcionar melhor
            iconAnchor: [0, 30] // Ajuste da âncora
        });

        // Adiciona o caminhão estático em Curvelo
        retainedMarker = L.marker(CURVELO, {
            icon: truckStatusIcon,
            zIndexOffset: 1000
        }).addTo(map);

        atualizarStatus();
    }

    // ================= STATUS ESTÁTICO =================
    function atualizarStatus() {
        // Atualiza o painel de tempo/status para refletir a retenção
        const badge = document.getElementById('time-badge');
        if (badge) {
            badge.innerText = "RETIDO EM CURVELO - MG";
            badge.style.background = "#ef4444"; // Fundo vermelho
            badge.style.color = "white";
        }
    }
});
