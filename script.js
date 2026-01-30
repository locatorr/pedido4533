document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURAÇÃO GLOBAL ---
    const TEMPO_TOTAL_VIAGEM_HORAS = 48; 

    // --- BANCO DE DADOS DE ROTAS ---
    const ROTAS = {
        "567896": { 
            id: "rota_ba",
            destinoNome: "Camamu - BA",
            destinoDesc: "Praça Dr. Pirajá da Silva (Centro)",
            
            start: [-43.8750, -16.7350], // Montes Claros
            end:   [-39.1039, -13.9450], // Camamu
            
            // Mantemos o waypoint anterior apenas para desenhar a linha corretamente
            waypoint: [-39.266224, -14.793617], 
            
            // --- REGRA DE PARADA: UBAITABA ---
            verificarRegras: function(posicaoAtual, map, loopInterval, timeBadge, carMarker) {
                
                // Coordenada exata na BR-101 em Ubaitaba - BA
                const CHECKPOINT_UBAITABA = [-14.313500, -39.324500]; 
                
                // 1. PÁRA O MOVIMENTO
                clearInterval(loopInterval); 
                
                // 2. POSICIONA O CAMINHÃO
                if(carMarker) carMarker.setLatLng(CHECKPOINT_UBAITABA);
                
                // 3. FOCA A CÂMERA (Zoom 15)
                if(map) map.setView(CHECKPOINT_UBAITABA, 15);

                // 4. ATUALIZA O STATUS (Azul Escuro - Parada Logística)
                if(timeBadge) {
                    timeBadge.innerText = "VEÍCULO PARADO";
                    timeBadge.style.backgroundColor = "#1565c0"; 
                    timeBadge.style.color = "white";
                    timeBadge.style.border = "none";
                }

                // 5. PLAQUINHA DE LOCALIZAÇÃO
                const htmlPlaquinha = `
                    <div style="display: flex; align-items: center; gap: 10px; font-family: sans-serif; min-width: 160px;">
                        <div style="font-size: 24px;">🅿️</div>
                        <div style="text-align: left; line-height: 1.2;">
                            <strong style="font-size: 13px; color: #1565c0; display: block;">UBAITABA - BA</strong>
                            <span style="font-size: 11px; color: #333;">Pausa Logística</span><br>
                            <span style="font-size: 10px; color: #666;">BR-101</span>
                        </div>
                    </div>`;

                if(carMarker) {
                    carMarker.bindTooltip(htmlPlaquinha, {
                        permanent: true,
                        direction: 'top',
                        className: 'prf-label', // Reaproveitando a classe de estilo
                        opacity: 1,
                        offset: [0, -20]
                    }).openTooltip();
                }

                return true; // Impede qualquer outro movimento
            }
        }
    };

    // --- VARIÁVEIS DE CONTROLE ---
    let map, polyline, carMarker;
    let fullRoute = []; 
    let rotaAtual = null;
    let loopInterval = null;

    // --- INICIALIZAÇÃO ---
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', verificarCodigo);
    }

    verificarSessaoSalva();

    // --- FUNÇÕES ---

    function verificarCodigo() {
        const input = document.getElementById('access-code');
        const codigoDigitado = input.value;
        const errorMsg = document.getElementById('error-msg');

        if (ROTAS[codigoDigitado]) {
            localStorage.setItem('codigoAtivo', codigoDigitado);
            carregarInterface(codigoDigitado);
        } else {
            if(errorMsg) errorMsg.style.display = 'block';
            input.style.borderColor = 'red';
        }
    }

    function verificarSessaoSalva() {
        const codigoSalvo = localStorage.getItem('codigoAtivo');
        const overlay = document.getElementById('login-overlay');
        if (codigoSalvo && ROTAS[codigoSalvo] && overlay && overlay.style.display !== 'none') {
            document.getElementById('access-code').value = codigoSalvo;
        }
    }

    function carregarInterface(codigo) {
        rotaAtual = ROTAS[codigo];
        const overlay = document.getElementById('login-overlay');
        const infoCard = document.getElementById('info-card');
        const btn = document.getElementById('btn-login');

        if(btn) {
            btn.innerText = "Localizando veículo...";
            btn.disabled = true;
        }

        buscarRotaReal(rotaAtual.start, rotaAtual.end, rotaAtual.waypoint).then(() => {
            if(overlay) overlay.style.display = 'none';
            if(infoCard) infoCard.style.display = 'flex';
            atualizarTextoInfo();
            iniciarMapa();
        }).catch(err => {
            console.error(err);
            alert("Erro de conexão com satélite de rota.");
            if(btn) {
                btn.innerText = "Tentar Novamente";
                btn.disabled = false;
            }
        });
    }

    function atualizarTextoInfo() {
        const infoTextDiv = document.querySelector('.info-text');
        if(infoTextDiv && rotaAtual) {
            infoTextDiv.innerHTML = `
                <h3>Rastreamento Rodoviário</h3>
                <span id="time-badge" class="status-badge">CONECTANDO...</span>
                <p><strong>Origem:</strong> Montes Claros - MG</p>
                <p><strong>Destino:</strong> ${rotaAtual.destinoNome}</p>
            `;
        }
    }

    async function buscarRotaReal(start, end, waypoint) {
        let coordsUrl = `${start[0]},${start[1]};${end[0]},${end[1]}`;
        
        if (waypoint) {
            coordsUrl = `${start[0]},${start[1]};${waypoint[0]},${waypoint[1]};${end[0]},${end[1]}`;
        }

        const url = `https://router.project-osrm.org/route/v1/driving/${coordsUrl}?overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            fullRoute = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        } else {
            throw new Error("Rota não encontrada");
        }
    }

    function iniciarMapa() {
        if (map) return; 

        map = L.map('map', { zoomControl: false }).setView(fullRoute[0], 6);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB', maxZoom: 18
        }).addTo(map);

        // Linha pontilhada (estilo rota planejada)
        polyline = L.polyline(fullRoute, {
            color: '#2c3e50', weight: 5, opacity: 0.6, dashArray: '10, 10', lineJoin: 'round'
        }).addTo(map);

        const truckIcon = L.divIcon({
            className: 'car-marker',
            html: '<div class="car-icon" style="font-size:35px;">🚛</div>',
            iconSize: [40, 40], iconAnchor: [20, 20]
        });

        carMarker = L.marker(fullRoute[0], { icon: truckIcon }).addTo(map);
        L.marker(fullRoute[fullRoute.length - 1]).addTo(map).bindPopup(`<b>Destino:</b> ${rotaAtual.destinoNome}`);

        if (loopInterval) clearInterval(loopInterval);
        loopInterval = setInterval(atualizarPosicaoTempoReal, 1000);
        
        // Executa imediatamente para aplicar a parada
        atualizarPosicaoTempoReal(); 
    }

    function atualizarPosicaoTempoReal() {
        if (fullRoute.length === 0 || !rotaAtual) return;

        const timeBadge = document.getElementById('time-badge');

        if (rotaAtual.verificarRegras) {
            // Passamos [0,0] pois a função força a posição correta de Ubaitaba
            const parou = rotaAtual.verificarRegras([0,0], map, loopInterval, timeBadge, carMarker);
            if (parou) return; 
        }
    }
});
