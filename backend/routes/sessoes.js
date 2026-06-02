const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/sessoes/ativas
router.get('/ativas', async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id_sessao, 
                c.nome AS cliente, 
                comp.numero_computador AS computador, 
                'PC Gamer' AS descricao_computador, 
                s.inicio_sessao AS inicio, 
                TIMESTAMPDIFF(MINUTE, s.inicio_sessao, NOW()) AS minutos_em_uso, 
                ROUND(GREATEST(TIMESTAMPDIFF(MINUTE, s.inicio_sessao, NOW()) / 60.0, 0.25) * s.valor_hora, 2) AS valor_parcial
            FROM sessoes s
            JOIN clientes c ON s.id_cliente = c.id_cliente
            JOIN computadores comp ON s.id_computador = comp.id_computador
            WHERE LOWER(s.status) = 'aberta'
        `;
        const [ativas] = await db.query(query);
        res.json(ativas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar sessoes ativas.' });
    }
});

// GET /api/sessoes/historico
router.get('/historico', async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id_sessao, 
                c.nome AS cliente, 
                comp.numero_computador AS computador, 
                s.inicio_sessao AS inicio, 
                s.fim_sessao AS fim, 
                ROUND(GREATEST(TIMESTAMPDIFF(MINUTE, s.inicio_sessao, IFNULL(s.fim_sessao, NOW())) / 60.0, 0.25) * s.valor_hora, 2) AS valor_total, 
                LOWER(s.status) AS status
            FROM sessoes s
            JOIN clientes c ON s.id_cliente = c.id_cliente
            JOIN computadores comp ON s.id_computador = comp.id_computador
            ORDER BY s.inicio_sessao DESC 
            LIMIT 50
        `;
        const [historico] = await db.query(query);
        res.json(historico);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar o historico.' });
    }
});

// POST /api/sessoes/abrir
router.post('/abrir', async (req, res) => {
    const { id_cliente, id_computador } = req.body;
    
    if (!id_cliente || !id_computador) {
        return res.status(400).json({ error: 'O cliente e o computador sao obrigatorios.' });
    }

    try {
        // 1. Verifica se cliente já tem sessão aberta
        const [clienteAtivo] = await db.query("SELECT COUNT(*) AS qtd FROM sessoes WHERE id_cliente = ? AND LOWER(status) = 'aberta'", [id_cliente]);
        if (clienteAtivo[0].qtd > 0) {
            return res.status(400).json({ error: 'Operacao negada: O cliente ja possui uma sessao ativa.' });
        }

        // 2. Verifica se PC está disponível driblando o erro de acentuação no banco
        const [pc] = await db.query("SELECT id_computador FROM computadores WHERE id_computador = ? AND status LIKE 'Dispon%'", [id_computador]);
        if (pc.length === 0) {
            return res.status(400).json({ error: 'Este computador nao esta disponivel no momento.' });
        }

        // 3. Pega o próximo número de sessão
        const [maxSessao] = await db.query("SELECT IFNULL(MAX(numero_sessao), 0) + 1 AS prox FROM sessoes");
        const proxNumero = maxSessao[0].prox;

        // 4. Insere a sessão (Tirando acentos no status também)
        await db.query(
            "INSERT INTO sessoes (numero_sessao, id_cliente, id_computador, inicio_sessao, valor_hora, status) VALUES (?, ?, ?, NOW(), 15.00, 'Aberta')",
            [proxNumero, id_cliente, id_computador]
        );

        // 5. Atualiza o PC
        await db.query("UPDATE computadores SET status = 'Em Uso' WHERE id_computador = ?", [id_computador]);

        res.status(201).json({ message: 'Sessao aberta com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno ao tentar abrir a sessao.' });
    }
});

// POST /api/sessoes/fechar/:id
router.post('/fechar/:id', async (req, res) => {
    const idSessao = req.params.id;
    
    try {
        // 1. Busca os dados da sessão
        const [sessao] = await db.query("SELECT id_computador, inicio_sessao, valor_hora FROM sessoes WHERE id_sessao = ? AND LOWER(status) = 'aberta'", [idSessao]);
        
        if (sessao.length === 0) {
            return res.status(400).json({ error: 'Esta sessao ja foi fechada ou nao existe.' });
        }
        
        const idComp = sessao[0].id_computador;

        // 2. Atualiza a sessão
        await db.query("UPDATE sessoes SET fim_sessao = NOW(), status = 'Fechada' WHERE id_sessao = ?", [idSessao]);

        // 3. Libera o PC (Recolocando com a string exata que usamos no cadastro)
        await db.query("UPDATE computadores SET status = 'Disponível' WHERE id_computador = ?", [idComp]);

        // 4. Calcula o valor total para devolver à tela
        const [resultado] = await db.query("SELECT ROUND(GREATEST(TIMESTAMPDIFF(MINUTE, inicio_sessao, NOW()) / 60.0, 0.25) * valor_hora, 2) AS valor_total FROM sessoes WHERE id_sessao = ?", [idSessao]);
        const valorTotal = resultado[0] ? resultado[0].valor_total : 0;

        res.json({ message: 'Sessao encerrada.', valor_total: valorTotal });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno ao fechar a sessao.' });
    }
});

module.exports = router;