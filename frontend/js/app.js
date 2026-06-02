const API = 'http://localhost:3000/api';

// ????????????????????????????????????????????????????????????????????????????
//  UTILITÁRIOS
// ????????????????????????????????????????????????????????????????????????????

const $ = id => document.getElementById(id);

function moeda(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataHora(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('pt-BR');
}

async function get(path) {
    const r = await fetch(API + path);
    return r.json();
}

async function post(path, body) {
    const r = await fetch(API + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return r.json();
}

function alerta(elId, texto, tipo = 'success') {
    $(elId).innerHTML = `
        <div class="alert alert-${tipo} mt-2">
            ${texto}
        </div>
    `;
    setTimeout(() => $(elId).innerHTML = '', 4500);
}

// ????????????????????????????????????????????????????????????????????????????
//  NAVEGAÇÃO ENTRE ABAS
// ????????????????????????????????????????????????????????????????????????????

const tabCarregadores = {
    dashboard:    carregarDashboard,
    computadores: carregarComputadores,
    clientes:     carregarClientes,
    produtos:     carregarProdutos,
    caixa:        carregarCaixa,
};

// Navegação Principal
document.querySelectorAll('#abas .nav-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('#abas .nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('d-none'));
        const tab = link.dataset.tab;
        $('tab-' + tab).classList.remove('d-none');
        
        if(tabCarregadores[tab]) tabCarregadores[tab]();
    });
});

// Sub-abas de Clientes
document.querySelectorAll('#tabs-clientes .nav-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('#tabs-clientes .nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const sub = link.dataset.subtab;
        $('lista-clientes-content').classList.add('d-none');
        $('ranking-clientes-content').classList.add('d-none');
        $(sub + '-content').classList.remove('d-none');
        
        if (sub === 'ranking-clientes') carregarRankingClientes();
    });
});

// Sub-abas de Computadores (Mapa, Gestao e Historico)
document.querySelectorAll('#tabs-acoes-computadores .nav-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('#tabs-acoes-computadores .nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const sub = link.dataset.subform;
        $('form-mapa').classList.add('d-none');
        $('form-gestao-pc').classList.add('d-none');
        $('form-historico').classList.add('d-none');
        $('form-' + sub).classList.remove('d-none');
        
        if (sub === 'historico') carregarHistorico();
    });
});

// Sub-abas de Produtos
document.querySelectorAll('#tabs-acoes-produtos .nav-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('#tabs-acoes-produtos .nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const sub = link.dataset.subform;
        $('form-venda').classList.add('d-none');
        $('form-produto').classList.add('d-none');
        $('form-' + sub).classList.remove('d-none');
    });
});

function navegarParaAba(tabId) {
    const link = document.querySelector(`#abas .nav-link[data-tab="${tabId}"]`);
    if (link) link.click(); 
}

// ????????????????????????????????????????????????????????????????????????????
//  RELÓGIO E CRONÔMETROS
// ????????????????????????????????????????????????????????????????????????????

function atualizarTempos() {
    document.querySelectorAll('.tempo-uso').forEach(el => {
        const inicioStr = el.dataset.inicio;
        if (!inicioStr) return;
        
        const inicio = new Date(inicioStr);
        const agora = new Date();
        const diffMs = agora - inicio;
        
        if (diffMs < 0) return;
        
        const diffMins = Math.floor(diffMs / 60000);
        const horas = Math.floor(diffMins / 60);
        const minutos = diffMins % 60;
        
        el.textContent = horas > 0 ? `${horas}h ${minutos}m` : `${minutos} min`;
    });
}

function atualizarRelogio() {
    $('relogio').textContent = new Date().toLocaleString('pt-BR');
    atualizarTempos(); 
}
setInterval(atualizarRelogio, 1000);
atualizarRelogio();

// ????????????????????????????????????????????????????????????????????????????
//  DASHBOARD
// ????????????????????????????????????????????????????????????????????????????

async function carregarDashboard() {
    const [computadores, ativas, lancamentos] = await Promise.all([
        get('/computadores'),
        get('/sessoes/ativas'),
        get('/caixa')
    ]);

    $('kpi-disponiveis').textContent = computadores.filter(c => c.status === 'disponivel').length;
    $('kpi-ocupados').textContent    = computadores.filter(c => c.status === 'ocupado').length;
    $('kpi-manutencao').textContent  = computadores.filter(c => c.status === 'manutencao').length;

    const receitaTotal = lancamentos.reduce((s, l) => s + Number(l.valor || 0), 0);
    $('kpi-receita').textContent = moeda(receitaTotal);

    $('tabela-ativas-container').innerHTML = tabelaSessoesAtivas(ativas);
}

function tabelaSessoesAtivas(ativas) {
    if (!ativas.length) {
        return '<p class="text-muted">Nenhuma sessao ativa no momento.</p>';
    }
    
    const linhas = ativas.map(s => `
        <tr>
            <td>${s.id_sessao}</td>
            <td>${s.cliente}</td>
            <td>PC ${s.computador}</td>
            <td>${dataHora(s.inicio)}</td>
            <td>${s.minutos_em_uso} min</td>
            <td>${moeda(s.valor_parcial)}</td>
        </tr>
    `).join('');
        
    return `
        <table class="table table-hover table-bordered">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>PC</th>
                    <th>Inicio</th>
                    <th>Duracao</th>
                    <th>Parcial</th>
                </tr>
            </thead>
            <tbody>
                ${linhas}
            </tbody>
        </table>
    `;
}

// ????????????????????????????????????????????????????????????????????????????
//  COMPUTADORES (MAPA, GESTÃO E HISTÓRICO)
// ????????????????????????????????????????????????????????????????????????????

let pcEditandoId = null;

async function carregarComputadores() {
    const [computadores, ativas] = await Promise.all([
        get('/computadores'),
        get('/sessoes/ativas')
    ]);
    
    // 1. DESENHA O MAPA
    $('computadores-grid').innerHTML = computadores.map(c => {
        const sessao = ativas.find(s => s.computador == c.numero);
        let infoBadge = '';
        let btnManutencao = ''; 
        
        if (c.status.toLowerCase() === 'disponivel') {
            btnManutencao = `
                <button class="btn btn-sm btn-light bg-opacity-50 border-0 ms-2 px-2" onclick="event.stopPropagation(); alternarManutencao(${c.id_computador}, 'manutencao')" title="Colocar em Manutencao">
                    <i class="bi bi-tools"></i>
                </button>
            `;
        } else if (c.status.toLowerCase() === 'manutencao') {
            btnManutencao = `
                <button class="btn btn-sm btn-light bg-opacity-75 border-0 ms-2 px-2 text-success" onclick="event.stopPropagation(); alternarManutencao(${c.id_computador}, 'disponivel')" title="Liberar PC">
                    <i class="bi bi-check-circle-fill"></i>
                </button>
            `;
        }
        
        if (c.status.toLowerCase() === 'ocupado' && sessao) {
            infoBadge = `
                <div class="mt-2 p-2 bg-dark bg-opacity-25 rounded text-start">
                    <div class="small fw-bold text-truncate" title="${sessao.cliente}">
                        <i class="bi bi-person-fill"></i> ${sessao.cliente}
                    </div>
                    <div class="small fw-semibold mt-1">
                        <i class="bi bi-clock"></i> <span class="tempo-uso text-warning" data-inicio="${sessao.inicio}"></span>
                    </div>
                </div>
            `;
        } else {
            infoBadge = `
                <span class="badge bg-dark bg-opacity-25 mt-2 text-capitalize d-block py-2">
                    ${c.status}
                </span>
            `;
        }

        return `
        <div class="col-md-4 col-lg-3">
            <div class="pc-card ${c.status}" style="cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="cliqueNoComputador(${c.id_computador}, ${c.numero}, '${c.status}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="numero">PC ${c.numero}</div>
                    <div class="d-flex align-items-center">
                        <div class="fw-bold fs-6">${moeda(c.valor_hora)}/h</div>
                        ${btnManutencao}
                    </div>
                </div>
                <div class="opacity-75 small mt-2 fst-italic" style="font-size: 0.80rem;">
                    <i class="bi bi-cpu"></i> ${c.descricao || 'Padrao'}
                </div>
                ${infoBadge}
            </div>
        </div>
        `;
    }).join('');
    
    atualizarTempos();
    
    // 2. DESENHA A TABELA DE GESTAO
    const linhasTabela = computadores.map(c => {
        let badgeStatus = '';
        if (c.status === 'disponivel') badgeStatus = 'bg-success';
        else if (c.status === 'ocupado') badgeStatus = 'bg-danger';
        else badgeStatus = 'bg-warning text-dark';

        return `
            <tr>
                <td>PC ${c.numero}</td>
                <td>${c.descricao || 'Padrao'}</td>
                <td>
                    <span class="badge ${badgeStatus} text-capitalize">
                        ${c.status}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-primary me-1" onclick="prepararEdicaoPC(${c.id_computador}, ${c.numero}, '${c.descricao}')" title="Editar PC">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="excluirComputador(${c.id_computador})" title="Apagar PC">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
        
    $('tabela-pcs-container').innerHTML = `
        <table class="table table-hover table-bordered align-middle">
            <thead>
                <tr>
                    <th>Maquina</th>
                    <th>Configuracao</th>
                    <th>Status Atual</th>
                    <th class="text-center" style="width: 100px;">Acoes</th>
                </tr>
            </thead>
            <tbody>
                ${linhasTabela}
            </tbody>
        </table>
    `;
    
    // 3. ATUALIZA HISTÓRICO SE A ABA ESTIVER ABERTA
    if (!$('form-historico').classList.contains('d-none')) {
        carregarHistorico();
    }
}

// Ações de Cadastro de Computadores
function prepararEdicaoPC(id, numero, config) {
    $('inp-num-pc').value = numero;
    $('inp-config-pc').value = config !== 'undefined' && config !== 'null' ? config : '';
    pcEditandoId = id;
    
    $('titulo-form-pc').innerHTML = '<i class="bi bi-pencil-square me-1"></i>Editar Computador';
    const btnSalvar = $('btn-salvar-pc');
    btnSalvar.innerHTML = '<i class="bi bi-save me-1"></i>Salvar Alteracoes';
    btnSalvar.classList.replace('btn-success', 'btn-warning');
}

async function cadastrarComputador() {
    const numero = Number($('inp-num-pc').value);
    const configuracao = $('inp-config-pc').value.trim();
    
    if (!numero || numero <= 0) return alerta('msg-pc', 'Preencha um numero valido para o PC.', 'warning');
    
    let r;
    if (pcEditandoId) {
        r = await fetch(`${API}/computadores/${pcEditandoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero, configuracao })
        }).then(res => res.json());
    } else {
        r = await post('/computadores', { numero, configuracao });
    }
    
    if (r.error) return alerta('msg-pc', r.error, 'danger');
    
    alerta('msg-pc', r.message);
    $('inp-num-pc').value = '';
    $('inp-config-pc').value = '';
    pcEditandoId = null;
    
    $('titulo-form-pc').innerHTML = '<i class="bi bi-pc-display me-1"></i>Novo Computador';
    const btnSalvar = $('btn-salvar-pc');
    btnSalvar.innerHTML = '<i class="bi bi-save me-1"></i>Salvar PC';
    btnSalvar.classList.replace('btn-warning', 'btn-success');
    
    carregarComputadores();
}

async function excluirComputador(id) {
    if (!confirm('Tem certeza que deseja remover este PC da Arena?')) return;
    try {
        const response = await fetch(`${API}/computadores/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) alerta('msg-pc', data.error || 'Nao foi possivel excluir o PC.', 'warning');
        else { alerta('msg-pc', data.message, 'success'); carregarComputadores(); }
    } catch (error) { alerta('msg-pc', 'Erro ao conectar ao servidor.', 'danger'); }
}

async function alternarManutencao(id_computador, novoStatus) {
    const msg = novoStatus === 'manutencao' ? 'Deseja colocar este PC em MANUTENCAO?' : 'Deseja liberar este PC para uso?';
    if (!confirm(msg)) return;
    
    try {
        const r = await fetch(`${API}/computadores/${id_computador}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        }).then(res => res.json());
        
        if (r.error) alert(r.error);
        else { carregarComputadores(); carregarDashboard(); }
    } catch (error) { alert('Erro de conexao com o servidor.'); }
}

// Ações do Mapa Interativo
async function cliqueNoComputador(id_computador, numero, status) {
    if (status === 'disponivel') {
        $('modal-pc-num-abrir').textContent = numero;
        $('modal-pc-id-abrir').value = id_computador;
        
        const clientes = await get('/clientes');
        $('modal-sel-cliente').innerHTML = '<option value="">Selecione o Cliente...</option>' + 
            clientes.map(c => `<option value="${c.id_cliente}">${c.nome}</option>`).join('');
            
        new bootstrap.Modal($('modalAbrirSessao')).show();
        
    } else if (status === 'ocupado') {
        $('modal-pc-num-fechar').textContent = numero;
        
        const ativas = await get('/sessoes/ativas');
        const sessaoDoPc = ativas.find(s => s.computador == numero);
        
        if (sessaoDoPc) {
            $('modal-sessao-id-fechar').value = sessaoDoPc.id_sessao;
            $('modal-cliente-fechar').textContent = sessaoDoPc.cliente;
            $('modal-tempo-fechar').textContent = sessaoDoPc.minutos_em_uso;
            $('modal-valor-fechar').textContent = moeda(sessaoDoPc.valor_parcial);
            
            new bootstrap.Modal($('modalFecharSessao')).show();
        } else { 
            alert('ERRO DE INCONSISTENCIA. Atualize o banco de dados.'); 
        }
    } else { 
        alert('Computador em manutencao. Libere o PC clicando no botao verde no card.'); 
    }
}

async function confirmarAbrirSessaoRapida() {
    const id_cliente = $('modal-sel-cliente').value;
    const id_computador = $('modal-pc-id-abrir').value;
    
    if (!id_cliente) return alerta('msg-modal-abrir', 'Selecione um cliente.', 'warning');
    
    const r = await post('/sessoes/abrir', { id_cliente, id_computador });
    if (r.error) {
        alerta('msg-modal-abrir', r.error, 'danger');
    } else { 
        bootstrap.Modal.getInstance($('modalAbrirSessao')).hide(); 
        carregarComputadores(); 
        carregarDashboard(); 
    }
}

async function confirmarFecharSessaoRapida() {
    const id_sessao = $('modal-sessao-id-fechar').value;
    const r = await post(`/sessoes/fechar/${id_sessao}`, {});
    
    if (r.error) {
        alerta('msg-modal-fechar', r.error, 'danger');
    } else {
        alert(`Sessao Encerrada com Sucesso!\n\nTotal Cobrado: ${moeda(r.valor_total)}`);
        bootstrap.Modal.getInstance($('modalFecharSessao')).hide();
        carregarComputadores(); 
        carregarDashboard(); 
        carregarCaixa();
    }
}

// ????????????????????????????????????????????????????????????????????????????
//  HISTÓRICO DE SESSÕES (A nova função dedicada)
// ????????????????????????????????????????????????????????????????????????????

async function carregarHistorico() {
    const historico = await get('/sessoes/historico');
    $('historico-container').innerHTML = tabelaHistorico(historico);
}

function tabelaHistorico(historico) {
    if (!historico.length) {
        return '<p class="text-muted">Sem historico de sessoes.</p>';
    }
    
    const linhas = historico.map(s => `
        <tr>
            <td>${s.id_sessao}</td>
            <td>${s.cliente}</td>
            <td>PC ${s.computador}</td>
            <td>${dataHora(s.inicio)}</td>
            <td>${dataHora(s.fim)}</td>
            <td>${moeda(s.valor_total)}</td>
            <td>
                <span class="badge ${s.status === 'aberta' ? 'bg-success' : 'bg-secondary'}">
                    ${s.status}
                </span>
            </td>
        </tr>
    `).join('');
        
    return `
        <table class="table table-sm table-bordered">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>PC</th>
                    <th>Inicio</th>
                    <th>Fim</th>
                    <th>Valor</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${linhas}
            </tbody>
        </table>
    `;
}

// ????????????????????????????????????????????????????????????????????????????
//  CLIENTES (CRUD E MASCARAS)
// ????????????????????????????????????????????????????????????????????????????

let clienteEditandoId = null;

function formatarCPF(v) {
    if (!v) return '';
    v = String(v).replace(/\D/g, ""); 
    if (v.length > 11) v = v.substring(0, 11); 
    
    if (v.length > 3) v = v.replace(/^(\d{3})(\d)/, "$1.$2");
    if (v.length > 6) v = v.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
    if (v.length > 9) v = v.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
    return v;
}

function formatarTelefone(v) {
    if (!v) return '';
    v = String(v).replace(/\D/g, ""); 
    if (v.length > 11) v = v.substring(0, 11); 
    
    if (v.length <= 10) { 
        v = v.replace(/(\d{2})(\d)/, "($1) $2"); 
        v = v.replace(/(\d{4})(\d)/, "$1-$2"); 
    } else { 
        v = v.replace(/(\d{2})(\d)/, "($1) $2"); 
        v = v.replace(/(\d{5})(\d)/, "$1-$2"); 
    }
    return v;
}

const campoCpf = $('inp-cpf-cliente');
if(campoCpf) campoCpf.addEventListener('input', e => e.target.value = formatarCPF(e.target.value));

const campoTel = $('inp-tel-cliente');
if(campoTel) campoTel.addEventListener('input', e => e.target.value = formatarTelefone(e.target.value));

async function carregarClientes() {
    const clientes = await get('/clientes');
    
    const linhas = clientes.map(c => `
        <tr>
            <td>${c.id_cliente}</td>
            <td>${c.nome}</td>
            <td>${formatarCPF(c.cpf)}</td>
            <td>${formatarTelefone(c.telefone) || '?'}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-primary me-1" onclick="prepararEdicao(${c.id_cliente}, '${c.nome}', '${c.cpf}', '${c.telefone}')" title="Editar Cliente">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="excluirCliente(${c.id_cliente})" title="Excluir Cliente">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
        
    $('lista-clientes-content').innerHTML = `
        <table class="table table-hover table-bordered align-middle">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>Telefone</th>
                    <th class="text-center" style="width: 100px;">Acoes</th>
                </tr>
            </thead>
            <tbody>
                ${linhas}
            </tbody>
        </table>
    `;
}

function prepararEdicao(id, nome, cpf, telefone) {
    $('inp-nome-cliente').value = nome; 
    $('inp-cpf-cliente').value = formatarCPF(cpf); 
    $('inp-tel-cliente').value = formatarTelefone(telefone !== 'undefined' && telefone !== 'null' ? telefone : '');
    
    clienteEditandoId = id;
    
    const cardHeader = document.querySelector('#tab-clientes .card-header'); 
    const btnSalvar = document.querySelector('#tab-clientes .btn-primary');
    
    if(cardHeader) cardHeader.innerHTML = '<i class="bi bi-pencil-square me-1"></i>Editar Cliente';
    if(btnSalvar) { 
        btnSalvar.innerHTML = '<i class="bi bi-save me-1"></i>Salvar Alteracoes'; 
        btnSalvar.classList.replace('btn-primary', 'btn-warning'); 
    }
}

async function excluirCliente(id) {
    if (!confirm('Tem certeza que deseja apagar este cliente?')) return;
    try {
        const response = await fetch(`${API}/clientes/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) alerta('msg-cliente', data.error || 'Erro ao excluir.', 'warning');
        else { alerta('msg-cliente', data.message, 'success'); carregarClientes(); }
    } catch (error) { alerta('msg-cliente', 'Erro ao conectar ao servidor.', 'danger'); }
}

async function carregarRankingClientes() {
    const ranking = await get('/clientes/ranking');
    const linhas = ranking.map((c, i) => `
        <tr>
            <td><strong>${i + 1}o</strong></td>
            <td>${c.nome}</td>
            <td>${c.total_sessoes}</td>
            <td>${moeda(c.total_gasto)}</td>
            <td>${moeda(c.gasto_medio)}</td>
        </tr>
    `).join('');
        
    $('ranking-clientes-content').innerHTML = `
        <table class="table table-hover table-bordered">
            <thead>
                <tr>
                    <th>Pos.</th>
                    <th>Cliente</th>
                    <th>Sessoes</th>
                    <th>Total Gasto</th>
                    <th>Gasto Medio</th>
                </tr>
            </thead>
            <tbody>
                ${linhas}
            </tbody>
        </table>
    `;
}

async function cadastrarCliente() {
    const nome = $('inp-nome-cliente').value.trim(); 
    const cpf = $('inp-cpf-cliente').value.trim(); 
    const telefone = $('inp-tel-cliente').value.trim();
    
    if (cpf.length > 0 && cpf.length < 14) return alerta('msg-cliente', 'Preencha o CPF completo.', 'warning');
    
    let r;
    if (clienteEditandoId) {
        r = await fetch(`${API}/clientes/${clienteEditandoId}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ nome, cpf, telefone }) 
        }).then(res => res.json());
    } else {
        r = await post('/clientes', { nome, cpf, telefone });
    }
    
    if (r.error) return alerta('msg-cliente', r.error, 'danger');
    
    alerta('msg-cliente', r.message);
    ['inp-nome-cliente','inp-cpf-cliente','inp-tel-cliente'].forEach(id => $(id).value = '');
    clienteEditandoId = null;
    
    const cardHeader = document.querySelector('#tab-clientes .card-header'); 
    const btnSalvar = document.querySelector('#tab-clientes .btn-warning');
    if(cardHeader) cardHeader.innerHTML = '<i class="bi bi-person-plus me-1"></i>Novo Cliente';
    if(btnSalvar) { 
        btnSalvar.innerHTML = '<i class="bi bi-person-check me-1"></i>Cadastrar'; 
        btnSalvar.classList.replace('btn-warning', 'btn-primary'); 
    }
    carregarClientes();
}

// ????????????????????????????????????????????????????????????????????????????
//  PRODUTOS (VENDAS E GERENCIAMENTO)
// ????????????????????????????????????????????????????????????????????????????

let produtoEditandoId = null;

async function carregarProdutos() {
    const [produtos, clientes] = await Promise.all([get('/produtos'), get('/clientes')]);

    $('sel-cliente-venda').innerHTML = '<option value="">Selecione o Cliente...</option>' + 
        clientes.map(c => `<option value="${c.id_cliente}">${c.nome}</option>`).join('');

    $('sel-produto-venda').innerHTML = produtos.map(p => `
        <option value="${p.id_produto}">${p.nome} - ${moeda(p.preco)} (estoque: ${p.estoque})</option>
    `).join('');

    const linhas = produtos.map(p => `
        <tr>
            <td>${p.id_produto}</td>
            <td>${p.nome}</td>
            <td>${moeda(p.preco)}</td>
            <td>
                <span class="badge ${p.estoque > 10 ? 'bg-success' : p.estoque > 0 ? 'bg-warning text-dark' : 'bg-danger'}">
                    ${p.estoque}
                </span>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-primary me-1" onclick="prepararEdicaoProduto(${p.id_produto}, '${p.nome}', ${p.preco}, ${p.estoque})" title="Editar Produto">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="excluirProduto(${p.id_produto})" title="Apagar Produto">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
        
    $('produtos-container').innerHTML = `
        <table class="table table-hover table-bordered align-middle">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Produto</th>
                    <th>Preco</th>
                    <th>Estoque</th>
                    <th class="text-center" style="width: 100px;">Acoes</th>
                </tr>
            </thead>
            <tbody>${linhas}</tbody>
        </table>
    `;
}

function prepararEdicaoProduto(id, nome, preco, estoque) {
    $('inp-nome-produto').value = nome;
    $('inp-preco-produto').value = preco;
    $('inp-estoque-produto').value = estoque;
    produtoEditandoId = id;
    
    $('titulo-form-produto').innerHTML = '<i class="bi bi-pencil-square me-1"></i>Editar Produto';
    const btnSalvar = $('btn-salvar-produto');
    btnSalvar.innerHTML = '<i class="bi bi-save me-1"></i>Salvar Alteracoes';
    btnSalvar.classList.replace('btn-success', 'btn-warning');

    const linkProd = document.querySelector('#tabs-acoes-produtos .nav-link[data-subform="produto"]');
    if(linkProd) linkProd.click();
}

async function cadastrarProduto() {
    const nome = $('inp-nome-produto').value.trim();
    const preco = Number($('inp-preco-produto').value);
    const estoque = Number($('inp-estoque-produto').value);
    
    if (!nome || isNaN(preco)) return alerta('msg-produto', 'Preencha o nome e o preco do produto.', 'warning');
    
    let r;
    if (produtoEditandoId) {
        r = await fetch(`${API}/produtos/${produtoEditandoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, preco, estoque })
        }).then(res => res.json());
    } else {
        r = await post('/produtos', { nome, preco, estoque });
    }
    
    if (r.error) return alerta('msg-produto', r.error, 'danger');
    
    alerta('msg-produto', r.message);
    $('inp-nome-produto').value = ''; $('inp-preco-produto').value = ''; $('inp-estoque-produto').value = '';
    produtoEditandoId = null;
    
    $('titulo-form-produto').innerHTML = '<i class="bi bi-box-seam me-1"></i>Novo Produto';
    const btnSalvar = $('btn-salvar-produto');
    btnSalvar.innerHTML = '<i class="bi bi-save me-1"></i>Cadastrar Produto';
    btnSalvar.classList.replace('btn-warning', 'btn-success');
    
    carregarProdutos();
}

async function excluirProduto(id) {
    if (!confirm('Tem certeza que deseja apagar este produto?')) return;
    try {
        const response = await fetch(`${API}/produtos/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) alerta('msg-produto', data.error || 'Nao foi possivel excluir o produto.', 'warning');
        else { alerta('msg-produto', data.message, 'success'); carregarProdutos(); }
    } catch (error) { alerta('msg-produto', 'Erro ao conectar ao servidor.', 'danger'); }
}

async function registrarVenda() {
    const id_cliente = $('sel-cliente-venda').value;
    const id_produto = $('sel-produto-venda').value;
    const quantidade = Number($('inp-qtd-venda').value);
    
    if (!id_cliente) return alerta('msg-venda', 'Selecione um cliente para registrar a venda.', 'warning');
    if (quantidade <= 0) return alerta('msg-venda', 'A quantidade deve ser maior que zero.', 'warning');

    const r = await post('/caixa/consumo', { id_cliente, id_produto, quantidade });
    if (r.error) alerta('msg-venda', r.error, 'danger');
    else { alerta('msg-venda', r.message); carregarProdutos(); }
}

// ????????????????????????????????????????????????????????????????????????????
//  CAIXA
// ????????????????????????????????????????????????????????????????????????????

async function carregarCaixa() {
    const [resumo, lancamentos] = await Promise.all([
        get('/caixa/resumo'),
        get('/caixa')
    ]);

    let totalSessoes = 0;
    let totalConsumo = 0;

    lancamentos.forEach(l => {
        const valor = Number(l.valor || 0);
        if (l.tipo.toLowerCase().includes('sess')) totalSessoes += valor;
        else totalConsumo += valor;
    });

    $('caixa-entradas').textContent = moeda(totalSessoes + totalConsumo);
    $('caixa-saidas').textContent   = moeda(totalConsumo); 
    $('caixa-saldo').textContent    = moeda(totalSessoes); 
    
    const linhas = lancamentos.map(l => {
        const badgeClass = l.tipo.toLowerCase().includes('sess') ? 'bg-primary' : 'bg-warning text-dark';
        return `
            <tr>
                <td>${l.id || '-'}</td>
                <td class="fw-bold">${l.cliente}</td>
                <td><span class="badge ${badgeClass}">${l.tipo}</span></td>
                <td>${moeda(l.valor)}</td>
                <td>${l.descricao}</td>
                <td>${dataHora(l.data_hora)}</td>
            </tr>
        `;
    }).join('');

    $('caixa-container').innerHTML = `
        <table class="table table-sm table-bordered">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Descricao</th>
                    <th>Data/Hora</th>
                </tr>
            </thead>
            <tbody>${linhas}</tbody>
        </table>
    `;
}

// Inicializa a aplicação
carregarDashboard();